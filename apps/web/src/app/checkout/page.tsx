import { Footer } from '@/components/layout/footer';
import { Navbar } from '@/components/layout/navbar';
import { RequireAuth } from '@/components/auth/require-auth';
import { CheckoutView } from '@/features/checkout/checkout-view';

const ORDER_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export default function CheckoutPage({ searchParams }: { searchParams: { orderId?: string } }) {
  const pinnedOrderId =
    typeof searchParams.orderId === 'string' && ORDER_ID_PATTERN.test(searchParams.orderId)
      ? searchParams.orderId
      : undefined;

  return (
    <>
      <Navbar />
      <main className="section container-page">
        <h1 className="text-4xl font-bold md:text-5xl">Checkout</h1>
        <div className="mt-10">
          <RequireAuth fallback={<div className="min-h-[12rem]" aria-busy="true" />}>
            <CheckoutView pinnedOrderId={pinnedOrderId} />
          </RequireAuth>
        </div>
      </main>
      <Footer />
    </>
  );
}
