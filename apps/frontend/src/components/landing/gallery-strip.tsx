import { ImageFrame } from '@/components/shared/image-frame';
import { gallery } from '@/content/landing';

export function GalleryStrip() {
  return (
    <section aria-label="Gallery" className="grid grid-cols-2 md:grid-cols-5">
      {gallery.map((brief) => (
        <div key={brief} className="group overflow-hidden">
          <ImageFrame
            alt={brief}
            brief={brief}
            className="h-[280px] w-full transition-transform duration-200 ease-out group-hover:scale-105"
          />
        </div>
      ))}
    </section>
  );
}
