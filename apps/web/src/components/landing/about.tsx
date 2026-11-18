import { Chip } from '@/components/shared/chip';
import { ImageFrame } from '@/components/shared/image-frame';
import { Reveal } from '@/components/shared/reveal';
import { about } from '@/content/landing';
import { staggerDelay } from '@/lib/motion';

export function About() {
  return (
    <section id="about" className="section relative overflow-hidden bg-surface">
      <div className="container-page grid items-center gap-14 md:grid-cols-2 md:gap-20">
        <Reveal>
          <p className="label text-primary">About</p>
          <h2 className="mt-3 text-4xl font-bold leading-[1.08] tracking-[-0.02em] md:text-5xl">{about.title}</h2>
          <div className="mt-6 max-w-prose space-y-4 leading-relaxed text-muted-foreground">
            {about.paragraphs.map((p, i) => (
              <Reveal key={p} delay={staggerDelay(i)}><p>{p}</p></Reveal>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {about.chips.map((c, i) => (
              <Reveal key={c} delay={staggerDelay(i)}><Chip tone="amber">{c}</Chip></Reveal>
            ))}
          </div>
        </Reveal>
        <Reveal delay={0.1} className="relative mx-auto w-full max-w-md md:max-w-none">
          {/* Decorative amber outline, offset behind the photo */}
          <div
            aria-hidden
            className="absolute -left-4 -top-4 h-full w-full rounded-[28px] border-2 border-accent/60 md:-left-6 md:-top-6"
          />
          <ImageFrame
            src={about.src}
            alt={about.alt}
            brief={about.brief}
            sizes="(min-width: 768px) 40vw, 90vw"
            position="object-[50%_30%]"
            className="relative aspect-[4/5] w-full rounded-[28px] shadow-warm"
          />
          <figcaption className="absolute -bottom-5 right-4 rounded-full bg-primary px-5 py-2 text-xs font-medium tracking-wide text-primary-foreground shadow-lift md:right-8">
            Jamie &amp; the team · since 2019
          </figcaption>
        </Reveal>
      </div>
    </section>
  );
}
