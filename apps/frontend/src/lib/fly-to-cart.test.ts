import { describe, expect, it, vi } from 'vitest';
import {
  arcControlPoint,
  easeInOutCubic,
  flightKeyframes,
  quadraticBezier,
  requestFlyToCart,
  subscribeFlyToCart,
} from './fly-to-cart';

describe('quadraticBezier', () => {
  const p0 = { x: 0, y: 0 };
  const p1 = { x: 50, y: -100 };
  const p2 = { x: 100, y: 0 };

  it('starts and ends on the endpoints', () => {
    expect(quadraticBezier(p0, p1, p2, 0)).toEqual(p0);
    expect(quadraticBezier(p0, p1, p2, 1)).toEqual(p2);
  });

  it('passes through the midpoint at t = 0.5 (curve apex is halfway up the control)', () => {
    expect(quadraticBezier(p0, p1, p2, 0.5)).toEqual({ x: 50, y: -50 });
  });
});

describe('arcControlPoint', () => {
  it('sits above both endpoints by at least the minimum lift', () => {
    const c = arcControlPoint({ x: 0, y: 500 }, { x: 100, y: 40 }, 80);
    expect(c.x).toBe(50);
    expect(c.y).toBeLessThanOrEqual(40 - 80);
  });

  it('lifts more for long flights', () => {
    const c = arcControlPoint({ x: 0, y: 1000 }, { x: 0, y: 0 }, 80);
    expect(c.y).toBe(0 - 250);
  });
});

describe('easeInOutCubic', () => {
  it('is 0 at start, 1 at end, 0.5 at the middle', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5);
  });
});

describe('flightKeyframes', () => {
  const from = { x: 300, y: 600 };
  const to = { x: 1100, y: 40 };
  const frames = flightKeyframes(from, to, 10);

  it('returns one entry per step plus the start frame', () => {
    expect(frames.x).toHaveLength(11);
    expect(frames.y).toHaveLength(11);
    expect(frames.scale).toHaveLength(11);
    expect(frames.opacity).toHaveLength(11);
    expect(frames.times).toHaveLength(11);
  });

  it('starts at the origin offset and ends at the target offset', () => {
    expect(frames.x[0]).toBe(0);
    expect(frames.y[0]).toBe(0);
    expect(frames.x[10]).toBeCloseTo(to.x - from.x, 1);
    expect(frames.y[10]).toBeCloseTo(to.y - from.y, 1);
  });

  it('shrinks and fades toward the end, and is fully visible at the start', () => {
    expect(frames.scale[0]).toBe(1);
    expect(frames.scale[10]).toBeCloseTo(0.2, 2);
    expect(frames.opacity[0]).toBe(1);
    expect(frames.opacity[10]).toBe(0);
  });

  it('keeps times monotonically increasing between 0 and 1', () => {
    expect(frames.times[0]).toBe(0);
    expect(frames.times[10]).toBe(1);
    for (let i = 1; i < frames.times.length; i++) {
      expect(frames.times[i]).toBeGreaterThan(frames.times[i - 1]);
    }
  });
});

describe('fly-to-cart event helper', () => {
  it('delivers requests to subscribers until unsubscribed', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeFlyToCart(listener);
    const req = { from: { x: 1, y: 2 }, alt: 'Latte' };

    requestFlyToCart(req);
    expect(listener).toHaveBeenCalledWith(req);

    unsubscribe();
    requestFlyToCart(req);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
