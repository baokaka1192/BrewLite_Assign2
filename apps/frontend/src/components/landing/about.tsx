import { Chip } from '@/components/shared/chip';
import { ImageFrame } from '@/components/shared/image-frame';
import { Reveal } from '@/components/shared/reveal';
import { about } from '@/content/landing';

export function About() {
  return (
    <section id="about" className="section bg-surface">
      <div className="container-page grid items-center gap-12 md:grid-cols-2">
        <Reveal>
          <h2 className="text-4xl font-bold md:text-5xl">{about.title}</h2>
          <div className="mt-6 max-w-prose space-y-4 text-muted-foreground">
            {about.paragraphs.map((p) => <p key={p}>{p}</p>)}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {about.chips.map((c) => <Chip key={c} tone="amber">{c}</Chip>)}
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <ImageFrame alt="Founder behind the bar" brief={about.brief} className="aspect-[4/5] w-full" />
        </Reveal>
      </div>
    </section>
  );
}
