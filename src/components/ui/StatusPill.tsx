import type { ReactNode } from 'react'

import { cn } from '../../lib/cn'

export type StatusPillTone = 'neutral' | 'info' | 'warning'

const TONES: Record<StatusPillTone, string> = {
  neutral: 'border-ink-600 bg-ink-850 text-slate-300',
  info: 'border-accent-500/30 bg-accent-500/10 text-accent-200',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
}

export interface StatusPillProps {
  tone?: StatusPillTone
  icon?: ReactNode
  children: ReactNode
  className?: string
}

export function StatusPill({ tone = 'neutral', icon, children, className }: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}
