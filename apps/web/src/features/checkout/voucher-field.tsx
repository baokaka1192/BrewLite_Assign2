'use client';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { normalizeVoucherCode } from './payload';

interface VoucherFieldProps {
  /** Code currently applied (or locked to a pending order); null when none. */
  appliedCode: string | null;
  /** True while the voucher belongs to a pending order and cannot be changed. */
  locked: boolean;
  fieldError: string | null;
  onApply: (code: string) => void;
  onRemove: () => void;
  /** Called when the user edits the input, so a previous field error can be dismissed. */
  onEdit: () => void;
}

export function VoucherField({ appliedCode, locked, fieldError, onApply, onRemove, onEdit }: VoucherFieldProps) {
  const [input, setInput] = useState('');

  if (locked) {
    return (
      <div className="space-y-2 text-sm">
        <p className="font-medium">Voucher</p>
        <p>
          {appliedCode ? <code>{appliedCode}</code> : 'None'}{' '}
          <span className="text-muted-foreground">(locked to your pending order)</span>
        </p>
        {fieldError && (
          <p role="alert" className="text-red-700">
            {fieldError}
          </p>
        )}
      </div>
    );
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = normalizeVoucherCode(input);
    if (!code) return;
    onApply(code);
  }

  if (appliedCode) {
    return (
      <div className="flex items-center justify-between gap-4 text-sm">
        <span>
          Voucher <code>{appliedCode}</code> applied
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setInput('');
            onRemove();
          }}
        >
          Remove
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-2">
      <label htmlFor="voucher-code" className="block text-sm font-medium">
        Voucher code
      </label>
      <div className="flex gap-2">
        <input
          id="voucher-code"
          type="text"
          autoComplete="off"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (fieldError) onEdit();
          }}
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={fieldError ? 'voucher-code-error' : undefined}
          className="min-w-0 flex-1 border border-border bg-background px-3 py-2 text-sm uppercase"
        />
        <Button type="submit" variant="ghost" size="sm" disabled={!normalizeVoucherCode(input)}>
          Apply
        </Button>
      </div>
      {fieldError && (
        <p id="voucher-code-error" role="alert" className="text-sm text-red-700">
          {fieldError}
        </p>
      )}
    </form>
  );
}
