import Image from 'next/image';
import Link from 'next/link';
import { Footer } from '@/components/layout/footer';
import { Navbar } from '@/components/layout/navbar';
import { AddToCartOptions } from '@/components/menu/add-to-cart-options';
import { AmberRule } from '@/components/shared/amber-rule';
import { ImageFrame } from '@/components/shared/image-frame';
import { getProduct } from '@/lib/api';
import { formatVND } from '@/lib/utils';

export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await getProduct(params.id);
  const soldOut = !product.available || product.stock === 0;

  return (
    <>
      <Navbar />
      <main className="section container-page">
        <Link href="/menu" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
          &larr; Back to menu
        </Link>
        <div className="mt-8 grid gap-12 md:grid-cols-2">
          <div className="relative aspect-[4/3] overflow-hidden border border-border">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                priority
                sizes="(min-width: 768px) 50vw, 100vw"
                className={`object-cover ${soldOut ? 'grayscale' : ''}`}
              />
            ) : (
              <ImageFrame alt={product.name} brief={product.name} className="h-full w-full" />
            )}
          </div>
          <div>
            <h1 className="text-4xl font-bold md:text-5xl">{product.name}</h1>
            <AmberRule />
            <p className="text-muted-foreground">{product.description}</p>
            <p className="mt-4 text-lg font-medium text-accent">From {formatVND(product.price)}</p>
            <div className="mt-8">
              <AddToCartOptions product={product} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
