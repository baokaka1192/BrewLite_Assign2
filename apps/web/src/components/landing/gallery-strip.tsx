import { ImageFrame } from '@/components/shared/image-frame';
import { gallery } from '@/content/landing';

// Mosaic spans: the first tile is the large feature, the rest fill around it.
const spans = [
  'md:col-span-2 md:row-span-2',
  '',
  '',
  '',
  '',
];

export function GalleryStrip() {
  return (
    <section aria-label="Gallery" className="bg-background px-3 pb-20 md:px-6">
      <ul className="mx-auto grid max-w-6xl auto-rows-[200px] grid-cols-2 gap-3 md:auto-rows-[220px] md:grid-cols-4 md:gap-4">
        {gallery.map((g, i) => (
          <li key={g.src} className={spans[i] ?? ''}>
            <figure
              tabIndex={0}
              className="group relative h-full w-full overflow-hidden rounded-2xl bg-surface shadow-warm transition-transform duration-300 ease-out motion-safe:hover:-translate-y-1 motion-safe:focus-visible:-translate-y-1 focus-visible:outline-offset-4"
            >
              <div className="h-full w-full transition-transform duration-500 ease-out group-hover:scale-105 group-focus-visible:scale-105">
                <ImageFrame
                  src={g.src}
                  alt={g.alt}
                  brief={g.brief}
                  sizes="(min-width: 768px) 25vw, 50vw"
                  className="h-full w-full"
                />
              </div>
              <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/85 via-foreground/40 to-transparent px-4 pb-3 pt-12 text-sm text-background opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 max-md:opacity-100">
                {g.brief}
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}
