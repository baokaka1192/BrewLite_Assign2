'use client';
import Image from 'next/image';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import { ImageFrame } from '@/components/shared/image-frame';

interface ProductDetailGalleryProps {
  name: string;
  imageUrl: string;
  soldOut: boolean;
}

const TILT_DEG = 5;
const PARALLAX_PX = 8;

/**
 * Large product image with a subtle pointer-driven tilt and parallax, plus a CSS hover zoom.
 * Reduced motion and touch input get a static image (zoom is gated with motion-safe).
 */
export function ProductDetailGallery({ name, imageUrl, soldOut }: ProductDetailGalleryProps) {
  const reduce = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const x = useSpring(pointerX, { stiffness: 200, damping: 25 });
  const y = useSpring(pointerY, { stiffness: 200, damping: 25 });
  const rotateY = useTransform(x, [-0.5, 0.5], [-TILT_DEG, TILT_DEG]);
  const rotateX = useTransform(y, [-0.5, 0.5], [TILT_DEG, -TILT_DEG]);
  const shiftX = useTransform(x, [-0.5, 0.5], [PARALLAX_PX, -PARALLAX_PX]);
  const shiftY = useTransform(y, [-0.5, 0.5], [PARALLAX_PX, -PARALLAX_PX]);

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (reduce || e.pointerType !== 'mouse') return;
    const rect = e.currentTarget.getBoundingClientRect();
    pointerX.set((e.clientX - rect.left) / rect.width - 0.5);
    pointerY.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  function resetPointer() {
    pointerX.set(0);
    pointerY.set(0);
  }

  const media = imageUrl ? (
    <Image
      src={imageUrl}
      alt={name}
      fill
      priority
      sizes="(min-width: 768px) 55vw, 100vw"
      className={`object-cover motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out motion-safe:group-hover:scale-105 ${soldOut ? 'grayscale' : ''}`}
    />
  ) : (
    <ImageFrame alt={name} brief={name} className="h-full w-full" />
  );

  return (
    <div className="[perspective:1200px] md:sticky md:top-24 md:self-start">
      <motion.div
        onPointerMove={handlePointerMove}
        onPointerLeave={resetPointer}
        style={reduce ? undefined : { rotateX, rotateY }}
        className="group relative aspect-[4/5] overflow-hidden rounded-lg border border-border shadow-sm transition-shadow duration-300 hover:shadow-[0_18px_40px_-16px_hsl(var(--shadow-card-hover))]"
      >
        <motion.div
          className="absolute inset-[-12px]"
          style={reduce ? undefined : { x: shiftX, y: shiftY }}
        >
          {media}
        </motion.div>
      </motion.div>
    </div>
  );
}
