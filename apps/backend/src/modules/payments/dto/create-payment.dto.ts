import { IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { PaymentMethod } from '../mock-payment.gateway';

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  orderId!: string;

  @IsIn(['WALLET', 'CARD'])
  method!: PaymentMethod;

  /** Required when method is CARD. Test number only; never stored. */
  @IsOptional()
  @IsString()
  @Matches(/^\d{12,19}$/, { message: 'cardNumber must be 12-19 digits' })
  cardNumber?: string;
}
