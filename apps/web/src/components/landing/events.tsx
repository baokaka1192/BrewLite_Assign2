import { Button } from '@/components/ui/button';
import { Chip } from '@/components/shared/chip';
import { AmberRule } from '@/components/shared/amber-rule';
import { Reveal } from '@/components/shared/reveal';
import { events } from '@/content/landing';
import { staggerDelay } from '@/lib/motion';

export function Events() {
  return (
    <section className="section bg-surface text-center">
      <div className="container-page flex flex-col items-center">
        <Reveal>
          <h2 className="text-4xl font-bold md:text-5xl">{events.title}</h2>
          <AmberRule className="mx-auto" />
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-6 max-w-2xl text-muted-foreground">{events.body}</p>
        </Reveal>
        <div className="mt-6 flex gap-2">
          {events.chips.map((c, i) => (
            <Reveal key={c} delay={0.2 + staggerDelay(i)}><Chip>{c}</Chip></Reveal>
          ))}
        </div>
        <Reveal delay={0.3}>
          <Button className="mt-8">Enquire about events →</Button>
        </Reveal>
      </div>
    </section>
  );
}
