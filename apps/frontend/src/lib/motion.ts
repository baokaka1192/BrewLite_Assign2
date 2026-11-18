/** Delay (seconds) for the Nth item of a staggered entrance, capped so long lists still settle quickly. */
export function staggerDelay(index: number, step = 0.05, max = 0.4): number {
  return Math.min(Math.max(index, 0) * step, max);
}
