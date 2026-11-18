import Link from 'next/link';
import { Footer } from '@/components/layout/footer';
import { Navbar } from '@/components/layout/navbar';
import { AmberRule } from '@/components/shared/amber-rule';
import { StateIllustration } from '@/components/shared/state-illustration';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="section container-page text-center motion-safe:animate-fade-in">
        <StateIllustration variant="notfound" className="mx-auto mb-4" />
        <p className="font-display text-7xl italic text-accent-text md:text-8xl" aria-hidden>
          404
        </p>
        <h1 className="mt-4 text-4xl font-bold md:text-5xl">This page went cold.</h1>
        <div className="mx-auto flex justify-center">
          <AmberRule />
        </div>
        <p className="mx-auto mt-6 max-w-md text-muted-foreground">
          We couldn&rsquo;t find the page you were looking for. Head back to the café and start again.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Button asChild>
            <Link href="/">Back to home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/menu">View menu</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </>
  );
}
