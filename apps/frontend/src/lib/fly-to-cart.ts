export interface Point {
  x: number;
  y: number;
}

export interface FlyToCartRequest {
  /** Centre of the source element in viewport coordinates. */
  from: Point;
  imageUrl?: string;
  alt: string;
}

export interface FlightKeyframes {
  /** Offsets from the start point, in px. */
  x: number[];
  y: number[];
  scale: number[];
  opacity: number[];
  /** Normalised times (0..1) for each keyframe. */
  times: number[];
}

/** Point on a quadratic Bezier curve at parameter t in [0, 1]. */
export function quadraticBezier(p0: Point, p1: Point, p2: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

/**
 * Control point that lifts the path above both endpoints so the thumbnail
 * arcs upward toward the cart instead of cutting straight across the page.
 */
export function arcControlPoint(from: Point, to: Point, minLift = 80): Point {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const lift = Math.max(minLift, distance * 0.25);
  return {
    x: (from.x + to.x) / 2,
    y: Math.min(from.y, to.y) - lift,
  };
}

/** Ease-in-out cubic, used to re-time samples so the thumbnail accelerates into the cart. */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Sampled keyframes for a Motion `animate` call that follows the arc.
 * Only x, y, scale and opacity are produced, so the animation stays on the
 * compositor (transform/opacity only).
 */
export function flightKeyframes(from: Point, to: Point, steps = 16): FlightKeyframes {
  const control = arcControlPoint(from, to);
  const x: number[] = [];
  const y: number[] = [];
  const scale: number[] = [];
  const opacity: number[] = [];
  const times: number[] = [];

  for (let i = 0; i <= steps; i++) {
    const linear = i / steps;
    const t = easeInOutCubic(linear);
    const p = quadraticBezier(from, control, to, t);
    x.push(Math.round((p.x - from.x) * 10) / 10);
    y.push(Math.round((p.y - from.y) * 10) / 10);
    scale.push(Math.round((1 - 0.8 * t) * 1000) / 1000);
    opacity.push(linear > 0.85 ? Math.max(0, Math.round((1 - (linear - 0.85) / 0.15) * 1000) / 1000) : 1);
    times.push(linear);
  }
  return { x, y, scale, opacity, times };
}

type Listener = (request: FlyToCartRequest) => void;
const listeners = new Set<Listener>();

/** Subscribe to fly-to-cart requests. Returns an unsubscribe function. */
export function subscribeFlyToCart(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Announce that a product thumbnail should fly to the cart. */
export function requestFlyToCart(request: FlyToCartRequest): void {
  listeners.forEach((listener) => listener(request));
}
