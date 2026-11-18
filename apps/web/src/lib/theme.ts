export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'brewlite-theme';
export const THEME_ATTRIBUTE = 'data-theme';

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}

/** Returns the saved theme, or null when none is saved or storage is unavailable (private mode, disabled). */
export function readStoredTheme(storage: Pick<Storage, 'getItem'> | null = browserStorage()): Theme | null {
  try {
    const value = storage?.getItem(THEME_STORAGE_KEY);
    return isTheme(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeStoredTheme(theme: Theme, storage: Pick<Storage, 'setItem'> | null = browserStorage()): void {
  try {
    storage?.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage may be full or blocked; the theme still applies for this page view.
  }
}

/** A saved choice wins; otherwise the default is always light, regardless of the OS color scheme. */
export function resolveTheme(stored: Theme | null): Theme {
  return stored ?? 'light';
}

export function applyTheme(theme: Theme, root: Pick<HTMLElement, 'setAttribute'> = document.documentElement): void {
  root.setAttribute(THEME_ATTRIBUTE, theme);
}

export function currentTheme(root: Pick<HTMLElement, 'getAttribute'> = document.documentElement): Theme {
  return root.getAttribute(THEME_ATTRIBUTE) === 'dark' ? 'dark' : 'light';
}

/**
 * Blocking script for <head> that sets data-theme before first paint, avoiding a light flash.
 * It must stay self-contained (no imports); it mirrors readStoredTheme/resolveTheme/applyTheme.
 */
export const themeInitScript = `(function(){try{var r=document.documentElement,t=null;try{t=localStorage.getItem("${THEME_STORAGE_KEY}")}catch(e){}if(t!=="light"&&t!=="dark"){t="light"}r.setAttribute("${THEME_ATTRIBUTE}",t)}catch(e){}})();`;

function browserStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}
