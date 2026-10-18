import { useEffect, useState } from 'react'
import { Activity, Check, Info, Loader2, Sparkles, WandSparkles } from 'lucide-react'

import { Notice } from '../ui/Notice'
import { SidePanel } from '../ui/SidePanel'
import { NOTICES } from '../../lib/notices'
import { readVideoEffectStats } from '../../media/backgroundBlur'
import type { VideoEffectStats } from '../../media/backgroundBlur'
import { useMeeting } from '../../state/meetingContext'
import type { VideoEffectId } from '../../types/meeting'

interface EffectOption {
  id: VideoEffectId
  label: string
  description: string
  previewClass: string
}

/**
 * Effets de fond.
 *
 * Seul le flou d'arrière-plan est proposé : il est réellement appliqué au flux
 * publié (détourage local, voir `src/media/backgroundBlur.ts`). Les fonds
 * virtuels et le remplacement par image ne sont pas implémentés : ils ne sont
 * donc pas affichés, plutôt que présentés comme disponibles sans effet.
 */
const EFFECTS: EffectOption[] = [
  {
    id: 'none',
    label: 'Aucun effet',
    description: 'Votre caméra est diffusée telle quelle, sans traitement.',
    previewClass: 'bg-ink-800',
  },
  {
    id: 'blur',
    label: 'Flou',
    description: "Détoure votre silhouette et floute l'arrière-plan, localement.",
    previewClass:
      'bg-ink-800 bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(148,163,184,0.22)_6px,rgba(148,163,184,0.22)_12px)]',
  },
]

export function BackgroundEffectsPanel() {
  const {
    closePanel,
    media,
    videoEffect,
    setVideoEffect,
    videoEffectBusy,
    videoEffectError,
  } = useMeeting()

  const hasVideo = media.hasVideoTrack && media.videoEnabled

  return (
    <SidePanel title="Effets de fond" icon={WandSparkles} onClose={closePanel}>
      <div className="flex flex-col gap-4">
        {videoEffectError ? (
          <Notice tone="danger" title="Effet non appliqué">
            {videoEffectError}
          </Notice>
        ) : null}

        <ul className="flex flex-col gap-2" role="list">
          {EFFECTS.map((effect) => {
            const selected = effect.id === videoEffect
            const applying = videoEffectBusy && selected

            return (
              <li key={effect.id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  disabled={videoEffectBusy}
                  title={effect.label}
                  onClick={() => {
                    if (!selected) void setVideoEffect(effect.id)
                  }}
                  className={[
                    'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors',
                    'disabled:cursor-wait disabled:opacity-70',
                    selected
                      ? 'border-accent-500/60 bg-accent-500/10'
                      : 'border-ink-600 bg-ink-850 hover:border-ink-500',
                  ].join(' ')}
                >
                  <span
                    aria-hidden="true"
                    className={`size-11 shrink-0 rounded-lg border border-ink-600 ${effect.previewClass}`}
                  />

                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-sm font-medium text-white">{effect.label}</span>
                    <span className="text-xs leading-relaxed text-slate-400">
                      {effect.description}
                    </span>
                  </span>

                  {selected ? (
                    applying ? (
                      <Loader2
                        aria-label="Application en cours"
                        className="size-4 animate-spin text-accent-200"
                      />
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-accent-200">
                        <Check aria-hidden="true" className="size-3.5" />
                        Actif
                      </span>
                    )
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>

        {videoEffect === 'blur' ? <BlurDiagnostics /> : null}

        <Notice tone="info" title="Traitement local" className="text-xs">
          {NOTICES.backgroundEffects}
        </Notice>

        <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-400">
          <Sparkles aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-slate-500" />
          {hasVideo
            ? videoEffect === 'blur'
              ? 'Le détourage est calculé sur cet appareil, image par image. Sur une machine modeste, la fluidité de votre vidéo peut baisser légèrement.'
              : 'Activez « Flou » pour détourer votre silhouette : votre caméra locale reste inchangée.'
            : 'Activez votre caméra pour appliquer un effet : sans image, il n’y a rien à détourer.'}
        </p>

        <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-500">
          <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          {NOTICES.backgroundBlurUnsupported}
        </p>
      </div>
    </SidePanel>
  )
}

/**
 * Compteurs de fonctionnement du détourage.
 *
 * Ils répondent à une question simple : « des images traversent-elles vraiment
 * le traitement ? ». Aucune image, aucun contenu n'est journalisé ni transmis ;
 * seuls des nombres sont affichés. Un compteur bloqué à 0 alors que la caméra
 * tourne révèle immédiatement un middleware qui ne reçoit rien.
 */
function BlurDiagnostics() {
  const [stats, setStats] = useState<VideoEffectStats | null>(() => readVideoEffectStats())

  useEffect(() => {
    const timer = window.setInterval(() => setStats(readVideoEffectStats()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="rounded-xl border border-ink-700 bg-ink-850 px-3 py-2.5">
      <p className="flex items-center gap-2 text-xs font-medium text-slate-200">
        <Activity aria-hidden="true" className="size-3.5 text-emerald-300" />
        Traitement en cours
      </p>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-400">
        <dt>Images reçues</dt>
        <dd className="text-right font-mono tabular-nums text-slate-200">
          {stats ? `${stats.imagesPerSecond} / s` : '…'}
        </dd>
        <dt>Détourages calculés</dt>
        <dd className="text-right font-mono tabular-nums text-slate-200">
          {stats ? `${stats.masksPerSecond} / s` : '…'}
        </dd>
        <dt>Images recomposées</dt>
        <dd className="text-right font-mono tabular-nums text-slate-200">
          {stats ? stats.imagesBlurred : '…'}
        </dd>
      </dl>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
        Ces compteurs ne contiennent aucune image : ils confirment seulement que le fond est
        recomposé avant l’envoi.
      </p>
    </div>
  )
}
