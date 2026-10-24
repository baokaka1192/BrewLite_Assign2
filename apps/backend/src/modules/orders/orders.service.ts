import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductSize, SizeCode, Topping } from '../products/product.entity';
import { CartItemDto, CreateOrderDto } from './dto/create-order.dto';

type ProductRow = {
  id: string;
  name: string;
  price: number;
  available: boolean;
  stock: number;
  sizes: unknown;
  toppings: unknown;
};

export interface PricedLine {
  productId: string;
  name: string;
  size: string;
  toppings: Topping[];
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

export interface OrderResponse {
  id: string;
  status: string;
  total: number;
  items: PricedLine[];
  createdAt: Date;
}

/**
 * Prices every cart line from the DB product rows. Pure function so the
 * price rules can be unit tested without a database.
 */
export function priceCart(
  items: CartItemDto[],
  products: Map<string, ProductRow>,
): PricedLine[] {
  const requestedQty = new Map<string, number>();
  for (const item of items) {
    requestedQty.set(item.productId, (requestedQty.get(item.productId) ?? 0) + item.qty);
  }

  return items.map((item) => {
    const product = products.get(item.productId);
    if (!product) {
      throw new NotFoundException(`Product ${item.productId} not found`);
    }
    if (!product.available) {
      throw new BadRequestException(`Product ${item.productId} is not available`);
    }
    if ((requestedQty.get(item.productId) ?? 0) > product.stock) {
      throw new ConflictException(`Insufficient stock for product ${item.productId}`);
    }

    const sizes = (product.sizes as ProductSize[]) ?? [];
    let sizeCode = '';
    let sizeDelta = 0;
    if (sizes.length > 0) {
      // Default to the product's base size when the client omits it.
      const requested: SizeCode = item.size ?? sizes[0].code;
      const match = sizes.find((s) => s.code === requested);
      if (!match) {
        throw new BadRequestException(`Size ${requested} is not available for product ${item.productId}`);
      }
      sizeCode = match.code;
      sizeDelta = match.delta;
    } else if (item.size !== undefined) {
      throw new BadRequestException(`Product ${item.productId} does not have sizes`);
    }

    const available = (product.toppings as Topping[]) ?? [];
    const toppings: Topping[] = (item.toppingIds ?? []).map((id) => {
      const topping = available.find((t) => t.id === id);
      if (!topping) {
        throw new BadRequestException(`Topping ${id} is not available for product ${item.productId}`);
      }
      return { id: topping.id, name: topping.name, price: topping.price };
    });

    const unitPrice =
      product.price + sizeDelta + toppings.reduce((sum, t) => sum + t.price, 0);
    return {
      productId: product.id,
      name: product.name,
      size: sizeCode,
      toppings,
      qty: item.qty,
      unitPrice,
      lineTotal: unitPrice * item.qty,
    };
  });
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(dto: CreateOrderDto): Promise<OrderResponse> {
    const ids = [...new Set(dto.items.map((i) => i.productId))];
    const rows = await this.prisma.product.findMany({ where: { id: { in: ids } } });
    const products = new Map<string, ProductRow>(rows.map((r) => [r.id, r]));

    const lines = priceCart(dto.items, products);
    const total = lines.reduce((sum, l) => sum + l.lineTotal, 0);

    // Stock is NOT decremented here; that is handled in Task 10.
    const order = await this.prisma.$transaction((tx) =>
      tx.order.create({
        data: {
          // TODO(Task 7): set userId from the JWT once auth exists.
          userId: null,
          status: 'PENDING',
          total,
          note: dto.note ?? null,
          items: {
            create: lines.map((l) => ({
              product: { connect: { id: l.productId } },
              size: l.size,
              toppings: l.toppings.map((t) => ({ id: t.id, name: t.name, price: t.price })),
              qty: l.qty,
              lineTotal: l.lineTotal,
            })),
          },
        },
        select: { id: true, status: true, total: true, createdAt: true },
      }),
    );

    return {
      id: order.id,
      status: order.status,
      total: order.total,
      items: lines,
      createdAt: order.createdAt,
    };
  }
}
