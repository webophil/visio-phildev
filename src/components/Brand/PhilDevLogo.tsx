import { cn } from '../../lib/cn'

export type LogoSize = 'sm' | 'md' | 'lg'

const MARK_SIZES: Record<LogoSize, string> = {
  sm: 'size-7',
  md: 'size-9',
  lg: 'size-12',
}

const WORD_SIZES: Record<LogoSize, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-2xl',
}

export interface PhilDevLogoProps {
  size?: LogoSize
  /** Masque le texte pour ne garder que le symbole. */
  compact?: boolean
  className?: string
}

/**
 * Logo provisoire, purement typographique.
 * Le pictogramme reprend le motif « cadre + lecteur » évoquant la visio et le
 * code. Il sera remplacé par le logo officiel PhilDEV sans impact sur le reste
 * de l'interface (un seul composant à substituer).
 */
export function PhilDevLogo({ size = 'md', compact = false, className }: PhilDevLogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg
        viewBox="0 0 32 32"
        aria-hidden="true"
        className={cn(MARK_SIZES[size], 'shrink-0')}
      >
        <rect x="0.75" y="0.75" width="30.5" height="30.5" rx="9" fill="#0d1626" />
        <rect
          x="0.75"
          y="0.75"
          width="30.5"
          height="30.5"
          rx="9"
          fill="none"
          stroke="#1d2c44"
          strokeWidth="1.5"
        />
        {/* Ouverture d'objectif / lecture */}
        <path d="M12 10.5 20 16l-8 5.5z" fill="#38bdf8" />
        <circle cx="23" cy="22.5" r="2.6" fill="#2dd4bf" />
      </svg>

      {compact ? null : (
        <span
          className={cn(
            'font-display font-semibold tracking-tight whitespace-nowrap',
            WORD_SIZES[size],
          )}
        >
          <span className="text-white">PhilDEV</span>
          <span className="text-accent-400"> Visio</span>
        </span>
      )}
    </span>
  )
}
