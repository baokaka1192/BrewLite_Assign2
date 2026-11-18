import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useToastStore } from './toast';

const messages = () => useToastStore.getState().toasts.map((t) => t.message);

beforeEach(() => {
  vi.useFakeTimers();
  useToastStore.setState({ toasts: [] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('toast store', () => {
  it('adds toasts with unique ids in order', () => {
    const a = useToastStore.getState().show('Một');
    const b = useToastStore.getState().show('Hai');
    expect(a).not.toBe(b);
    expect(messages()).toEqual(['Một', 'Hai']);
  });

  it('auto-dismisses after the default duration', () => {
    useToastStore.getState().show('Đã thêm vào giỏ');
    vi.advanceTimersByTime(3199);
    expect(messages()).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(messages()).toHaveLength(0);
  });

  it('respects a custom duration', () => {
    useToastStore.getState().show('Nhanh', 500);
    vi.advanceTimersByTime(500);
    expect(messages()).toHaveLength(0);
  });

  it('stores an optional action with the toast', () => {
    useToastStore.getState().show('Added', 10000, { label: 'View cart', href: '/cart' });
    useToastStore.getState().show('Plain', 10000);
    const [withAction, plain] = useToastStore.getState().toasts;
    expect(withAction.action).toEqual({ label: 'View cart', href: '/cart' });
    expect(plain.action).toBeUndefined();
  });

  it('dismiss removes only the given toast and is safe to repeat', () => {
    const a = useToastStore.getState().show('A', 10000);
    useToastStore.getState().show('B', 10000);
    useToastStore.getState().dismiss(a);
    useToastStore.getState().dismiss(a);
    expect(messages()).toEqual(['B']);
  });
});
