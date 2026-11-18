import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export const MY_ORDERS_DEFAULT_LIMIT = 20;
export const MY_ORDERS_MAX_LIMIT = 50;

export class ListMyOrdersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MY_ORDERS_MAX_LIMIT)
  limit?: number;
}
