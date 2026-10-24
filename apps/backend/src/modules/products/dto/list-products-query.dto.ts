import { IsIn, IsOptional } from 'class-validator';
import { PRODUCT_CATEGORIES, ProductCategory } from '../product.entity';

export class ListProductsQueryDto {
  @IsOptional()
  @IsIn(PRODUCT_CATEGORIES, { message: `category must be one of: ${PRODUCT_CATEGORIES.join(', ')}` })
  category?: ProductCategory;
}
