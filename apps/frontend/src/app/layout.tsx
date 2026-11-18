import type { Metadata } from 'next';
import './globals.css';
import { MotionProvider } from '@/components/shared/motion-provider';
import { ScrollToTopOnReload } from '@/components/shared/scroll-to-top-on-reload';

export const metadata: Metadata = {
  title: 'BrewLite — Specialty coffee, ordered in a few taps',
  description: 'Order and pay for specialty coffee without cash. Pick up at the bar.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500&display=swap"
        />
      </head>
      <body>
        <ScrollToTopOnReload />
        {/* Wraps every route, including portal-rendered layers (fly-to-cart), so reduced motion applies globally. */}
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
