import type { Metadata, Viewport } from 'next';
import './globals.css';
import { MotionProvider } from '@/components/shared/motion-provider';
import { RouteProgress } from '@/components/shared/route-progress';
import { ScrollToTopOnReload } from '@/components/shared/scroll-to-top-on-reload';
import { Toaster } from '@/components/shared/toaster';
import { themeInitScript } from '@/lib/theme';

const siteName = 'BrewLite';
const siteDescription = 'Order and pay for specialty coffee without cash. Pick up at the bar.';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'BrewLite — Specialty coffee, ordered in a few taps',
    template: '%s · BrewLite',
  },
  description: siteDescription,
  applicationName: siteName,
  icons: { icon: '/icon.svg' },
  openGraph: {
    type: 'website',
    siteName,
    title: 'BrewLite — Specialty coffee, ordered in a few taps',
    description: siteDescription,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BrewLite — Specialty coffee, ordered in a few taps',
    description: siteDescription,
  },
};

export const viewport: Viewport = {
  themeColor: '#964F2C',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Sets data-theme before first paint; must precede stylesheets to avoid a flash. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Fonts loaded in App Router root layout apply globally across all pages */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500&display=swap"
        />
      </head>
      <body>
        <ScrollToTopOnReload />
        {/* Wraps every route, including portal-rendered layers (fly-to-cart), so reduced motion applies globally. */}
        <MotionProvider>
          <RouteProgress />
          {children}
          <Toaster />
        </MotionProvider>
      </body>
    </html>
  );
}
