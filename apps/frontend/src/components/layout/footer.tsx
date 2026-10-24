import { brand } from '@/content/landing';

export function Footer() {
  return (
    <footer className="bg-primary px-6 py-12 text-center text-primary-foreground md:px-12">
      <p className="font-display text-2xl italic text-accent">{brand.name}</p>
      <p className="mt-3 text-xs text-primary-foreground/70">
        © {brand.year} {brand.name} · {brand.address}
      </p>
    </footer>
  );
}
