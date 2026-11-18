import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Hero } from '@/components/landing/hero';
import { MenuHighlights } from '@/components/landing/menu-highlights';
import { BrewMethods } from '@/components/landing/brew-methods';
import { OurCoffee } from '@/components/landing/our-coffee';
import { About } from '@/components/landing/about';
import { GalleryStrip } from '@/components/landing/gallery-strip';
import { Events } from '@/components/landing/events';
import { Testimonials } from '@/components/landing/testimonials';
import { FindUs } from '@/components/landing/find-us';

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <MenuHighlights />
        <BrewMethods />
        <OurCoffee />
        <About />
        <GalleryStrip />
        <Events />
        <Testimonials />
        <FindUs />
      </main>
      <Footer />
    </>
  );
}
