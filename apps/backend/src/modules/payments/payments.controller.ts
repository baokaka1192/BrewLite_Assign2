import { Body, Controller, Headers, HttpStatus, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { requireIdempotencyKey } from '../../common/idempotency';
import { AuthUser } from '../auth/auth-user';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentResult, PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async pay(
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: AuthUser,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PaymentResult> {
    const key = requireIdempotencyKey(idempotencyKey);
    const { result, replayed } = await this.paymentsService.pay(dto, user.id, key);
    if (replayed) {
      res.status(HttpStatus.OK);
      res.setHeader('Idempotency-Replayed', 'true');
    }
    return result;
  }
}
