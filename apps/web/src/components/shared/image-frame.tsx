import Image from 'next/image';
import { cn } from '@/lib/utils';

interface ImageFrameProps {
  /** Path under /public. Leave empty to show a warm placeholder until the photo is added. */
  src?: string;
  alt: string;
  /** Photo direction for whoever sources the image. */
  brief: string;
  className?: string;
  /** Tailwind object-position class, e.g. "object-[50%_30%]". Defaults to centred. */
  position?: string;
  priority?: boolean;
  sizes?: string;
}

export function ImageFrame({
  src,
  alt,
  brief,
  className,
  position = 'object-center',
  priority,
  sizes = '(min-width: 768px) 50vw, 100vw',
}: ImageFrameProps) {
  if (src) {
    return (
      <div className={cn('relative overflow-hidden bg-surface', className)}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          placeholder="empty"
          className={cn('object-cover', position)}
        />
      </div>
    );
  }
  return (
    <div
      role="img"
      aria-label={alt}
      className={cn(
        'flex items-end bg-gradient-to-br from-accent/40 via-surface to-primary/30 p-4',
        className,
      )}
    >
      <p className="max-w-xs text-xs italic text-primary/70">Photo: {brief}</p>
    </div>
  );
}
