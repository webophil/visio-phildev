import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../../lib/cn'

export type NoticeTone = 'info' | 'warning' | 'danger' | 'success'

const TONES: Record<NoticeTone, { wrapper: string; icon: LucideIcon; iconClass: string }> = {
  info: {
    wrapper: 'border-ink-600 bg-ink-850 text-slate-300',
    icon: Info,
    iconClass: 'text-accent-300',
  },
  warning: {
    wrapper: 'border-amber-500/30 bg-amber-500/8 text-amber-100',
    icon: AlertTriangle,
    iconClass: 'text-amber-300',
  },
  danger: {
    wrapper: 'border-rose-500/40 bg-rose-500/8 text-rose-100',
    icon: ShieldAlert,
    iconClass: 'text-rose-300',
  },
  success: {
    wrapper: 'border-emerald-500/30 bg-emerald-500/8 text-emerald-100',
    icon: CheckCircle2,
    iconClass: 'text-emerald-300',
  },
}

export interface NoticeProps {
  tone?: NoticeTone
  title?: string
  children?: ReactNode
  action?: ReactNode
  className?: string
}

export function Notice({ tone = 'info', title, children, action, className }: NoticeProps) {
  const { wrapper, icon: Icon, iconClass } = TONES[tone]

  return (
    <div
      role={tone === 'danger' ? 'alert' : undefined}
      className={cn('flex gap-3 rounded-xl border p-3.5 text-sm', wrapper, className)}
    >
      <Icon aria-hidden="true" className={cn('mt-0.5 size-5 shrink-0', iconClass)} />

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="leading-relaxed opacity-90">{children}</div> : null}
        {action ? <div className="pt-0.5">{action}</div> : null}
      </div>
    </div>
  )
}
