'use client';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { lineTotal, unitPrice } from '@/lib/price';
import { cn, formatVND } from '@/lib/utils';
import type { Product } from '@/types/product';

export interface ProductSelection {
  sizeCode?: string;
  toppingIds: string[];
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface ProductOptionsProps {
  product: Product;
  /** Called with the chosen options. Cart wiring is added in Task 5. */
  onAdd?: (selection: ProductSelection) => void;
}

const MIN_QTY = 1;

export function ProductOptions({ product, onAdd }: ProductOptionsProps) {
  const uid = useId();
  const soldOut = !product.available || product.stock <= 0;
  const maxQty = Math.max(product.stock, MIN_QTY);
  const hasSizes = product.sizes.length > 0;

  const [sizeCode, setSizeCode] = useState<string | undefined>(
    hasSizes ? (product.sizes.find((s) => s.code === 'S')?.code ?? product.sizes[0].code) : undefined,
  );
  const [toppingIds, setToppingIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(MIN_QTY);

  const unit = unitPrice(product, sizeCode, toppingIds);
  const total = lineTotal(product, quantity, sizeCode, toppingIds);

  const clampQty = (n: number) => Math.min(maxQty, Math.max(MIN_QTY, Number.isFinite(n) ? Math.trunc(n) : MIN_QTY));

  const toggleTopping = (id: string) =>
    setToppingIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const handleAdd = () => {
    onAdd?.({ sizeCode, toppingIds, quantity, unitPrice: unit, lineTotal: total });
  };

  const optionClass = (disabled: boolean) =>
    cn(
      'flex cursor-pointer items-center justify-between gap-4 border border-border px-4 py-3 text-sm transition-colors duration-200',
      !disabled && 'hover:border-primary',
      disabled && 'cursor-not-allowed opacity-50',
    );

  return (
    <form
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        handleAdd();
      }}
    >
      {hasSizes && (
        <fieldset disabled={soldOut} className="space-y-3">
          <legend className="mb-3 text-sm font-semibold uppercase tracking-label">Size</legend>
          <div className="grid grid-cols-3 gap-3">
            {product.sizes.map((size) => {
              const id = `${uid}-size-${size.code}`;
              return (
                <label key={size.code} htmlFor={id} className={optionClass(soldOut)}>
                  <span className="flex items-center gap-2">
                    <input
                      id={id}
                      type="radio"
                      name={`${uid}-size`}
                      value={size.code}
                      checked={sizeCode === size.code}
                      onChange={() => setSizeCode(size.code)}
                      className="accent-primary"
                    />
                    <span className="font-medium">{size.code}</span>
                  </span>
                  <span className="text-muted-foreground">
                    {size.delta === 0 ? 'Base' : `+${formatVND(size.delta)}`}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {product.toppings.length > 0 && (
        <fieldset disabled={soldOut} className="space-y-3">
          <legend className="mb-3 text-sm font-semibold uppercase tracking-label">Toppings</legend>
          <div className="space-y-3">
            {product.toppings.map((topping) => {
              const id = `${uid}-topping-${topping.id}`;
              return (
                <label key={topping.id} htmlFor={id} className={optionClass(soldOut)}>
                  <span className="flex items-center gap-2">
                    <input
                      id={id}
                      type="checkbox"
                      value={topping.id}
                      checked={toppingIds.includes(topping.id)}
                      onChange={() => toggleTopping(topping.id)}
                      className="accent-primary"
                    />
                    <span className="font-medium">{topping.name}</span>
                  </span>
                  <span className="text-muted-foreground">+{formatVND(topping.price)}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="flex flex-wrap items-center gap-6">
        <div role="group" aria-labelledby={`${uid}-qty-label`} className="flex items-center gap-3">
          <span id={`${uid}-qty-label`} className="text-sm font-semibold uppercase tracking-label">
            Quantity
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Decrease quantity"
            disabled={soldOut || quantity <= MIN_QTY}
            onClick={() => setQuantity((q) => clampQty(q - 1))}
          >
            −
          </Button>
          <input
            type="number"
            inputMode="numeric"
            aria-label="Quantity"
            min={MIN_QTY}
            max={maxQty}
            step={1}
            value={quantity}
            disabled={soldOut}
            onChange={(e) => setQuantity(clampQty(e.currentTarget.valueAsNumber))}
            className="h-9 w-16 border border-border bg-background text-center text-sm disabled:opacity-50"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Increase quantity"
            disabled={soldOut || quantity >= maxQty}
            onClick={() => setQuantity((q) => clampQty(q + 1))}
          >
            +
          </Button>
        </div>
      </div>

      <div className="border-t border-border pt-6">
        <p className="flex items-baseline justify-between text-sm text-muted-foreground">
          <span>Unit price</span>
          <span>{formatVND(unit)}</span>
        </p>
        <p className="mt-2 flex items-baseline justify-between text-xl font-semibold">
          <span>Total</span>
          <span data-testid="line-total" aria-live="polite" aria-atomic="true">{formatVND(total)}</span>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" size="default" disabled={soldOut}>
          {soldOut ? 'Sold out' : 'Add to cart'}
        </Button>
        {soldOut && <p className="text-sm text-muted-foreground">This item is currently unavailable.</p>}
      </div>
    </form>
  );
}
