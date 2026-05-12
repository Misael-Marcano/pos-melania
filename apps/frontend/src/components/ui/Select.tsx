'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SelectVariant = 'default' | 'toolbar' | 'ghost';

/** True when the controlled value is “empty” (placeholder / first blank option). */
function isEmptyControlledValue(value: React.ComponentProps<'select'>['value']): boolean {
  if (value === undefined) return false;
  if (value === '') return true;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

const variantTrigger: Record<SelectVariant, string> = {
  default: [
    'min-h-[2.75rem] rounded-[10px]',
    'border border-navy-200/85',
    'bg-gradient-to-b from-white via-white to-navy-50/35',
    'pl-3.5 pr-11 py-2.5 text-sm font-normal leading-snug text-navy-800',
    'shadow-[0_1px_2px_rgb(24_28_28/0.05),0_2px_8px_rgb(24_28_28/0.035)]',
    'hover:border-navy-300 hover:shadow-[0_2px_6px_rgb(24_28_28/0.06)] hover:bg-gradient-to-b hover:from-white hover:via-navy-50/20 hover:to-navy-50/45',
    'active:shadow-[inset_0_1px_2px_rgb(24_28_28/0.05)]',
  ].join(' '),
  toolbar: [
    'min-h-[2.5rem] rounded-lg',
    'border border-navy-200/90',
    'bg-white/95 backdrop-blur-[2px]',
    'pl-3 pr-10 py-2 text-sm font-medium leading-snug text-navy-800',
    'shadow-sm shadow-navy-950/[0.04]',
    'hover:border-navy-300 hover:bg-white hover:shadow-md hover:shadow-navy-950/[0.05]',
  ].join(' '),
  ghost: [
    'min-h-[2.625rem] rounded-lg',
    'border border-transparent',
    'bg-navy-100/55',
    'pl-3 pr-10 py-2.5 text-sm font-normal leading-snug text-navy-800',
    'shadow-none',
    'hover:border-navy-200/70 hover:bg-navy-100/90',
    'focus-visible:bg-white/95',
  ].join(' '),
};

const focusRing =
  'focus-visible:outline-none focus-visible:border-primary-500/50 ' +
  'focus-visible:ring-2 focus-visible:ring-primary-500/22 focus-visible:ring-offset-0';

const baseTrigger =
  'peer block w-full min-w-0 appearance-none normal-case ' +
  'transition-[border-color,box-shadow,background-color,color,opacity] duration-150 ease-out ' +
  'cursor-pointer ' +
  'disabled:cursor-not-allowed disabled:opacity-[0.48] disabled:shadow-none disabled:hover:border-inherit disabled:hover:bg-inherit ' +
  'aria-[invalid=true]:border-rose-400 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-rose-200/85';

const chevronPosition: Record<SelectVariant, string> = {
  default: 'right-3',
  toolbar: 'right-2.5',
  ghost: 'right-2.5',
};

const chevronSize: Record<SelectVariant, string> = {
  default: 'h-[1.125rem] w-[1.125rem]',
  toolbar: 'h-[1.125rem] w-[1.125rem]',
  ghost: 'h-5 w-5',
};

export type SelectProps = React.ComponentPropsWithoutRef<'select'> & {
  /** Width / flex rules for the shell that wraps the native control (default fills the parent). */
  wrapperClassName?: string;
  /** Visual density / context: forms (default), dense bars (toolbar), low chrome (ghost). */
  variant?: SelectVariant;
};

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, wrapperClassName, variant = 'default', value, children, ...props }, ref) => {
    const empty = isEmptyControlledValue(value);

    return (
      <div className={cn('relative min-w-0', wrapperClassName ?? 'w-full')}>
        <select
          ref={ref}
          {...props}
          value={value}
          data-empty={empty ? '' : undefined}
          className={cn(
            baseTrigger,
            variantTrigger[variant],
            focusRing,
            empty && 'text-muted-foreground',
            className
          )}
        >
          {children}
        </select>
        <ChevronDown
          strokeWidth={2.25}
          className={cn(
            'pointer-events-none absolute top-1/2 -translate-y-1/2 text-navy-500',
            chevronPosition[variant],
            chevronSize[variant],
            'opacity-[0.82] transition-[color,opacity,transform] duration-150 ease-out',
            'peer-hover:opacity-100 peer-hover:text-navy-600',
            'peer-focus-visible:text-primary-600 peer-focus-visible:opacity-100',
            'peer-disabled:opacity-[0.38] peer-disabled:peer-hover:text-navy-400 peer-disabled:peer-hover:opacity-[0.38]'
          )}
          aria-hidden
        />
      </div>
    );
  }
);

Select.displayName = 'Select';
