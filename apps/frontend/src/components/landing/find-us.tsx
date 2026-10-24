import { Button } from '@/components/ui/button';
import { brand } from '@/content/landing';

export function FindUs() {
  return (
    <section id="find-us" className="bg-primary px-6 py-24 text-center text-primary-foreground md:px-12">
      <h2 className="text-4xl font-bold italic md:text-5xl">Come and Say Hello</h2>
      <p className="mt-4 text-primary-foreground/80">{brand.hours}</p>
      <Button asChild variant="cream" className="mt-8">
        <a href={`https://maps.google.com/?q=${encodeURIComponent(brand.address)}`} target="_blank" rel="noreferrer">
          Get directions →
        </a>
      </Button>
    </section>
  );
}
