import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Product, ProductCategory, ProductSize, Topping } from './product.entity';

type ProductRow = {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  imageUrl: string;
  available: boolean;
  stock: number;
  sizes: unknown;
  toppings: unknown;
};

const toProduct = (row: ProductRow): Product => ({
  id: row.id,
  name: row.name,
  description: row.description,
  price: row.price,
  category: row.category as ProductCategory,
  imageUrl: row.imageUrl,
  available: row.available,
  stock: row.stock,
  sizes: row.sizes as ProductSize[],
  toppings: row.toppings as Topping[],
});

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(category?: ProductCategory): Promise<Product[]> {
    const rows = await this.prisma.product.findMany({
      where: category ? { category } : undefined,
    });
    // Keep seed order (ids "1".."10") rather than lexicographic DB order.
    return rows
      .map(toProduct)
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  }

  async findOne(id: string): Promise<Product> {
    const row = await this.prisma.product.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException(`Product ${id} not found`);
    }
    return toProduct(row);
  }
}
