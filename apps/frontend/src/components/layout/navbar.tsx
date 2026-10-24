'use client';
import { useState } from 'react';
import { Coffee, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { brand, navLinks } from '@/content/landing';

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-[10px]">
      <nav className="container-page flex h-16 items-center justify-between px-6 md:px-0" aria-label="Main">
        <a href="#top" className="flex items-center gap-2">
          <Coffee className="h-4 w-4 text-accent" aria-hidden />
          <span className="font-display text-xl italic text-primary">{brand.name}</span>
        </a>

        <ul className="hidden items-center gap-8 md:flex">
          {navLinks.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="text-sm transition-colors duration-200 hover:text-accent">
                {l.label}
              </a>
            </li>
          ))}
          <li>
            <Button asChild size="sm">
              <a href="/menu">Order ahead →</a>
            </Button>
          </li>
        </ul>

        <button
          className="md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </nav>

      {open && (
        <ul className="flex flex-col gap-4 border-t border-border px-6 py-6 md:hidden">
          {navLinks.map((l) => (
            <li key={l.href}>
              <a href={l.href} onClick={() => setOpen(false)}>{l.label}</a>
            </li>
          ))}
          <li>
            <Button asChild className="w-full">
              <a href="/menu">Order ahead →</a>
            </Button>
          </li>
        </ul>
      )}
    </header>
  );
}
