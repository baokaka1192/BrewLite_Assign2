import { describe, expect, it } from 'vitest';
import {
  THEME_STORAGE_KEY,
  applyTheme,
  currentTheme,
  isTheme,
  readStoredTheme,
  resolveTheme,
  themeInitScript,
  writeStoredTheme,
} from './theme';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    data,
  };
}

function fakeRoot() {
  const attrs = new Map<string, string>();
  return {
    setAttribute: (name: string, value: string) => void attrs.set(name, value),
    getAttribute: (name: string) => attrs.get(name) ?? null,
  };
}

/** Runs the inline head script against fake globals and returns the resulting data-theme. */
function runInitScript(opts: { stored?: string; prefersDark: boolean; throwOnRead?: boolean }) {
  const root = fakeRoot();
  const storage = {
    getItem: () => {
      if (opts.throwOnRead) throw new Error('denied');
      return opts.stored ?? null;
    },
  };
  const fakeWindow = { matchMedia: () => ({ matches: opts.prefersDark }) };
  new Function('document', 'window', 'localStorage', themeInitScript)(
    { documentElement: root },
    fakeWindow,
    storage,
  );
  return root.getAttribute('data-theme');
}

describe('isTheme', () => {
  it('accepts only light and dark', () => {
    expect(isTheme('light')).toBe(true);
    expect(isTheme('dark')).toBe(true);
    expect(isTheme('system')).toBe(false);
    expect(isTheme(null)).toBe(false);
  });
});

describe('readStoredTheme / writeStoredTheme', () => {
  it('round-trips under the brewlite-theme key', () => {
    const storage = memoryStorage();
    writeStoredTheme('dark', storage);
    expect(storage.data.get('brewlite-theme')).toBe('dark');
    expect(readStoredTheme(storage)).toBe('dark');
    expect(THEME_STORAGE_KEY).toBe('brewlite-theme');
  });

  it('ignores invalid stored values', () => {
    expect(readStoredTheme(memoryStorage({ 'brewlite-theme': 'purple' }))).toBeNull();
  });

  it('returns null and never throws when storage is unavailable', () => {
    const throwing = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(readStoredTheme(throwing)).toBeNull();
    expect(() => writeStoredTheme('light', throwing)).not.toThrow();
    expect(readStoredTheme(null)).toBeNull();
  });
});

describe('resolveTheme', () => {
  it('returns the saved choice when present', () => {
    expect(resolveTheme('light')).toBe('light');
    expect(resolveTheme('dark')).toBe('dark');
  });

  it('defaults to light on first visit regardless of the OS setting', () => {
    expect(resolveTheme(null)).toBe('light');
  });
});

describe('applyTheme / currentTheme', () => {
  it('sets and reads data-theme on the root element', () => {
    const root = fakeRoot();
    expect(currentTheme(root)).toBe('light');
    applyTheme('dark', root);
    expect(root.getAttribute('data-theme')).toBe('dark');
    expect(currentTheme(root)).toBe('dark');
  });
});

describe('themeInitScript', () => {
  it('uses the saved theme when valid', () => {
    expect(runInitScript({ stored: 'dark', prefersDark: false })).toBe('dark');
    expect(runInitScript({ stored: 'light', prefersDark: true })).toBe('light');
  });

  it('defaults to light when nothing valid is saved, ignoring prefers-color-scheme', () => {
    expect(runInitScript({ prefersDark: true })).toBe('light');
    expect(runInitScript({ stored: 'bogus', prefersDark: true })).toBe('light');
    expect(runInitScript({ prefersDark: false })).toBe('light');
  });

  it('defaults to light when storage throws', () => {
    expect(runInitScript({ throwOnRead: true, prefersDark: true })).toBe('light');
  });
});
