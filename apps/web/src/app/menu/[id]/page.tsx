import { Suspense } from 'react';
import { Footer } from '@/components/layout/footer';
import { Navbar } from '@/components/layout/navbar';
import { AddToCartOptions } from '@/components/menu/add-to-cart-options';
import { ProductDetailBreadcrumb } from '@/components/menu/product-detail-breadcrumb';
import { ProductDetailChips } from '@/components/menu/product-detail-chips';
import { ProductDetailEnter } from '@/components/menu/product-detail-enter';
import { ProductDetailGallery } from '@/components/menu/product-detail-gallery';
import { ProductDetailRelated } from '@/components/menu/product-detail-related';
import { AmberRule } from '@/components/shared/amber-rule';
import { getProduct } from '@/lib/api';
import { staggerDelay } from '@/lib/motion';
import { formatVND } from '@/lib/utils';

export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await getProduct(params.id);
  const soldOut = !product.available || product.stock === 0;

  return (
    <>
      <Navbar />
      <main className="section container-page">
        <ProductDetailEnter>
          <ProductDetailBreadcrumb name={product.name} />
        </ProductDetailEnter>
        <div className="mt-6 grid gap-10 md:grid-cols-[1.15fr_1fr] md:gap-14">
          <ProductDetailEnter delay={staggerDelay(1)}>
            <ProductDetailGallery name={product.name} imageUrl={product.imageUrl} soldOut={soldOut} />
          </ProductDetailEnter>
          <ProductDetailEnter delay={staggerDelay(2)}>
            <div className="rounded-lg border border-border bg-background p-6 shadow-sm md:p-8">
              <ProductDetailChips product={product} />
              <h1 className="mt-4 text-4xl font-bold md:text-5xl">{product.name}</h1>
              <AmberRule />
              <p className="text-muted-foreground">{product.description}</p>
              <p className="mt-4 text-lg font-medium text-accent-text">From {formatVND(product.price)}</p>
              <div className="mt-8 border-t border-border pt-8">
                <AddToCartOptions product={product} />
              </div>
            </div>
          </ProductDetailEnter>
        </div>
        <Suspense fallback={null}>
          <ProductDetailRelated product={product} />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
