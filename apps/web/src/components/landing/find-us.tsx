import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/shared/reveal';
import { brand } from '@/content/landing';

export function FindUs() {
  return (
    <section id="find-us" className="bg-primary px-6 py-24 text-center text-primary-foreground md:px-12">
      <Reveal>
        <h2 className="text-4xl font-bold italic md:text-5xl">Come and Say Hello</h2>
      </Reveal>
      <Reveal delay={0.1}>
        <p className="mt-4 text-primary-foreground/80">{brand.hours}</p>
      </Reveal>
      <Reveal delay={0.2}>
        <Button asChild variant="cream" className="mt-8">
          <a href={`https://maps.google.com/?q=${encodeURIComponent(brand.address)}`} target="_blank" rel="noreferrer">
            Get directions →
          </a>
        </Button>
      </Reveal>
    </section>
  );
}
