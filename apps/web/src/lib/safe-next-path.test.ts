import { describe, expect, it } from 'vitest';
import { safeNextPath } from './safe-next-path';

describe('safeNextPath', () => {
  it('allows same-origin relative paths with query and hash', () => {
    expect(safeNextPath('/checkout')).toBe('/checkout');
    expect(safeNextPath('/orders/12?tab=open#top')).toBe('/orders/12?tab=open#top');
  });

  it('falls back for missing or empty values', () => {
    expect(safeNextPath(undefined)).toBe('/menu');
    expect(safeNextPath(null)).toBe('/menu');
    expect(safeNextPath('')).toBe('/menu');
    expect(safeNextPath(undefined, '/cart')).toBe('/cart');
  });

  it('rejects absolute and protocol-relative URLs', () => {
    expect(safeNextPath('https://evil.com')).toBe('/menu');
    expect(safeNextPath('http://localhost:4000/api')).toBe('/menu');
    expect(safeNextPath('//evil.com')).toBe('/menu');
    expect(safeNextPath('//evil.com/path')).toBe('/menu');
  });

  it('rejects backslash and control-character tricks', () => {
    expect(safeNextPath('/\\evil.com')).toBe('/menu');
    expect(safeNextPath('\\\\evil.com')).toBe('/menu');
    expect(safeNextPath('/\t/evil.com')).toBe('/menu');
    expect(safeNextPath('/%0d%0aSet-Cookie')).toBe('/%0d%0aSet-Cookie');
  });

  it('rejects paths that do not start with a slash', () => {
    expect(safeNextPath('menu')).toBe('/menu');
    expect(safeNextPath('javascript:alert(1)')).toBe('/menu');
  });

  it('never redirects back into the auth pages', () => {
    expect(safeNextPath('/login?next=/cart')).toBe('/menu');
    expect(safeNextPath('/register')).toBe('/menu');
  });
});
