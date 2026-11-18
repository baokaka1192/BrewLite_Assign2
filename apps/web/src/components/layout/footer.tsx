import Link from 'next/link';
import { brand, navLinks } from '@/content/landing';

export function Footer() {
  return (
    <footer className="bg-primary px-6 pb-8 pt-14 text-primary-foreground md:px-12">
      <div className="container-page grid gap-10 md:grid-cols-12 md:gap-8">
        <div className="md:col-span-5">
          <p className="font-display text-3xl italic text-accent">{brand.name}</p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-primary-foreground/80">
            Small-batch coffee, brewed slowly and served with care.
          </p>
        </div>

        <div className="md:col-span-3">
          <h2 className="text-xs font-medium uppercase tracking-label text-accent">Visit</h2>
          <p className="mt-3 text-sm leading-relaxed text-primary-foreground/80">{brand.address}</p>
          <p className="mt-4 border-t border-primary-foreground/10 pt-4 text-sm leading-relaxed text-primary-foreground/80">
            {brand.hours}
          </p>
        </div>

        <nav aria-label="Footer" className="md:col-span-2">
          <h2 className="text-xs font-medium uppercase tracking-label text-accent">Explore</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {navLinks.map((l) => (
              <li key={l.href}>
                <Link
                  href={`/${l.href}`}
                  className="inline-flex min-h-8 items-center text-primary-foreground/80 transition-[color,transform] duration-200 ease-out hover:translate-x-0.5 hover:text-accent motion-reduce:transform-none motion-reduce:transition-colors"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="md:col-span-2">
          <h2 className="text-xs font-medium uppercase tracking-label text-accent">Order</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/menu" className="inline-flex min-h-8 items-center text-primary-foreground/80 transition-[color,transform] duration-200 ease-out hover:translate-x-0.5 hover:text-accent motion-reduce:transform-none motion-reduce:transition-colors">
                Order ahead
              </Link>
            </li>
            <li>
              <Link href="/login" className="inline-flex min-h-8 items-center text-primary-foreground/80 transition-[color,transform] duration-200 ease-out hover:translate-x-0.5 hover:text-accent motion-reduce:transform-none motion-reduce:transition-colors">
                Log in
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="container-page mt-12 flex flex-col gap-2 border-t border-primary-foreground/10 pt-6 text-xs text-primary-foreground/60 md:flex-row md:justify-between">
        <p>
          © {brand.year} {brand.name}. All rights reserved.
        </p>
        <p>Made with care in Ho Chi Minh City.</p>
      </div>
    </footer>
  );
}
