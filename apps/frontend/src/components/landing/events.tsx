import { Button } from '@/components/ui/button';
import { Chip } from '@/components/shared/chip';
import { AmberRule } from '@/components/shared/amber-rule';
import { events } from '@/content/landing';

export function Events() {
  return (
    <section className="section bg-surface text-center">
      <div className="container-page flex flex-col items-center">
        <h2 className="text-4xl font-bold md:text-5xl">{events.title}</h2>
        <AmberRule className="mx-auto" />
        <p className="mt-6 max-w-2xl text-muted-foreground">{events.body}</p>
        <div className="mt-6 flex gap-2">{events.chips.map((c) => <Chip key={c}>{c}</Chip>)}</div>
        <Button className="mt-8">Enquire about events →</Button>
      </div>
    </section>
  );
}
