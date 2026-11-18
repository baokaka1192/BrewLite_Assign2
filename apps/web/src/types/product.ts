export const PRODUCT_CATEGORIES = ['coffee', 'tea', 'pastry'] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export interface ProductSize {
  code: string;
  delta: number;
}

export interface ProductTopping {
  id: string;
  name: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: ProductCategory;
  price: number;
  imageUrl: string;
  stock: number;
  available: boolean;
  sizes: ProductSize[];
  toppings: ProductTopping[];
}
