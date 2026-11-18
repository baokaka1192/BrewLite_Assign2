'use client';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { flightKeyframes, subscribeFlyToCart, type FlightKeyframes, type FlyToCartRequest } from '@/lib/fly-to-cart';

const THUMB = 56;
const FLIGHT_MS = 800;

interface Flight extends FlyToCartRequest {
  id: number;
  to: { x: number; y: number };
  frames: FlightKeyframes;
}

let nextId = 0;

/** Visible navbar cart target (desktop bar or open mobile menu). */
function findVisibleCartTarget(): HTMLElement | null {
  const candidates = document.querySelectorAll<HTMLElement>('[data-cart-target]');
  for (const el of candidates) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

/**
 * Renders the flying product thumbnail in a portal on document.body. Skips the
 * flight when reduced motion is requested or no cart icon is visible (e.g. the
 * mobile menu is closed); the caller's toast and badge still give feedback.
 */
export function FlyToCartLayer() {
  const [flights, setFlights] = useState<Flight[]>([]);

  useEffect(() => {
    return subscribeFlyToCart((request) => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const target = findVisibleCartTarget();
      if (!target) return;
      const r = target.getBoundingClientRect();
      const to = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      const id = ++nextId;
      const frames = flightKeyframes(request.from, to);
      setFlights((prev) => [...prev, { ...request, id, to, frames }]);
    });
  }, []);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {flights.map((f) => (
        <motion.div
          key={f.id}
          aria-hidden
          className="pointer-events-none fixed z-[60] overflow-hidden rounded-full border-2 border-background bg-surface shadow-lg"
          style={{
            left: f.from.x - THUMB / 2,
            top: f.from.y - THUMB / 2,
            width: THUMB,
            height: THUMB,
          }}
          initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
          animate={{ x: f.frames.x, y: f.frames.y, scale: f.frames.scale, opacity: f.frames.opacity }}
          transition={{ duration: FLIGHT_MS / 1000, ease: 'linear', times: f.frames.times }}
          onAnimationComplete={() => setFlights((prev) => prev.filter((x) => x.id !== f.id))}
        >
          {f.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={f.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="block h-full w-full bg-accent" />
          )}
        </motion.div>
      ))}
    </AnimatePresence>,
    document.body,
  );
}
