import { describe, expect, it } from 'vitest';
import { staggerDelay } from './motion';

describe('staggerDelay', () => {
  it('starts the first item immediately', () => {
    expect(staggerDelay(0)).toBe(0);
  });

  it('grows linearly by the step', () => {
    expect(staggerDelay(3)).toBeCloseTo(0.15);
    expect(staggerDelay(2, 0.1)).toBeCloseTo(0.2);
  });

  it('caps the delay at the maximum', () => {
    expect(staggerDelay(100)).toBe(0.4);
    expect(staggerDelay(100, 0.05, 0.2)).toBe(0.2);
  });

  it('treats negative indexes as zero', () => {
    expect(staggerDelay(-1)).toBe(0);
  });
});
