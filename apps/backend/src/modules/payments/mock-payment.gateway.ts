import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

export type PaymentMethod = 'WALLET' | 'CARD';

export interface ChargeRequest {
  amount: number;
  method: PaymentMethod;
  /** Only passed for CARD. Never persisted. */
  cardNumber?: string;
}

export interface ChargeResult {
  success: boolean;
  reference: string;
  reason?: string;
}

/** Wallet charges above this amount are declined by the mock gateway. */
export const WALLET_LIMIT = 5_000_000;

/**
 * Deterministic mock payment gateway.
 * - CARD numbers ending in 0000 are declined.
 * - WALLET charges above WALLET_LIMIT are declined.
 * - Everything else succeeds.
 */
@Injectable()
export class MockPaymentGateway {
  private readonly latencyMs = process.env.NODE_ENV === 'test' ? 0 : 200;

  async charge(req: ChargeRequest): Promise<ChargeResult> {
    if (this.latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.latencyMs));
    }

    const reference = `mock_${randomUUID()}`;
    if (req.method === 'CARD' && req.cardNumber?.endsWith('0000')) {
      return { success: false, reference, reason: 'Card declined' };
    }
    if (req.method === 'WALLET' && req.amount > WALLET_LIMIT) {
      return { success: false, reference, reason: 'Wallet balance insufficient' };
    }
    return { success: true, reference };
  }
}
