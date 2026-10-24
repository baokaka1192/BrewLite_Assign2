'use client';

import Link from 'next/link';
import { Footer } from '@/components/layout/footer';
import { Navbar } from '@/components/layout/navbar';
import { Button } from '@/components/ui/button';

export default function ProductError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <>
      <Navbar />
      <main className="section container-page">
      <div role="alert" className="border border-border bg-surface px-6 py-12 text-center">
        <p className="text-lg font-semibold">We couldn&rsquo;t load this product.</p>
        <p className="mt-2 text-sm text-muted-foreground">Please try again in a moment.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <Button asChild variant="ghost">
            <Link href="/menu">Back to menu</Link>
          </Button>
        </div>
      </div>
      </main>
      <Footer />
    </>
  );
}
