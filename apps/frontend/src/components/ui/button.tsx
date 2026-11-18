import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-[color,background-color,border-color,transform] duration-200 ease-out active:scale-[0.98] motion-reduce:active:scale-100 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        solid: 'bg-primary text-primary-foreground hover:bg-primary/90',
        outline: 'border border-primary text-primary hover:bg-primary hover:text-primary-foreground',
        ghost: 'border border-border text-foreground hover:border-primary',
        cream: 'bg-background text-primary hover:bg-surface',
      },
      size: { default: 'h-11 px-6', sm: 'h-9 px-4' },
    },
    defaultVariants: { variant: 'solid', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
  },
);
Button.displayName = 'Button';
