import { Injectable, NotFoundException } from '@nestjs/common';
import { Product, ProductCategory } from './product.entity';

const SEED_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Cà phê đen đá',
    description: 'Vietnamese iced black coffee, dripped slowly over ice.',
    priceVND: 25000,
    category: 'coffee',
    imageUrl: '/images/menu/ca-phe-den-da.jpg',
    available: true,
    stock: 120,
  },
  {
    id: '2',
    name: 'Cà phê sữa đá',
    description: 'Iced Vietnamese coffee with condensed milk.',
    priceVND: 29000,
    category: 'coffee',
    imageUrl: '/images/menu/ca-phe-sua-da.jpg',
    available: true,
    stock: 150,
  },
  {
    id: '3',
    name: 'Bạc xỉu',
    description: 'Light, milky coffee with a generous spoon of condensed milk.',
    priceVND: 32000,
    category: 'coffee',
    imageUrl: '/images/menu/bac-xiu.jpg',
    available: true,
    stock: 90,
  },
  {
    id: '4',
    name: 'Espresso',
    description: 'Double shot of espresso, bold and concentrated.',
    priceVND: 35000,
    category: 'coffee',
    imageUrl: '/images/menu/espresso.jpg',
    available: true,
    stock: 80,
  },
  {
    id: '5',
    name: 'Cappuccino',
    description: 'Espresso with steamed milk and a thick layer of foam.',
    priceVND: 45000,
    category: 'coffee',
    imageUrl: '/images/menu/cappuccino.jpg',
    available: true,
    stock: 60,
  },
  {
    id: '6',
    name: 'Bạc hà đá xay',
    description: 'Blended iced coffee with a fresh mint finish.',
    priceVND: 49000,
    category: 'coffee',
    imageUrl: '/images/menu/bac-ha-da-xay.jpg',
    available: false,
    stock: 0,
  },
  {
    id: '7',
    name: 'Trà đào cam sả',
    description: 'Iced peach tea with orange and lemongrass.',
    priceVND: 42000,
    category: 'tea',
    imageUrl: '/images/menu/tra-dao-cam-sa.jpg',
    available: true,
    stock: 70,
  },
  {
    id: '8',
    name: 'Trà sen vàng',
    description: 'Green tea scented with lotus and a touch of honey.',
    priceVND: 40000,
    category: 'tea',
    imageUrl: '/images/menu/tra-sen-vang.jpg',
    available: true,
    stock: 55,
  },
  {
    id: '9',
    name: 'Bánh croissant bơ',
    description: 'Flaky all-butter croissant baked every morning.',
    priceVND: 30000,
    category: 'pastry',
    imageUrl: '/images/menu/croissant-bo.jpg',
    available: true,
    stock: 25,
  },
  {
    id: '10',
    name: 'Bánh mì pate trứng',
    description: 'Crispy baguette with pate, egg and pickled vegetables.',
    priceVND: 38000,
    category: 'pastry',
    imageUrl: '/images/menu/banh-mi-pate-trung.jpg',
    available: false,
    stock: 0,
  },
];

@Injectable()
export class ProductsService {
  private readonly products: Product[] = SEED_PRODUCTS.map((p) => ({ ...p }));

  findAll(category?: ProductCategory): Product[] {
    const list = category
      ? this.products.filter((p) => p.category === category)
      : this.products;
    return list.map((p) => ({ ...p }));
  }

  findOne(id: string): Product {
    const product = this.products.find((p) => p.id === id);
    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }
    return { ...product };
  }
}
