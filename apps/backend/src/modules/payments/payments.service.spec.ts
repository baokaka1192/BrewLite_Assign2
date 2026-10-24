import { ConflictException, HttpException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MockPaymentGateway } from './mock-payment.gateway';
import { PaymentsService, assertPayable, statusAfterPayment } from './payments.service';

const order = { id: 'o1', userId: 'u1', status: 'PENDING', total: 116000, version: 0 };

type Opts = {
  claimCount?: number;
  createError?: unknown;
  moveCount?: number;
  chargeThrows?: boolean;
};

function setup(findResult: unknown, charge: { success: boolean; reason?: string }, opts: Opts = {}) {
  const tx = {
    order: {
      updateMany: jest.fn(async ({ data }) =>
        data.version ? { count: opts.claimCount ?? 1 } : { count: opts.moveCount ?? 1 },
      ),
    },
    payment: {
      create: jest.fn(async ({ data }) => {
        if (opts.createError) throw opts.createError;
        return { id: 'p1', ...data };
      }),
      updateMany: jest.fn(async () => ({ count: 1 })),
      findUniqueOrThrow: jest.fn(async () => ({ id: 'p1', status: charge.success ? 'SUCCESS' : 'FAILED', amount: 116000, method: 'WALLET', createdAt: new Date() })),
    },
  };
  const prisma = {
    order: { findFirst: jest.fn(async () => findResult) },
    payment: { updateMany: jest.fn(async () => ({ count: 1 })) },
    $transaction: jest.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
  };
  const gateway = {
    charge: jest.fn(async () => {
      if (opts.chargeThrows) throw new Error('gateway down');
      return { reference: 'ref', ...charge };
    }),
  };
  const service = new PaymentsService(
    prisma as unknown as PrismaService,
    gateway as unknown as MockPaymentGateway,
  );
  return { service, prisma, tx, gateway };
}

describe('PaymentsService', () => {
  it('creates a PROCESSING row, then settles it and marks the order PAID on success', async () => {
    const { service, tx, gateway } = setup(order, { success: true });

    const res = await service.pay({ orderId: 'o1', method: 'WALLET' }, 'u1', 'key-1');

    expect(res.order).toEqual({ id: 'o1', status: 'PAID' });
    expect(res.payment.status).toBe('SUCCESS');
    expect(tx.order.updateMany).toHaveBeenCalledWith({
      where: { id: 'o1', userId: 'u1', status: { in: ['PENDING', 'PAYMENT_FAILED'] }, version: 0 },
      data: { version: { increment: 1 } },
    });
    expect(tx.payment.create.mock.calls[0][0].data).toEqual(
      expect.objectContaining({ orderId: 'o1', idempotencyKey: 'key-1', status: 'PROCESSING' }),
    );
    expect(tx.payment.updateMany).toHaveBeenCalledWith({
      where: { id: 'p1', status: 'PROCESSING' },
      data: { status: 'SUCCESS' },
    });
    expect(tx.order.updateMany).toHaveBeenCalledWith({
      where: { id: 'o1', status: { in: ['PENDING', 'PAYMENT_FAILED'] } },
      data: { status: 'PAID' },
    });
    expect(gateway.charge).toHaveBeenCalledWith({ amount: 116000, method: 'WALLET', cardNumber: undefined });
  });

  it('marks the PROCESSING row as the claim step and charges only after it succeeds', async () => {
    const { service, tx, gateway } = setup(order, { success: true });
    const calls: string[] = [];
    tx.payment.create.mockImplementationOnce(async ({ data }) => {
      calls.push('create');
      return { id: 'p1', ...data };
    });
    gateway.charge.mockImplementationOnce(async () => {
      calls.push('charge');
      return { success: true, reference: 'ref' };
    });

    await service.pay({ orderId: 'o1', method: 'WALLET' }, 'u1');

    expect(calls).toEqual(['create', 'charge']);
  });

  it('returns 409 and never charges when the version claim fails', async () => {
    const { service, gateway, tx } = setup(order, { success: true }, { claimCount: 0 });

    await expect(service.pay({ orderId: 'o1', method: 'WALLET' }, 'u1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(gateway.charge).not.toHaveBeenCalled();
    expect(tx.payment.create).not.toHaveBeenCalled();
  });

  it('returns 409 and never charges when another payment is PROCESSING (partial index P2002)', async () => {
    const { service, gateway } = setup(order, { success: true }, {
      createError: { code: 'P2002', meta: { target: 'Payment_orderId_processing_key' } },
    });

    await expect(service.pay({ orderId: 'o1', method: 'WALLET' }, 'u1')).rejects.toThrow(
      'Order already has a payment in progress',
    );
    expect(gateway.charge).not.toHaveBeenCalled();
  });

  it('returns 409 for a duplicate Idempotency-Key (P2002 on idempotencyKey) before charging', async () => {
    const { service, gateway } = setup(order, { success: true }, {
      createError: { code: 'P2002', meta: { target: ['idempotencyKey'] } },
    });

    await expect(service.pay({ orderId: 'o1', method: 'WALLET' }, 'u1', 'dup')).rejects.toThrow(
      'Idempotency-Key has already been used',
    );
    expect(gateway.charge).not.toHaveBeenCalled();
  });

  it('marks the payment FAILED and leaves the order retryable when the gateway throws', async () => {
    const { service, prisma, tx } = setup(order, { success: true }, { chargeThrows: true });

    await expect(service.pay({ orderId: 'o1', method: 'WALLET' }, 'u1')).rejects.toThrow('gateway down');

    expect(prisma.payment.updateMany).toHaveBeenCalledWith({
      where: { id: 'p1', status: 'PROCESSING' },
      data: { status: 'FAILED' },
    });
    expect(tx.order.updateMany).toHaveBeenCalledTimes(1); // only the claim, no status move
  });

  it('marks the order PAYMENT_FAILED and throws 402 with the reason on decline', async () => {
    const { service, tx } = setup(order, { success: false, reason: 'Card declined' });

    const promise = service.pay({ orderId: 'o1', method: 'CARD', cardNumber: '4111111111110000' }, 'u1');
    await expect(promise).rejects.toBeInstanceOf(HttpException);
    await expect(promise).rejects.toMatchObject({ status: 402 });

    expect(tx.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'PAYMENT_FAILED' } }),
    );
    expect(tx.payment.updateMany).toHaveBeenCalledWith({
      where: { id: 'p1', status: 'PROCESSING' },
      data: { status: 'FAILED' },
    });
  });

  it('never stores the card number in the payment row', async () => {
    const { service, tx } = setup(order, { success: true });

    await service.pay({ orderId: 'o1', method: 'CARD', cardNumber: '4111111111111111' }, 'u1');

    expect(JSON.stringify(tx.payment.create.mock.calls[0][0])).not.toContain('4111111111111111');
  });

  it('throws 404 when the order does not belong to the user', async () => {
    const { service, prisma, gateway } = setup(null, { success: true });

    await expect(service.pay({ orderId: 'o1', method: 'WALLET' }, 'other')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.order.findFirst).toHaveBeenCalledWith({ where: { id: 'o1', userId: 'other' } });
    expect(gateway.charge).not.toHaveBeenCalled();
  });

  it('throws 409 when the order is not payable', async () => {
    const { service, gateway } = setup({ ...order, status: 'PAID' }, { success: true });

    await expect(service.pay({ orderId: 'o1', method: 'WALLET' }, 'u1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(gateway.charge).not.toHaveBeenCalled();
  });

  it('charges the DB order total, ignoring any amount-like input', async () => {
    const { service, gateway } = setup({ ...order, total: 40000 }, { success: true });

    await service.pay({ orderId: 'o1', method: 'WALLET', amount: 1 } as never, 'u1');

    expect(gateway.charge).toHaveBeenCalledWith(expect.objectContaining({ amount: 40000 }));
  });

  it('allows retry from PAYMENT_FAILED', async () => {
    const { service, tx } = setup({ ...order, status: 'PAYMENT_FAILED' }, { success: true });

    await service.pay({ orderId: 'o1', method: 'WALLET' }, 'u1');

    expect(tx.order.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'PAID' } }));
  });
});

describe('payment transition helpers', () => {
  it('assertPayable accepts PENDING and PAYMENT_FAILED only', () => {
    expect(() => assertPayable('PENDING')).not.toThrow();
    expect(() => assertPayable('PAYMENT_FAILED')).not.toThrow();
    expect(() => assertPayable('PAID')).toThrow(ConflictException);
    expect(() => assertPayable('CANCELLED')).toThrow(ConflictException);
  });

  it('statusAfterPayment maps success and failure', () => {
    expect(statusAfterPayment(true)).toBe('PAID');
    expect(statusAfterPayment(false)).toBe('PAYMENT_FAILED');
  });
});
