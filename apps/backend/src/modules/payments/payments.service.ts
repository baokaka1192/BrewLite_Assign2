import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ChargeResult, MockPaymentGateway } from './mock-payment.gateway';

const PAYABLE_STATUSES: OrderStatus[] = ['PENDING', 'PAYMENT_FAILED'];

/**
 * Minimal order transition check for payments. Centralised here so Task 10
 * can replace it with the full state machine.
 */
export function assertPayable(status: string): void {
  if (!PAYABLE_STATUSES.includes(status as OrderStatus)) {
    throw new ConflictException(`Order cannot be paid in status ${status}`);
  }
}

/** Order status after a payment attempt. */
export function statusAfterPayment(success: boolean): 'PAID' | 'PAYMENT_FAILED' {
  return success ? 'PAID' : 'PAYMENT_FAILED';
}

/**
 * Maps unique-constraint violations to 409. Idempotency-Key reuse and the
 * one-PROCESSING-payment-per-order index are told apart by constraint target.
 */
function mapWriteError(err: unknown): unknown {
  const e = err as { code?: string; meta?: { target?: unknown } };
  if (e?.code !== 'P2002') return err;
  const target = JSON.stringify(e.meta?.target ?? '');
  if (target.includes('idempotencyKey')) {
    return new ConflictException('Idempotency-Key has already been used');
  }
  return new ConflictException('Order already has a payment in progress');
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

const PAYMENT_SELECT = { id: true, status: true, amount: true, method: true, createdAt: true } as const;

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: MockPaymentGateway,
  ) {}

  async pay(dto: CreatePaymentDto, userId: string, idempotencyKey?: string): Promise<PaymentResult> {
    const order = await this.prisma.order.findFirst({ where: { id: dto.orderId, userId } });
    if (!order) {
      throw new NotFoundException(`Order ${dto.orderId} not found`);
    }
    assertPayable(order.status);
    if (dto.method === 'CARD' && !dto.cardNumber) {
      throw new BadRequestException('cardNumber is required for CARD payments');
    }

    // Amount is always the server-side order total, never a client value.
    const amount = order.total;
    // TODO(Task 10): replay the stored response when the same Idempotency-Key is reused.
    const key = idempotencyKey ?? randomUUID();

    // Step 1: version claim and in-flight marker in one transaction. The partial
    // unique index rejects a concurrent second PROCESSING row before any charge.
    let processingId: string;
    try {
      processingId = await this.prisma.$transaction(async (tx) => {
        const claim = await tx.order.updateMany({
          where: { id: order.id, userId, status: { in: PAYABLE_STATUSES }, version: order.version },
          data: { version: { increment: 1 } },
        });
        if (claim.count === 0) {
          throw new ConflictException('Order is already being paid or paid');
        }
        const row = await tx.payment.create({
          data: { orderId: order.id, idempotencyKey: key, amount, method: dto.method, status: 'PROCESSING' },
          select: { id: true },
        });
        return row.id;
      });
    } catch (err) {
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
      await this.releaseProcessing(processingId, 'FAILED');
      throw err;
    }

    // Step 3: settle the payment row and move the order in one transaction.
    const success = charge.success;
    const nextStatus = statusAfterPayment(success);
    let payment: PaymentResponse;
    try {
      payment = await this.prisma.$transaction(async (tx) => {
        const moved = await tx.order.updateMany({
          where: { id: order.id, status: { in: PAYABLE_STATUSES } },
          data: { status: nextStatus },
        });
        if (moved.count === 0) {
          throw new ConflictException('Order status changed during payment');
        }
        const settled = await tx.payment.updateMany({
          where: { id: processingId, status: 'PROCESSING' },
          data: { status: success ? 'SUCCESS' : 'FAILED' },
        });
        if (settled.count === 0) {
          throw new ConflictException('Payment is no longer processing');
        }
        return tx.payment.findUniqueOrThrow({ where: { id: processingId }, select: PAYMENT_SELECT });
      });
    } catch (err) {
      await this.releaseProcessing(processingId, 'FAILED');
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

    return { payment, order: updatedOrder };
  }

  /** Clears the PROCESSING marker so the order can be retried. */
  private async releaseProcessing(paymentId: string, status: 'FAILED'): Promise<void> {
    await this.prisma.payment.updateMany({
      where: { id: paymentId, status: 'PROCESSING' },
      data: { status },
    });
  }
}
