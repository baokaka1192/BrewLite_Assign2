import { Button } from '@/components/ui/button';
import { Chip } from '@/components/shared/chip';
import { ImageFrame } from '@/components/shared/image-frame';
import { Reveal } from '@/components/shared/reveal';
import { ourCoffee } from '@/content/landing';
import { staggerDelay } from '@/lib/motion';

export function OurCoffee() {
  return (
    <section id="coffee" className="section">
      <div className="container-page grid items-center gap-14 md:grid-cols-2 md:gap-20">
        <Reveal>
          <p className="label text-primary">Our Coffee</p>
          <h2 className="mt-3 text-4xl font-bold leading-[1.08] tracking-[-0.02em] md:text-5xl">{ourCoffee.title}</h2>
          <blockquote className="mt-6 border-l-2 border-accent pl-5 font-display text-2xl italic leading-snug text-primary">
            &ldquo;{ourCoffee.quote}&rdquo;
          </blockquote>
          <div className="mt-6 max-w-prose space-y-4 leading-relaxed text-muted-foreground">
            {ourCoffee.paragraphs.map((p, i) => (
              <Reveal key={p} delay={staggerDelay(i)}><p>{p}</p></Reveal>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {ourCoffee.chips.map((c, i) => (
              <Reveal key={c} delay={staggerDelay(i)}><Chip>{c}</Chip></Reveal>
            ))}
          </div>
          <Reveal delay={0.2}>
            <Button asChild variant="outline" className="mt-8">
              <a href="/menu">Shop our beans →</a>
            </Button>
          </Reveal>
        </Reveal>

        {/* Overlapping collage: tall portrait back, landscape front */}
        <Reveal delay={0.1} className="relative mx-auto w-full max-w-md pb-12 pr-6 md:max-w-none">
          <ImageFrame
            src={ourCoffee.srcs[0]}
            alt={ourCoffee.alts[0]}
            brief={ourCoffee.briefs[0]}
            sizes="(min-width: 768px) 30vw, 70vw"
            className="aspect-[3/4] w-[78%] rounded-2xl shadow-warm transition-transform duration-500 ease-out hover:-rotate-2"
          />
          <ImageFrame
            src={ourCoffee.srcs[1]}
            alt={ourCoffee.alts[1]}
            brief={ourCoffee.briefs[1]}
            sizes="(min-width: 768px) 28vw, 62vw"
            className="absolute bottom-0 right-0 aspect-[4/3] w-[64%] rounded-2xl border-4 border-background shadow-lift transition-transform duration-500 ease-out hover:rotate-2"
          />
        </Reveal>
      </div>
    </section>
  );
}
