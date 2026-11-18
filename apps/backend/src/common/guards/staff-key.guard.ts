import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, timingSafeEqual } from 'crypto';
import { Request } from 'express';

const STAFF_KEY_HEADER = 'x-staff-key';

function sameSecret(a: string, b: string): boolean {
  // Hash both sides so the comparison length does not depend on the secret length.
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

/**
 * Gates staff-only endpoints with the STAFF_API_KEY env value sent as X-Staff-Key.
 * When STAFF_API_KEY is unset the endpoint does not exist (404).
 */
@Injectable()
export class StaffKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.STAFF_API_KEY;
    if (!expected) {
      throw new NotFoundException();
    }
    const req = context.switchToHttp().getRequest<Request>();
    const provided = req.headers[STAFF_KEY_HEADER];
    if (typeof provided !== 'string' || !sameSecret(provided, expected)) {
      throw new ForbiddenException('Invalid staff key');
    }
    return true;
  }
}
