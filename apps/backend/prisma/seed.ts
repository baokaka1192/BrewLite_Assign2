import { PrismaClient, Prisma } from '@prisma/client';
import { Product, ProductSize, Topping } from '../src/modules/products/product.entity';

const prisma = new PrismaClient();

const DRINK_SIZES: ProductSize[] = [
  { code: 'S', delta: 0 },
  { code: 'M', delta: 5000 },
  { code: 'L', delta: 10000 },
];

const TOPPINGS: Topping[] = [
  { id: 'tran-chau', name: 'Trân châu', price: 8000 },
  { id: 'kem-cheese', name: 'Kem cheese', price: 10000 },
  { id: 'thach-dua', name: 'Thạch dừa', price: 7000 },
];

const drinkExtras = () => ({
  sizes: DRINK_SIZES.map((s) => ({ ...s })),
  toppings: TOPPINGS.map((t) => ({ ...t })),
});

const pastryExtras = () => ({ sizes: [] as ProductSize[], toppings: [] as Topping[] });

const SEED_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Cà phê đen đá',
    description: 'Vietnamese iced black coffee, dripped slowly over ice.',
    price: 25000,
    category: 'coffee',
    imageUrl: '/images/menu/ca-phe-den-da.jpg',
    available: true,
    stock: 120,
    ...drinkExtras(),
  },
  {
    id: '2',
    name: 'Cà phê sữa đá',
    description: 'Iced Vietnamese coffee with condensed milk.',
    price: 29000,
    category: 'coffee',
    imageUrl: '/images/menu/ca-phe-sua-da.jpg',
    available: true,
    stock: 150,
    ...drinkExtras(),
  },
  {
    id: '3',
    name: 'Bạc xỉu',
    description: 'Light, milky coffee with a generous spoon of condensed milk.',
    price: 32000,
    category: 'coffee',
    imageUrl: '/images/menu/bac-xiu.jpg',
    available: true,
    stock: 90,
    ...drinkExtras(),
  },
  {
    id: '4',
    name: 'Espresso',
    description: 'Double shot of espresso, bold and concentrated.',
    price: 35000,
    category: 'coffee',
    imageUrl: '/images/menu/espresso.jpg',
    available: true,
    stock: 80,
    ...drinkExtras(),
  },
  {
    id: '5',
    name: 'Cappuccino',
    description: 'Espresso with steamed milk and a thick layer of foam.',
    price: 45000,
    category: 'coffee',
    imageUrl: '/images/menu/cappuccino.jpg',
    available: true,
    stock: 60,
    ...drinkExtras(),
  },
  {
    id: '6',
    name: 'Bạc hà đá xay',
    description: 'Blended iced coffee with a fresh mint finish.',
    price: 49000,
    category: 'coffee',
    imageUrl: '/images/menu/bac-ha-da-xay.jpg',
    available: false,
    stock: 0,
    ...drinkExtras(),
  },
  {
    id: '7',
    name: 'Trà đào cam sả',
    description: 'Iced peach tea with orange and lemongrass.',
    price: 42000,
    category: 'tea',
    imageUrl: '/images/menu/tra-dao-cam-sa.jpg',
    available: true,
    stock: 70,
    ...drinkExtras(),
  },
  {
    id: '8',
    name: 'Trà sen vàng',
    description: 'Green tea scented with lotus and a touch of honey.',
    price: 40000,
    category: 'tea',
    imageUrl: '/images/menu/tra-sen-vang.jpg',
    available: true,
    stock: 55,
    ...drinkExtras(),
  },
  {
    id: '9',
    name: 'Bánh croissant bơ',
    description: 'Flaky all-butter croissant baked every morning.',
    price: 30000,
    category: 'pastry',
    imageUrl: '/images/menu/croissant-bo.jpg',
    available: true,
    stock: 25,
    ...pastryExtras(),
  },
  {
    id: '10',
    name: 'Bánh mì pate trứng',
    description: 'Crispy baguette with pate, egg and pickled vegetables.',
    price: 38000,
    category: 'pastry',
    imageUrl: '/images/menu/banh-mi-pate-trung.jpg',
    available: false,
    stock: 0,
    ...pastryExtras(),
  },
];

async function main() {
  for (const p of SEED_PRODUCTS) {
    const data = {
      name: p.name,
      description: p.description,
      category: p.category,
      price: p.price,
      imageUrl: p.imageUrl,
      stock: p.stock,
      available: p.available,
      sizes: p.sizes as unknown as Prisma.InputJsonValue,
      toppings: p.toppings as unknown as Prisma.InputJsonValue,
    };
    await prisma.product.upsert({
      where: { id: p.id },
      create: { id: p.id, ...data },
      update: data,
    });
  }
  console.log(`Seeded ${SEED_PRODUCTS.length} products`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
