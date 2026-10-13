import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'

import { cn } from '../../lib/cn'

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string
  hint?: ReactNode
  error?: string | null
  trailing?: ReactNode
}

export function TextField({ label, hint, error, trailing, className, ...props }: TextFieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ')

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-200">
        {label}
      </label>

      <div className="relative flex items-center">
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={cn(
            'h-11 w-full rounded-xl border bg-ink-850 px-3.5 text-sm text-slate-100 placeholder:text-ink-300',
            'border-ink-600 focus:border-accent-500 focus:outline-none',
            error ? 'border-rose-500/80' : '',
            trailing ? 'pr-11' : '',
            className,
          )}
          {...props}
        />
        {trailing ? (
          <span className="absolute right-2 flex items-center">{trailing}</span>
        ) : null}
      </div>

      {hint ? (
        <p id={hintId} className="text-xs text-slate-400">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-rose-300">
          {error}
        </p>
      ) : null}
    </div>
  )
}
