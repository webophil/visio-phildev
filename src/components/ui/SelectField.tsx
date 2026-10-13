import { useId } from 'react'
import type { ReactNode } from 'react'

import { cn } from '../../lib/cn'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectFieldProps {
  label: string
  value: string | null
  options: SelectOption[]
  onChange: (value: string) => void
  hint?: ReactNode
  disabled?: boolean
  /** Texte affiché lorsqu'aucun périphérique n'est disponible. */
  emptyLabel?: string
  className?: string
}

export function SelectField({
  label,
  value,
  options,
  onChange,
  hint,
  disabled = false,
  emptyLabel = 'Aucun périphérique disponible',
  className,
}: SelectFieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const isEmpty = options.length === 0

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-200">
        {label}
      </label>

      <select
        id={id}
        value={value ?? ''}
        disabled={disabled || isEmpty}
        aria-describedby={hint ? hintId : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          'h-11 w-full rounded-xl border border-ink-600 bg-ink-850 px-3 text-sm text-slate-100',
          'focus:border-accent-500 focus:outline-none',
          'disabled:cursor-not-allowed disabled:text-slate-500',
          className,
        )}
      >
        {isEmpty ? <option value="">{emptyLabel}</option> : null}
        {value === null && !isEmpty ? <option value="">Sélectionner…</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {hint ? (
        <p id={hintId} className="text-xs text-slate-400">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
