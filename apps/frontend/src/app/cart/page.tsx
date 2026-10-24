import { Footer } from '@/components/layout/footer';
import { Navbar } from '@/components/layout/navbar';
import { CartView } from '@/components/cart/cart-view';

export default function CartPage() {
  return (
    <>
      <Navbar />
      <main className="section container-page">
        <h1 className="text-4xl font-bold md:text-5xl">Your cart</h1>
        <div className="mt-10">
          <CartView />
        </div>
      </main>
      <Footer />
    </>
  );
}
