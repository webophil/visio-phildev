import { X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../../lib/cn'

export interface SidePanelProps {
  title: string
  icon: LucideIcon
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  className?: string
}

/**
 * Panneau latéral de la salle de réunion (participants, chat, effets).
 * Sur ordinateur il complète la scène ; sur mobile il s'affiche en feuille
 * inférieure, sans masquer la barre de contrôle.
 */
export function SidePanel({ title, icon: Icon, onClose, children, footer, className }: SidePanelProps) {
  return (
    <aside
      aria-label={title}
      className={cn(
        'flex flex-col overflow-hidden border-ink-700 bg-ink-900',
        'fixed inset-x-0 bottom-0 z-30 max-h-[72dvh] rounded-t-2xl border-t',
        'lg:static lg:z-auto lg:max-h-none lg:w-[22rem] lg:shrink-0 lg:rounded-2xl lg:border',
        className,
      )}
    >
      <header className="flex items-center justify-between gap-3 border-b border-ink-700 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
          <Icon aria-hidden="true" className="size-4 text-accent-300" />
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={`Fermer le panneau ${title}`}
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-ink-800 hover:text-white"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3.5">{children}</div>

      {footer ? <div className="border-t border-ink-700 px-4 py-3">{footer}</div> : null}
    </aside>
  )
}
