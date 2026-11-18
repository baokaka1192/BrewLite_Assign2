import Link from 'next/link';
import { Footer } from '@/components/layout/footer';
import { Navbar } from '@/components/layout/navbar';
import { Button } from '@/components/ui/button';

export default function ProductNotFound() {
  return (
    <>
      <Navbar />
      <main className="section container-page">
      <div className="border border-border bg-surface px-6 py-12 text-center">
        <p className="text-lg font-semibold">This item is not on the menu.</p>
        <p className="mt-2 text-sm text-muted-foreground">It may have been removed or the link is incorrect.</p>
        <Button asChild className="mt-6">
          <Link href="/menu">Back to menu</Link>
        </Button>
      </div>
      </main>
      <Footer />
    </>
  );
}
