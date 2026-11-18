import { ImageFrame } from '@/components/shared/image-frame';
import { gallery } from '@/content/landing';

export function GalleryStrip() {
  return (
    <section aria-label="Gallery" className="grid grid-cols-2 md:grid-cols-5">
      {gallery.map((item) => (
        <div key={item.src} className="group overflow-hidden">
          <ImageFrame
            src={item.src}
            alt={item.alt}
            brief={item.brief}
            className="h-[280px] w-full transition-transform duration-200 ease-out group-hover:scale-105"
          />
        </div>
      ))}
    </section>
  );
}
