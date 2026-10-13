import type { LucideIcon } from 'lucide-react'

import { cn } from '../../lib/cn'

export type ControlTone = 'neutral' | 'danger'

export interface ControlButtonProps {
  icon: LucideIcon
  label: string
  onClick: () => void
  /** État d'activation (bouton bascule) : expose `aria-pressed`. */
  pressed?: boolean
  /** État visuel « éteint » (micro coupé, caméra désactivée). */
  off?: boolean
  highlighted?: boolean
  tone?: ControlTone
  disabled?: boolean
  /** Petite pastille numérique (ex. nombre de participants). */
  badge?: string
  title?: string
  className?: string
}

/**
 * Bouton de barre de contrôle : icône + libellé permanent (lisibilité) et état
 * accessible explicite.
 */
export function ControlButton({
  icon: Icon,
  label,
  onClick,
  pressed,
  off = false,
  highlighted = false,
  tone = 'neutral',
  disabled = false,
  badge,
  title,
  className,
}: ControlButtonProps) {
  const isToggle = pressed !== undefined
  const active = pressed === true

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      aria-label={label}
      aria-pressed={isToggle ? active : undefined}
      className={cn(
        'group relative flex h-16 min-w-16 flex-col items-center justify-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-45',
        tone === 'danger'
          ? 'bg-rose-500/90 text-white hover:bg-rose-500'
          : off
            ? 'bg-ink-800 text-slate-400 hover:bg-ink-700 hover:text-slate-200'
            : highlighted || active
              ? 'bg-accent-500/15 text-accent-200 hover:bg-accent-500/25'
              : 'bg-ink-800 text-slate-200 hover:bg-ink-700 hover:text-white',
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-5" strokeWidth={off ? 1.75 : 2} />
      {badge ? (
        <span
          aria-hidden="true"
          className="absolute left-2 top-2 rounded-full bg-ink-600 px-1.5 text-[10px] leading-4 text-slate-200"
        >
          {badge}
        </span>
      ) : null}
      <span className="max-w-20 truncate leading-tight">{label}</span>
      {off ? (
        <span className="absolute right-2 top-2 size-2 rounded-full bg-rose-400" aria-hidden="true" />
      ) : null}
    </button>
  )
}
