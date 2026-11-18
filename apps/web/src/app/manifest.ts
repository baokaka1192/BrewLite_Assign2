import type { MetadataRoute } from 'next';

// Minimal web app manifest so browsers can offer "install". No service worker yet, so there is no offline mode.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BrewLite',
    short_name: 'BrewLite',
    description: 'Order and pay for specialty coffee without cash. Pick up at the bar.',
    start_url: '/menu',
    scope: '/',
    display: 'standalone',
    background_color: '#FCFAF6',
    theme_color: '#964F2C',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
