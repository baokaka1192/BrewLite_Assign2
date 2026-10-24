import { Suspense } from 'react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { MenuView } from '@/components/menu/menu-view';
import { MenuSkeleton } from '@/components/menu/menu-skeleton';
import { AmberRule } from '@/components/shared/amber-rule';

export default function MenuPage() {
  return (
    <>
      <Navbar />
      <main className="section container-page">
        <h1 className="text-4xl font-bold md:text-5xl">Menu</h1>
        <AmberRule />
        <Suspense fallback={<MenuSkeleton />}>
          <MenuView />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
