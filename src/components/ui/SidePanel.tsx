import { X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { SIDE_PANEL_CLASS } from '../meeting/layout'
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
 *
 * Largeur fixe sur ordinateur et hauteur bornée par la colonne : le contenu
 * défile **dans** le panneau, il ne peut ni l'élargir ni agrandir la scène.
 */
export function SidePanel({ title, icon: Icon, onClose, children, footer, className }: SidePanelProps) {
  return (
    <aside
      aria-label={title}
      className={cn(SIDE_PANEL_CLASS, className)}
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-ink-700 px-4 py-3">
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

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-3.5">
        {children}
      </div>

      {footer ? (
        <div className="shrink-0 border-t border-ink-700 px-4 py-3">{footer}</div>
      ) : null}
    </aside>
  )
}
