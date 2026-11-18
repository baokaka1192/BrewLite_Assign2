import { ConflictException, HttpException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MockPaymentGateway } from './mock-payment.gateway';
import { PaymentsService, PROCESSING_TIMEOUT_MS, paymentRequestHash, statusAfterPayment } from './payments.service';

const order = { id: 'o1', userId: 'u1', status: 'PENDING', total: 116000, version: 0 };
const walletDto = { orderId: 'o1', method: 'WALLET' as const };

type Opts = {
  claimCount?: number;
  createError?: unknown;
  moveCount?: number;
  chargeThrows?: boolean;
  /** Results of payment.findUnique in call order (the first call is the key lookup before claiming). */
  keyLookups?: unknown[];
  staleIds?: string[];
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
      findMany: jest.fn(async () => (opts.staleIds ?? []).map((id) => ({ id }))),
      findUniqueOrThrow: jest.fn(async () => ({ id: 'p1', status: charge.success ? 'SUCCESS' : 'FAILED', amount: 116000, method: 'WALLET', createdAt: new Date() })),
    },
    user: { update: jest.fn(async () => ({})) },
  };
  const lookups = [...(opts.keyLookups ?? [null])];
  const prisma = {
    order: { findFirst: jest.fn(async () => findResult) },
    payment: {
      findUnique: jest.fn(async () => (lookups.length > 1 ? lookups.shift() : lookups[0])),
      findMany: jest.fn(async () => (opts.staleIds ?? []).map((id) => ({ id }))),
      updateMany: jest.fn(async () => ({ count: 1 })),
    },
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

const storedRow = (over: Record<string, unknown> = {}) => ({
  id: 'p9',
  orderId: 'o1',
  idempotencyKey: 'key-1',
  requestHash: paymentRequestHash(walletDto),
  status: 'SUCCESS',
  amount: 116000,
  method: 'WALLET',
  failureReason: null,
  createdAt: new Date(),
  order: { userId: 'u1', status: 'PAID' },
  ...over,
});

describe('PaymentsService', () => {
  it('creates a PROCESSING row, then settles it and marks the order PAID on success', async () => {
    const { service, tx, gateway } = setup(order, { success: true });

    const { result, replayed } = await service.pay(walletDto, 'u1', 'key-1');

    expect(replayed).toBe(false);
    expect(result.order).toEqual({ id: 'o1', status: 'PAID' });
    expect(result.payment.status).toBe('SUCCESS');
    expect(tx.order.updateMany).toHaveBeenCalledWith({
      where: { id: 'o1', userId: 'u1', status: 'PENDING', version: 0 },
      data: { version: { increment: 1 } },
    });
    expect(tx.payment.create.mock.calls[0][0].data).toEqual(
      expect.objectContaining({ orderId: 'o1', idempotencyKey: 'key-1', status: 'PROCESSING', requestHash: paymentRequestHash(walletDto) }),
    );
    expect(tx.payment.updateMany).toHaveBeenCalledWith({
      where: { id: 'p1', status: 'PROCESSING' },
      data: { status: 'SUCCESS', failureReason: null },
    });
    expect(tx.order.updateMany).toHaveBeenCalledWith({
      where: { id: 'o1', status: 'PENDING' },
      data: { status: 'PAID', pointsEarned: 11 },
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

    await service.pay(walletDto, 'u1', 'key-1');

    expect(calls).toEqual(['create', 'charge']);
  });

  it('returns 409 and never charges when the version claim fails', async () => {
    const { service, gateway, tx } = setup(order, { success: true }, { claimCount: 0 });

    await expect(service.pay(walletDto, 'u1', 'key-1')).rejects.toBeInstanceOf(ConflictException);
    expect(gateway.charge).not.toHaveBeenCalled();
    expect(tx.payment.create).not.toHaveBeenCalled();
  });

  it('returns 409 and never charges when another payment is PROCESSING (partial index P2002)', async () => {
    const { service, gateway } = setup(order, { success: true }, {
      createError: { code: 'P2002', meta: { target: 'Payment_orderId_processing_key' } },
    });

    await expect(service.pay(walletDto, 'u1', 'key-1')).rejects.toThrow('Order already has a payment in progress');
    expect(gateway.charge).not.toHaveBeenCalled();
  });

  it('replays a stored SUCCESS for the same key without charging or creating a row', async () => {
    const { service, gateway, tx } = setup(order, { success: true }, { keyLookups: [storedRow()] });

    const { result, replayed } = await service.pay(walletDto, 'u1', 'key-1');

    expect(replayed).toBe(true);
    expect(result).toEqual({
      payment: expect.objectContaining({ id: 'p9', status: 'SUCCESS', amount: 116000 }),
      order: { id: 'o1', status: 'PAID' },
    });
    expect(gateway.charge).not.toHaveBeenCalled();
    expect(tx.payment.create).not.toHaveBeenCalled();
  });

  it('replays a stored failure as the 402 body without charging', async () => {
    const failed = storedRow({ status: 'FAILED', failureReason: 'Card declined', order: { userId: 'u1', status: 'PAYMENT_FAILED' } });
    const { service, gateway } = setup(order, { success: true }, { keyLookups: [failed] });

    const err = await service.pay(walletDto, 'u1', 'key-1').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpException);
    expect((err as HttpException).getStatus()).toBe(402);
    expect((err as HttpException).getResponse()).toEqual(
      expect.objectContaining({ reason: 'Card declined', order: { id: 'o1', status: 'PAYMENT_FAILED' } }),
    );
    expect(gateway.charge).not.toHaveBeenCalled();
  });

  it('answers 422 when the same key is reused for another order', async () => {
    const { service, gateway } = setup(order, { success: true }, { keyLookups: [storedRow({ orderId: 'o2' })] });

    await expect(service.pay(walletDto, 'u1', 'key-1')).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(gateway.charge).not.toHaveBeenCalled();
  });

  it('answers 422 when the same key is reused with a different body', async () => {
    const { service, gateway } = setup(order, { success: true }, {
      keyLookups: [storedRow({ requestHash: paymentRequestHash({ orderId: 'o1', method: 'CARD', cardNumber: '4111111111111111' }) })],
    });

    await expect(service.pay(walletDto, 'u1', 'key-1')).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(gateway.charge).not.toHaveBeenCalled();
  });

  it('answers 409 without revealing the order when the key belongs to another user', async () => {
    const { service, gateway } = setup(order, { success: true }, {
      keyLookups: [storedRow({ order: { userId: 'someone-else', status: 'PAID' } })],
    });

    const err = await service.pay(walletDto, 'u1', 'key-1').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ConflictException);
    expect(JSON.stringify((err as ConflictException).getResponse())).not.toContain('o1');
    expect(gateway.charge).not.toHaveBeenCalled();
  });

  it('answers 409 for a same-key retry while the first attempt is still PROCESSING', async () => {
    const { service, gateway } = setup(order, { success: true }, {
      keyLookups: [storedRow({ status: 'PROCESSING' })],
    });

    await expect(service.pay(walletDto, 'u1', 'key-1')).rejects.toBeInstanceOf(ConflictException);
    expect(gateway.charge).not.toHaveBeenCalled();
  });

  it('replays the winner of a same-key race when the claim loses', async () => {
    const { service, gateway } = setup(order, { success: true }, {
      claimCount: 0,
      keyLookups: [null, storedRow()],
    });

    const { replayed, result } = await service.pay(walletDto, 'u1', 'key-1');

    expect(replayed).toBe(true);
    expect(result.payment.id).toBe('p9');
    expect(gateway.charge).not.toHaveBeenCalled();
  });

  it('reaps a PROCESSING row older than 2 minutes before claiming (manipulated createdAt)', async () => {
    const { service, tx, gateway } = setup(order, { success: true }, { staleIds: ['stale1'] });

    const { result } = await service.pay(walletDto, 'u1', 'key-2');

    expect(result.order.status).toBe('PAID');
    const query = (tx.payment.findMany as jest.Mock).mock.calls[0][0];
    expect(query.where.status).toBe('PROCESSING');
    const cutoff = (query.where.createdAt.lt as Date).getTime();
    expect(Math.abs(cutoff - (Date.now() - PROCESSING_TIMEOUT_MS))).toBeLessThan(5000);
    expect(tx.payment.updateMany).toHaveBeenCalledWith({
      where: { id: 'stale1', status: 'PROCESSING' },
      data: { status: 'FAILED', failureReason: 'Payment attempt timed out' },
    });
    expect(gateway.charge).toHaveBeenCalledTimes(1);
  });

  it('marks the payment FAILED and leaves the order retryable when the gateway throws', async () => {
    const { service, prisma, tx } = setup(order, { success: true }, { chargeThrows: true });

    await expect(service.pay(walletDto, 'u1', 'key-1')).rejects.toThrow('gateway down');

    expect(prisma.payment.updateMany).toHaveBeenCalledWith({
      where: { id: 'p1', status: 'PROCESSING' },
      data: { status: 'FAILED', failureReason: 'Payment gateway error' },
    });
    expect(tx.order.updateMany).toHaveBeenCalledTimes(1); // only the claim, no status move
  });

  it('marks the order PAYMENT_FAILED and throws 402 with the reason on decline', async () => {
    const { service, tx } = setup(order, { success: false, reason: 'Card declined' });

    const err = await service.pay({ orderId: 'o1', method: 'CARD', cardNumber: '4111111111110000' }, 'u1', 'key-1').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpException);
    expect((err as HttpException).getStatus()).toBe(402);

    expect(tx.order.updateMany).toHaveBeenCalledWith({
      where: { id: 'o1', status: 'PENDING' },
      data: { status: 'PAYMENT_FAILED', pointsEarned: 0 },
    });
    expect(tx.payment.updateMany).toHaveBeenCalledWith({
      where: { id: 'p1', status: 'PROCESSING' },
      data: { status: 'FAILED', failureReason: 'Card declined' },
    });
  });

  it('never stores the card number in the payment row', async () => {
    const { service, tx } = setup(order, { success: true });

    await service.pay({ orderId: 'o1', method: 'CARD', cardNumber: '4111111111111111' }, 'u1', 'key-1');

    expect(JSON.stringify(tx.payment.create.mock.calls[0][0])).not.toContain('4111111111111111');
  });

  it('throws 404 when the order does not belong to the user', async () => {
    const { service, prisma, gateway } = setup(null, { success: true });

    await expect(service.pay(walletDto, 'other', 'key-1')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.order.findFirst).toHaveBeenCalledWith({ where: { id: 'o1', userId: 'other' } });
    expect(gateway.charge).not.toHaveBeenCalled();
  });

  it('throws 409 when the order is not payable', async () => {
    const { service, gateway } = setup({ ...order, status: 'PAID' }, { success: true });

    await expect(service.pay(walletDto, 'u1', 'key-1')).rejects.toBeInstanceOf(ConflictException);
    expect(gateway.charge).not.toHaveBeenCalled();
  });

  it('charges the DB order total, ignoring any amount-like input', async () => {
    const { service, gateway } = setup({ ...order, total: 40000 }, { success: true });

    await service.pay({ ...walletDto, amount: 1 } as never, 'u1', 'key-1');

    expect(gateway.charge).toHaveBeenCalledWith(expect.objectContaining({ amount: 40000 }));
  });

  it('allows retry from PAYMENT_FAILED by moving through PENDING', async () => {
    const { service, tx } = setup({ ...order, status: 'PAYMENT_FAILED' }, { success: true });

    await service.pay(walletDto, 'u1', 'key-1');

    expect(tx.order.updateMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: expect.objectContaining({ status: 'PAYMENT_FAILED' }),
      data: { version: { increment: 1 }, status: 'PENDING' },
    }));
    expect(tx.order.updateMany).toHaveBeenLastCalledWith({ where: { id: 'o1', status: 'PENDING' }, data: { status: 'PAID', pointsEarned: 11 } });
  });
});

describe('payment helpers', () => {
  it('statusAfterPayment maps success and failure', () => {
    expect(statusAfterPayment(true)).toBe('PAID');
    expect(statusAfterPayment(false)).toBe('PAYMENT_FAILED');
  });
});
