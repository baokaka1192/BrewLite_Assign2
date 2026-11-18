const DEFAULT_PATH = '/menu';
const AUTH_PATHS = ['/login', '/register'];
const ORIGIN = 'http://localhost';

/**
 * Returns `raw` only if it is a same-origin relative path (e.g. "/checkout?x=1").
 * Anything else (absolute URLs, protocol-relative "//host", backslash tricks,
 * control characters, auth pages) falls back to `fallback`.
 */
export function safeNextPath(raw: string | null | undefined, fallback = DEFAULT_PATH): string {
  if (typeof raw !== 'string' || raw.length === 0) return fallback;
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return fallback;
  if (/[\u0000-\u001f\u007f\\]/.test(raw)) return fallback;
  try {
    const url = new URL(raw, ORIGIN);
    if (url.origin !== ORIGIN) return fallback;
    if (AUTH_PATHS.includes(url.pathname)) return fallback;
  } catch {
    return fallback;
  }
  return raw;
}
