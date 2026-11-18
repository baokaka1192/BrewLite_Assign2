import { Star } from 'lucide-react';
import { Reveal } from '@/components/shared/reveal';
import { testimonials } from '@/content/landing';

export function Testimonials() {
  return (
    <section className="section bg-surface">
      <div className="container-page grid gap-6 md:grid-cols-3">
        {testimonials.map((t, i) => (
          <Reveal key={t.name} delay={i * 0.1}>
            <figure className="h-full border border-border bg-background p-6">
              <div className="flex gap-1 text-accent" aria-label="5 out of 5 stars">
                {Array.from({ length: 5 }).map((_, k) => <Star key={k} className="h-4 w-4 fill-current" aria-hidden />)}
              </div>
              <blockquote className="mt-4 font-display text-lg italic">&ldquo;{t.quote}&rdquo;</blockquote>
              <figcaption className="mt-4 text-[10px] text-muted-foreground">
                {t.name} · {t.visit}
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
