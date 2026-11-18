import { create } from 'zustand';

export interface ToastAction {
  label: string;
  href: string;
}

export interface Toast {
  id: number;
  message: string;
  action?: ToastAction;
}

interface ToastState {
  toasts: Toast[];
  /** Shows a toast and schedules its auto-dismiss. Returns the toast id. */
  show: (message: string, durationMs?: number, action?: ToastAction) => number;
  dismiss: (id: number) => void;
}

const DEFAULT_DURATION_MS = 3200;

let nextId = 1;

/** In-memory only (not persisted): toasts are transient UI state. */
export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],
  show: (message, durationMs = DEFAULT_DURATION_MS, action) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { id, message, action }] }));
    setTimeout(() => get().dismiss(id), durationMs);
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
