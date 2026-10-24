import { Button } from '@/components/ui/button';
import { Chip } from '@/components/shared/chip';
import { ImageFrame } from '@/components/shared/image-frame';
import { Reveal } from '@/components/shared/reveal';
import { ourCoffee } from '@/content/landing';

export function OurCoffee() {
  return (
    <section id="coffee" className="section">
      <div className="container-page grid items-center gap-12 md:grid-cols-2">
        <Reveal>
          <h2 className="text-4xl font-bold md:text-5xl">{ourCoffee.title}</h2>
          <blockquote className="mt-6 font-display text-2xl italic text-primary">
            &ldquo;{ourCoffee.quote}&rdquo;
          </blockquote>
          <div className="mt-6 max-w-prose space-y-4 text-muted-foreground">
            {ourCoffee.paragraphs.map((p) => <p key={p}>{p}</p>)}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {ourCoffee.chips.map((c) => <Chip key={c}>{c}</Chip>)}
          </div>
          <Button asChild variant="outline" className="mt-8">
            <a href="/menu">Shop our beans →</a>
          </Button>
        </Reveal>
        <Reveal delay={0.1} className="grid grid-cols-2 gap-4">
          <ImageFrame alt="Coffee beans from a sack" brief={ourCoffee.briefs[0]} className="aspect-[3/4] w-full" />
          <ImageFrame alt="Roasted beans" brief={ourCoffee.briefs[1]} className="mt-10 aspect-[3/4] w-full" />
        </Reveal>
      </div>
    </section>
  );
}
