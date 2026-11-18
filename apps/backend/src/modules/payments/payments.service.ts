import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { hashRequest } from '../../common/idempotency';
import { PrismaService } from '../../prisma/prisma.service';
import { assertTransition, canTransition } from '../orders/order-state';
import { pointsForTotal } from '../vouchers/voucher-pricing';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ChargeResult, MockPaymentGateway } from './mock-payment.gateway';

/** A PROCESSING row older than this belongs to a request that died mid-charge. It is reaped (marked FAILED). */
export const PROCESSING_TIMEOUT_MS = 2 * 60 * 1000;

/** Order status after a payment attempt. */
export function statusAfterPayment(success: boolean): 'PAID' | 'PAYMENT_FAILED' {
  return success ? 'PAID' : 'PAYMENT_FAILED';
}

/** The partial unique index allows one PROCESSING row per order; a violation means another attempt is in flight. */
function mapWriteError(err: unknown): unknown {
  if ((err as { code?: string })?.code !== 'P2002') return err;
  return new ConflictException('Order already has a payment in progress');
}

/** Card number is never part of the fingerprint; only its last 4 digits are. */
export function paymentRequestHash(dto: CreatePaymentDto): string {
  return hashRequest({
    orderId: dto.orderId,
    method: dto.method,
    cardLast4: dto.method === 'CARD' ? (dto.cardNumber?.slice(-4) ?? null) : null,
  });
}

export interface PaymentResponse {
  id: string;
  status: string;
  amount: number;
  method: string;
  createdAt: Date;
}

export interface PaymentResult {
  payment: PaymentResponse;
  order: { id: string; status: string };
}

export interface PayOutcome {
  result: PaymentResult;
  /** True when the Idempotency-Key was already used and the stored result was returned without charging. */
  replayed: boolean;
}

const PAYMENT_SELECT = { id: true, status: true, amount: true, method: true, createdAt: true } as const;

/** Payment row plus the owner and current status of its order, used for replay decisions. */
const PAYMENT_WITH_ORDER = {
  order: { select: { userId: true, status: true } },
} satisfies Prisma.PaymentInclude;

type PaymentWithOrder = Prisma.PaymentGetPayload<{ include: typeof PAYMENT_WITH_ORDER }>;

function toPaymentResponse(row: PaymentWithOrder): PaymentResponse {
  return {
    id: row.id,
    status: row.status,
    amount: row.amount,
    method: row.method,
    createdAt: row.createdAt,
  };
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: MockPaymentGateway,
  ) {}

  async pay(dto: CreatePaymentDto, userId: string, idempotencyKey: string): Promise<PayOutcome> {
    const requestHash = paymentRequestHash(dto);

    // A known key never reaches the charge path again: it is answered from the stored payment.
    const existing = await this.findByKey(idempotencyKey);
    if (existing) {
      return this.replay(existing, dto, userId, requestHash);
    }

    const order = await this.prisma.order.findFirst({ where: { id: dto.orderId, userId } });
    if (!order) {
      throw new NotFoundException(`Order ${dto.orderId} not found`);
    }
    if (!canTransition(order.status, 'PAID')) {
      throw new ConflictException(`Order cannot be paid in status ${order.status}`);
    }
    if (dto.method === 'CARD' && !dto.cardNumber) {
      throw new BadRequestException('cardNumber is required for CARD payments');
    }

    // Amount is always the server-side order total, never a client value.
    const amount = order.total;

    // Step 1: version claim and in-flight marker in one transaction. The partial
    // unique index rejects a concurrent second PROCESSING row before any charge.
    let processingId: string;
    try {
      processingId = await this.prisma.$transaction(async (tx) => {
        await this.reapStaleProcessing(tx, order.id);

        const data: { version: { increment: number }; status?: OrderStatus } = {
          version: { increment: 1 },
        };
        if (order.status === 'PAYMENT_FAILED') {
          // A new attempt starts from PENDING, the state the charge is settled from.
          assertTransition(order.status, 'PENDING');
          data.status = 'PENDING';
        }
        const claim = await tx.order.updateMany({
          where: { id: order.id, userId, status: order.status, version: order.version },
          data,
        });
        if (claim.count === 0) {
          throw new ConflictException('Order is already being paid or paid');
        }
        const row = await tx.payment.create({
          data: {
            orderId: order.id,
            idempotencyKey,
            requestHash,
            amount,
            method: dto.method,
            status: 'PROCESSING',
          },
          select: { id: true },
        });
        return row.id;
      });
    } catch (err) {
      // A concurrent request with the same key may have won the race: answer from its row.
      const raced = await this.findByKey(idempotencyKey);
      if (raced) {
        return this.replay(raced, dto, userId, requestHash);
      }
      throw mapWriteError(err);
    }

    // Step 2: charge. On an unexpected gateway error, release the marker so the
    // order stays retryable.
    let charge: ChargeResult;
    try {
      charge = await this.gateway.charge({
        amount,
        method: dto.method,
        cardNumber: dto.method === 'CARD' ? dto.cardNumber : undefined,
      });
    } catch (err) {
      await this.releaseProcessing(processingId, 'Payment gateway error');
      throw err;
    }

    // Step 3: settle the payment row and move the order (PENDING was set by the claim) in one transaction.
    const success = charge.success;
    const nextStatus = statusAfterPayment(success);
    assertTransition('PENDING', nextStatus);
    let payment: PaymentResponse;
    try {
      payment = await this.prisma.$transaction(async (tx) => {
        // Points are granted only by the PENDING -> PAID move, so a retry cannot add them twice.
        const pointsEarned = success ? pointsForTotal(order.total) : 0;
        const moved = await tx.order.updateMany({
          where: { id: order.id, status: 'PENDING' },
          data: { status: nextStatus, pointsEarned },
        });
        if (moved.count === 0) {
          throw new ConflictException('Order status changed during payment');
        }
        if (success && pointsEarned > 0) {
          await tx.user.update({
            where: { id: userId },
            data: { loyaltyPoints: { increment: pointsEarned } },
          });
        }
        const settled = await tx.payment.updateMany({
          where: { id: processingId, status: 'PROCESSING' },
          data: {
            status: success ? 'SUCCESS' : 'FAILED',
            failureReason: success ? null : (charge.reason ?? 'Payment failed'),
          },
        });
        if (settled.count === 0) {
          throw new ConflictException('Payment is no longer processing');
        }
        return tx.payment.findUniqueOrThrow({ where: { id: processingId }, select: PAYMENT_SELECT });
      });
    } catch (err) {
      await this.releaseProcessing(processingId, 'Payment settlement failed');
      throw mapWriteError(err);
    }

    const updatedOrder = { id: order.id, status: nextStatus };
    if (!success) {
      throw new HttpException(
        {
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          message: 'Payment failed',
          reason: charge.reason,
          payment,
          order: updatedOrder,
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    return { result: { payment, order: updatedOrder }, replayed: false };
  }

  private findByKey(idempotencyKey: string): Promise<PaymentWithOrder | null> {
    return this.prisma.payment.findUnique({
      where: { idempotencyKey },
      include: PAYMENT_WITH_ORDER,
    });
  }

  /**
   * Answers a reused Idempotency-Key from the stored payment. Another user's key answers 409 without
   * revealing the order; a different order or body answers 422. Nothing is charged here.
   */
  private async replay(
    existing: PaymentWithOrder,
    dto: CreatePaymentDto,
    userId: string,
    requestHash: string,
  ): Promise<PayOutcome> {
    if (existing.order.userId !== userId) {
      throw new ConflictException('Idempotency-Key has already been used');
    }
    if (existing.orderId !== dto.orderId || existing.requestHash !== requestHash) {
      throw new UnprocessableEntityException('Idempotency-Key was already used with a different request');
    }

    let row = existing;
    if (row.status === 'PROCESSING') {
      await this.reapStaleProcessing(this.prisma, row.orderId);
      row = (await this.findByKey(row.idempotencyKey)) ?? row;
      if (row.status === 'PROCESSING') {
        throw new ConflictException('Payment is already in progress');
      }
    }

    if (row.status === 'SUCCESS') {
      return {
        result: {
          payment: toPaymentResponse(row),
          order: { id: row.orderId, status: row.order.status },
        },
        replayed: true,
      };
    }

    throw new HttpException(
      {
        statusCode: HttpStatus.PAYMENT_REQUIRED,
        message: 'Payment failed',
        reason: row.failureReason ?? 'Payment failed',
        payment: toPaymentResponse(row),
        order: { id: row.orderId, status: row.order.status },
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }

  /** Marks PROCESSING rows of an order older than the timeout as FAILED so the order can be claimed again. */
  private async reapStaleProcessing(db: Prisma.TransactionClient, orderId: string): Promise<void> {
    const stale = await db.payment.findMany({
      where: {
        orderId,
        status: 'PROCESSING',
        createdAt: { lt: new Date(Date.now() - PROCESSING_TIMEOUT_MS) },
      },
      select: { id: true },
    });
    for (const { id } of stale) {
      const reaped = await db.payment.updateMany({
        where: { id, status: 'PROCESSING' },
        data: { status: 'FAILED', failureReason: 'Payment attempt timed out' },
      });
      if (reaped.count > 0) {
        this.logger.warn(`Reaped stale PROCESSING payment ${id} for order ${orderId}`);
      }
    }
  }

  /** Clears the PROCESSING marker so the order can be retried. */
  private async releaseProcessing(paymentId: string, reason: string): Promise<void> {
    await this.prisma.payment.updateMany({
      where: { id: paymentId, status: 'PROCESSING' },
      data: { status: 'FAILED', failureReason: reason },
    });
  }
}
