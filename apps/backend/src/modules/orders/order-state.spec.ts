import { OrderStatus } from '@prisma/client';
import { ConflictException } from '@nestjs/common';
import { ALLOWED_TRANSITIONS, assertTransition, canTransition } from './order-state';

const ALL = Object.values(OrderStatus) as OrderStatus[];

const VALID: [OrderStatus, OrderStatus][] = [
  ['PENDING', 'PAID'],
  ['PENDING', 'PAYMENT_FAILED'],
  ['PENDING', 'CANCELLED'],
  ['PAYMENT_FAILED', 'PAID'],
  ['PAYMENT_FAILED', 'PENDING'],
  ['PAYMENT_FAILED', 'CANCELLED'],
  ['PAID', 'PREPARING'],
  ['PAID', 'CANCELLED'],
  ['PREPARING', 'READY'],
  ['PREPARING', 'CANCELLED'],
  ['READY', 'COMPLETED'],
];

describe('order state machine', () => {
  it('covers every status in the enum', () => {
    expect(ALL.sort()).toEqual(['CANCELLED', 'COMPLETED', 'PAID', 'PAYMENT_FAILED', 'PENDING', 'PREPARING', 'READY']);
    expect(Object.keys(ALLOWED_TRANSITIONS).sort()).toEqual([...ALL].sort());
  });

  describe('valid transitions', () => {
    it.each(VALID)('%s -> %s is allowed and does not throw', (from, to) => {
      expect(canTransition(from, to)).toBe(true);
      expect(() => assertTransition(from, to)).not.toThrow();
    });

    it('the list of valid pairs matches the ALLOWED map exactly', () => {
      const fromMap = ALL.flatMap((from) => ALLOWED_TRANSITIONS[from].map((to) => `${from}->${to}`)).sort();
      expect(fromMap).toEqual(VALID.map(([f, t]) => `${f}->${t}`).sort());
    });
  });

  describe('every other pair', () => {
    const validKeys = new Set(VALID.map(([f, t]) => `${f}->${t}`));
    const invalid = ALL.flatMap((from) => ALL.map((to) => [from, to] as [OrderStatus, OrderStatus])).filter(
      ([f, t]) => !validKeys.has(`${f}->${t}`),
    );

    it.each(invalid)('%s -> %s is blocked with 409', (from, to) => {
      expect(canTransition(from, to)).toBe(false);
      expect(() => assertTransition(from, to)).toThrow(ConflictException);
      expect(() => assertTransition(from, to)).toThrow(`Invalid order status transition: ${from} -> ${to}`);
    });

    it('COMPLETED and CANCELLED are terminal', () => {
      for (const terminal of ['COMPLETED', 'CANCELLED'] as OrderStatus[]) {
        for (const to of ALL) {
          expect(canTransition(terminal, to)).toBe(false);
        }
      }
    });

    it('same-status updates are rejected', () => {
      for (const s of ALL) {
        expect(canTransition(s, s)).toBe(false);
      }
    });
  });
});
