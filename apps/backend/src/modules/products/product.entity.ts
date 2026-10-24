export const PRODUCT_CATEGORIES = ['coffee', 'tea', 'pastry'] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export type SizeCode = 'S' | 'M' | 'L';

export interface ProductSize {
  code: SizeCode;
  delta: number;
}

export interface Topping {
  id: string;
  name: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: ProductCategory;
  imageUrl: string;
  available: boolean;
  stock: number;
  sizes: ProductSize[];
  toppings: Topping[];
}
