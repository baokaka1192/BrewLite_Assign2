import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

export default function ProductLoading() {
  return (
    <>
      <Navbar />
      <main className="section container-page" role="status" aria-live="polite" aria-label="Loading product">
        <div className="grid animate-pulse gap-12 md:grid-cols-2">
          <div className="aspect-[4/3] bg-surface" />
          <div className="space-y-6">
            <div className="h-10 w-2/3 bg-surface" />
            <div className="h-4 w-full bg-surface" />
            <div className="h-4 w-1/3 bg-surface" />
            <div className="h-32 w-full bg-surface" />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
