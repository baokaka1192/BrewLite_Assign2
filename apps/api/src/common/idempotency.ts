import { BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';

export const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

/** Validates the Idempotency-Key header. Required on POST /api/orders and POST /api/payments. */
export function requireIdempotencyKey(value: string | undefined): string {
  if (value === undefined || value === '') {
    throw new BadRequestException('Idempotency-Key header is required');
  }
  if (!IDEMPOTENCY_KEY_PATTERN.test(value)) {
    throw new BadRequestException('Idempotency-Key must be 8-128 characters of [A-Za-z0-9_-]');
  }
  return value;
}

/** SHA-256 fingerprint of a canonical request payload (callers build it in a fixed key order). */
export function hashRequest(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}
