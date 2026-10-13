import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { cn } from '../../lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent-500 text-ink-950 font-semibold hover:bg-accent-400 active:bg-accent-600',
  secondary:
    'bg-ink-700/70 text-slate-100 font-medium border border-ink-600 hover:bg-ink-700 hover:border-ink-500',
  ghost: 'bg-transparent text-slate-300 font-medium hover:bg-ink-800 hover:text-white',
  danger: 'bg-rose-500/90 text-white font-semibold hover:bg-rose-500',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-sm gap-2 rounded-lg',
  md: 'h-11 px-5 text-sm gap-2.5 rounded-xl',
  lg: 'h-13 px-7 text-base gap-3 rounded-xl',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
