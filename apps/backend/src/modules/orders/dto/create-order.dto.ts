import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { SizeCode } from '../../products/product.entity';

export class CartItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  productId!: string;

  @IsOptional()
  @IsIn(['S', 'M', 'L'])
  size?: SizeCode;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  toppingIds?: string[];

  @IsInt()
  @Min(1)
  @Max(20)
  qty!: number;
}

export class CreateOrderDto {
  @ArrayNotEmpty()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items!: CartItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;

  /** Optional discount code. Trimmed and uppercased before validation. */
  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  voucherCode?: string;
}
