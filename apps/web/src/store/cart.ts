import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface CartLine {
  /** Stable identity: productId + sizeCode + sorted topping ids. */
  key: string;
  productId: string;
  name: string;
  imageUrl: string;
  sizeCode?: string;
  toppingIds: string[];
  toppingNames: string[];
  /** Price of one unit, already including size delta and toppings (VND). */
  unitPrice: number;
  qty: number;
  /** Known stock for the product at add time; setQty/add never exceed it. */
  stock?: number;
}

export interface AddCartInput {
  productId: string;
  name: string;
  imageUrl: string;
  sizeCode?: string;
  toppingIds?: string[];
  toppingNames?: string[];
  unitPrice: number;
  qty?: number;
  /** Available stock for the product; merged quantities are capped at this value. */
  stock?: number;
}

export interface CartState {
  lines: CartLine[];
  add: (input: AddCartInput) => void;
  /** Sets quantity; <= 0 removes the line; capped at the line's stock when known. */
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
}

export function makeLineKey(productId: string, sizeCode: string | undefined, toppingIds: readonly string[]): string {
  return [productId, sizeCode ?? '', [...toppingIds].sort().join(',')].join('|');
}

const clampQty = (qty: number, stock?: number) => {
  const n = Number.isFinite(qty) ? Math.trunc(qty) : 0;
  return stock === undefined ? n : Math.min(n, Math.max(stock, 0));
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      lines: [],

      add: (input) =>
        set((state) => {
          const toppingIds = [...(input.toppingIds ?? [])].sort();
          const key = makeLineKey(input.productId, input.sizeCode, toppingIds);
          const addQty = Math.max(1, Math.trunc(input.qty ?? 1));
          const existing = state.lines.find((l) => l.key === key);

          if (existing) {
            const stock = input.stock ?? existing.stock;
            const qty = clampQty(existing.qty + addQty, stock);
            if (qty === existing.qty && stock === existing.stock) return state;
            return { lines: state.lines.map((l) => (l.key === key ? { ...l, qty, stock } : l)) };
          }

          const qty = clampQty(addQty, input.stock);
          if (qty <= 0) return state;
          const line: CartLine = {
            key,
            productId: input.productId,
            name: input.name,
            imageUrl: input.imageUrl,
            sizeCode: input.sizeCode,
            toppingIds,
            toppingNames: input.toppingNames ?? [],
            unitPrice: input.unitPrice,
            qty,
            stock: input.stock,
          };
          return { lines: [...state.lines, line] };
        }),

      setQty: (key, qty) =>
        set((state) => {
          const line = state.lines.find((l) => l.key === key);
          if (!line) return state;
          const next = clampQty(qty, line.stock);
          if (next <= 0) return { lines: state.lines.filter((l) => l.key !== key) };
          return { lines: state.lines.map((l) => (l.key === key ? { ...l, qty: next } : l)) };
        }),

      remove: (key) => set((state) => ({ lines: state.lines.filter((l) => l.key !== key) })),

      clear: () => set({ lines: [] }),
    }),
    {
      name: 'brewlite-cart',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ lines: state.lines }),
    },
  ),
);

/** Total number of units across all lines (drives the navbar badge). */
export const totalItems = (state: Pick<CartState, 'lines'>): number =>
  state.lines.reduce((sum, l) => sum + l.qty, 0);

/** Sum of unitPrice * qty over all lines, in VND. */
export const subtotal = (state: Pick<CartState, 'lines'>): number =>
  state.lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
