'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Coffee, Menu, X } from 'lucide-react';
import { AuthNav } from '@/components/auth/auth-nav';
import { CartLink } from '@/components/cart/cart-link';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { Button } from '@/components/ui/button';
import { useScrolled } from '@/hooks/use-scrolled';
import { brand, navLinks } from '@/content/landing';
import { cn } from '@/lib/utils';

/** Desktop link; its amber underline is a shared layoutId indicator rendered on hover/focus. */
const navLinkClass =
  'relative inline-flex min-h-11 items-center py-2 text-sm transition-colors duration-200 hover:text-accent-text focus-visible:text-accent-text';

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [indicator, setIndicator] = useState<string | null>(null);
  const scrolled = useScrolled(8);
  const pathname = usePathname();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const reduce = useReducedMotion();

  // Close the mobile menu when the route changes.
  useEffect(() => setOpen(false), [pathname]);

  // Escape closes the mobile menu and returns focus to its toggle.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-[10px] transition-[box-shadow,background-color,backdrop-filter] duration-300 ease-out motion-reduce:transition-none',
        scrolled && 'bg-background/95 shadow-[0_8px_24px_-12px_hsl(var(--shadow-nav))] backdrop-blur-[16px]',
      )}
    >
      <div className="flex h-16 items-center">
      <nav
        className={cn(
          'container-page flex w-full items-center justify-between px-6 transition-[height] duration-300 ease-out motion-reduce:transition-none md:px-0',
          scrolled ? 'h-14' : 'h-16',
        )}
        aria-label="Main"
      >
        <Link href="/#top" className="flex items-center gap-2">
          <Coffee className="h-4 w-4 text-accent-text" aria-hidden />
          <span className="font-display text-xl italic text-primary">{brand.name}</span>
        </Link>

        <ul className="hidden items-center gap-8 md:flex">
          {navLinks.map((l) => (
            <li key={l.href}>
              <Link
                href={`/${l.href}`}
                className={navLinkClass}
                onMouseEnter={() => setIndicator(l.href)}
                onMouseLeave={() => setIndicator(null)}
                onFocus={() => setIndicator(l.href)}
                onBlur={() => setIndicator(null)}
              >
                {l.label}
                {indicator === l.href && (
                  <motion.span
                    layoutId="nav-underline"
                    aria-hidden
                    className="absolute bottom-1 left-0 h-px w-full bg-accent"
                    transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}
              </Link>
            </li>
          ))}
          <li>
            <ThemeToggle />
          </li>
          <li>
            <CartLink />
          </li>
          <li>
            <AuthNav />
          </li>
          <li>
            <Button asChild size="sm">
              <a href="/menu">Order ahead →</a>
            </Button>
          </li>
        </ul>

        <button
          ref={toggleRef}
          type="button"
          aria-controls="mobile-menu"
          className="-mr-2 inline-flex h-11 w-11 items-center justify-center md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </nav>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id="mobile-menu"
            key="mobile-menu"
            className="overflow-hidden border-t border-border bg-background md:hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.25, ease: 'easeOut' }}
          >
            <ul className="flex flex-col gap-1 px-6 py-4">
              {navLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={`/${l.href}`}
                    onClick={() => setOpen(false)}
                    className="flex min-h-11 w-full items-center border-b border-border/60 text-base"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <ThemeToggle />
              </li>
              <li>
                <CartLink onNavigate={() => setOpen(false)} />
              </li>
              <li className="py-2">
                <AuthNav onNavigate={() => setOpen(false)} />
              </li>
              <li className="pt-2">
                <Button asChild className="w-full">
                  <a href="/menu">Order ahead →</a>
                </Button>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
