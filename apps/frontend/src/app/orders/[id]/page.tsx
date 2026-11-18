import { Footer } from '@/components/layout/footer';
import { Navbar } from '@/components/layout/navbar';
import { RequireAuth } from '@/components/auth/require-auth';
import { OrderView } from '@/features/orders/order-view';

export default function OrderPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { paid?: string };
}) {
  return (
    <>
      <Navbar />
      <main className="section container-page">
        <h1 className="text-4xl font-bold md:text-5xl">Order</h1>
        <div className="mt-10">
          <RequireAuth fallback={<div className="min-h-[12rem]" aria-busy="true" />}>
            <OrderView orderId={params.id} justPaid={searchParams.paid === '1'} />
          </RequireAuth>
        </div>
      </main>
      <Footer />
    </>
  );
}
