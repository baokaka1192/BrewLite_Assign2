import Image from 'next/image';
import { cn } from '@/lib/utils';

interface ImageFrameProps {
  /** Path under /public. Leave empty to show a warm placeholder until the photo is added. */
  src?: string;
  alt: string;
  /** Photo direction for whoever sources the image. */
  brief: string;
  className?: string;
}

export function ImageFrame({ src, alt, brief, className }: ImageFrameProps) {
  if (src) {
    return (
      <div className={cn('relative overflow-hidden', className)}>
        <Image src={src} alt={alt} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
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
