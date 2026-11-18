import { Footer } from '@/components/layout/footer';
import { Navbar } from '@/components/layout/navbar';
import { RequireAuth } from '@/components/auth/require-auth';
import { OrdersListView } from '@/features/orders/orders-list-view';

export default function OrdersPage() {
  return (
    <>
      <Navbar />
      <main className="section container-page">
        <h1 className="text-4xl font-bold md:text-5xl">My orders</h1>
        <div className="mt-10">
          <RequireAuth fallback={<div className="min-h-[12rem]" aria-busy="true" />}>
            <OrdersListView />
          </RequireAuth>
        </div>
      </main>
      <Footer />
    </>
  );
}
