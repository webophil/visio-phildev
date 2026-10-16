import { Check, Lock, Sparkles, WandSparkles } from 'lucide-react'

import { Notice } from '../ui/Notice'
import { SidePanel } from '../ui/SidePanel'
import { NOTICES } from '../../lib/notices'
import { useMeeting } from '../../state/meetingContext'

interface EffectOption {
  id: string
  label: string
  description: string
  available: boolean
  previewClass: string
}

/**
 * Effets de fond.
 * Phase 1 : seul « Aucun effet » est réellement appliqué. Le flou et les fonds
 * virtuels exigent une segmentation vidéo (pipeline de traitement d'image par
 * trame) qui n'est pas encore branchée : ils sont présentés comme indisponibles
 * plutôt que proposés sans effet réel.
 */
const EFFECTS: EffectOption[] = [
  {
    id: 'none',
    label: 'Aucun effet',
    description: 'Votre caméra est diffusée telle quelle, sans traitement.',
    available: true,
    previewClass: 'bg-ink-800',
  },
  {
    id: 'blur',
    label: 'Flou d’arrière-plan',
    description: 'Nécessite une segmentation vidéo pour détacher la silhouette.',
    available: false,
    previewClass: 'bg-ink-800 bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(148,163,184,0.18)_6px,rgba(148,163,184,0.18)_12px)]',
  },
  {
    id: 'color',
    label: 'Couleur unie',
    description: 'Remplace l’arrière-plan par une teinte PhilDEV.',
    available: false,
    previewClass: 'bg-accent-600',
  },
  {
    id: 'office',
    label: 'Bureau virtuel',
    description: 'Image d’arrière-plan appliquée derrière vous.',
    available: false,
    previewClass: 'bg-ink-700 bg-[linear-gradient(135deg,rgba(45,212,191,0.35),rgba(14,165,233,0.25))]',
  },
]

export function BackgroundEffectsPanel() {
  const { closePanel, media } = useMeeting()
  const hasVideo = media.hasVideoTrack && media.videoEnabled

  return (
    <SidePanel title="Effets de fond" icon={WandSparkles} onClose={closePanel}>
      <div className="flex flex-col gap-4">
        <Notice tone="info" title="Effets non disponibles">
          {NOTICES.backgroundEffects}
        </Notice>

        <ul className="flex flex-col gap-2" role="list">
          {EFFECTS.map((effect) => {
            const selected = effect.id === 'none'

            return (
              <li key={effect.id}>
                <button
                  type="button"
                  disabled={!effect.available}
                  aria-pressed={selected}
                  title={
                    effect.available
                      ? effect.label
                      : 'Indisponible — segmentation vidéo non branchée'
                  }
                  className={[
                    'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors',
                    effect.available
                      ? selected
                        ? 'border-accent-500/60 bg-accent-500/10'
                        : 'border-ink-600 bg-ink-850 hover:border-ink-500'
                      : 'cursor-not-allowed border-ink-700 bg-ink-900 opacity-60',
                  ].join(' ')}
                >
                  <span
                    aria-hidden="true"
                    className={`size-11 shrink-0 rounded-lg border border-ink-600 ${effect.previewClass}`}
                  />

                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-white">
                      {effect.label}
                      {effect.available ? null : (
                        <Lock aria-label="Indisponible" className="size-3.5 text-slate-400" />
                      )}
                    </span>
                    <span className="text-xs leading-relaxed text-slate-400">
                      {effect.description}
                    </span>
                  </span>

                  {selected ? (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-accent-200">
                      <Check aria-hidden="true" className="size-3.5" />
                      Actif
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-slate-500">Indisponible</span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>

        <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-400">
          <Sparkles aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-slate-500" />
          {hasVideo
            ? 'Votre flux vidéo est transmis aux participants sans retouche : aucun effet n’est appliqué.'
            : 'Activez votre caméra pour visualiser un éventuel effet.'}
        </p>
      </div>
    </SidePanel>
  )
}