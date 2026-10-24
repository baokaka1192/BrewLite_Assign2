export const PRODUCT_CATEGORIES = ['coffee', 'tea', 'pastry'] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export interface Product {
  id: string;
  name: string;
  description: string;
  priceVND: number;
  category: ProductCategory;
  imageUrl: string;
  available: boolean;
  stock: number;
}
