import { useState } from 'react'
import { ArrowRight, Link2, MonitorUp, ShieldCheck, Sparkles, Video, WifiOff } from 'lucide-react'

import { PhilDevLogo } from '../Brand/PhilDevLogo'
import { Button } from '../ui/Button'
import { Notice } from '../ui/Notice'
import { StatusPill } from '../ui/StatusPill'
import { TextField } from '../ui/TextField'
import { parseMeetingInput } from '../../lib/ids'
import { PHASE_2 } from '../../lib/notices'

const CAPABILITIES = [
  {
    icon: Video,
    title: 'Caméra et micro réels',
    description:
      "Votre navigateur vous demande l'autorisation, aucune image n'est simulée : le flux vient directement de vos périphériques.",
  },
  {
    icon: MonitorUp,
    title: "Partage d'écran natif",
    description:
      'Écran, fenêtre ou onglet : le navigateur propose les sources disponibles via getDisplayMedia.',
  },
  {
    icon: ShieldCheck,
    title: 'Sans installation ni compte',
    description:
      "Les participants invités ouvrent un lien et rejoignent la réunion depuis leur navigateur.",
  },
] as const

export interface WelcomeScreenProps {
  onCreateMeeting: () => void
  onJoinMeeting: (meetingId: string) => void
}

export function WelcomeScreen({ onCreateMeeting, onJoinMeeting }: WelcomeScreenProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleJoin = () => {
    const meetingId = parseMeetingInput(value)

    if (!meetingId) {
      setError(
        value.trim().length === 0
          ? 'Saisissez un lien ou un identifiant de réunion (ex. rdv-aurore).'
          : "Cet identifiant de réunion n'est pas valide. Utilisez des lettres, des chiffres et des tirets (ex. rdv-aurore).",
      )
      return
    }

    setError(null)
    onJoinMeeting(meetingId)
  }

  return (
    <div className="stage-backdrop flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <PhilDevLogo size="md" />
        <StatusPill tone="info" icon={<Sparkles aria-hidden="true" className="size-3.5" />}>
          Phase 1 — aperçu technique
        </StatusPill>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-5 pb-12 sm:px-8 lg:flex-row lg:items-start lg:gap-14 lg:pt-6">
        <section className="flex flex-1 flex-col gap-6">
          <p className="text-sm font-medium tracking-[0.18em] text-accent-300 uppercase">
            Visioconférence pour vos rendez-vous clients
          </p>

          <h1 className="font-display text-4xl leading-[1.08] font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Vos rendez-vous,
            <br />
            simplement.
          </h1>

          <p className="max-w-xl text-base leading-relaxed text-slate-300">
            PhilDEV Visio réunit vos échanges clients et le suivi de votre stagiaire dans un espace
            unique, sans installation et sans création de compte pour les invités. Vos données
            audio et vidéo restent sur votre appareil.
          </p>

          <dl className="mt-2 grid gap-4 sm:grid-cols-3">
            {CAPABILITIES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="surface-panel flex flex-col gap-2 rounded-2xl p-4"
              >
                <Icon aria-hidden="true" className="size-5 text-accent-300" />
                <dt className="text-sm font-semibold text-white">{title}</dt>
                <dd className="text-xs leading-relaxed text-slate-400">{description}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section
          aria-labelledby="welcome-actions"
          className="surface-panel flex w-full flex-col gap-5 rounded-3xl p-6 shadow-2xl shadow-black/40 lg:w-[26rem] lg:shrink-0"
        >
          <div className="flex flex-col gap-1">
            <h2 id="welcome-actions" className="text-lg font-semibold text-white">
              Démarrer
            </h2>
            <p className="text-sm text-slate-400">
              Créez un rendez-vous ou rejoignez une réunion existante.
            </p>
          </div>

          <Button size="lg" onClick={onCreateMeeting} className="w-full">
            <Video aria-hidden="true" className="size-5" />
            Créer une réunion
          </Button>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="h-px flex-1 bg-ink-700" />
            ou
            <span className="h-px flex-1 bg-ink-700" />
          </div>

          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              handleJoin()
            }}
          >
            <TextField
              label="Lien ou identifiant de réunion"
              placeholder="rdv-aurore"
              value={value}
              error={error}
              autoComplete="off"
              spellCheck={false}
              hint="Collez un lien complet (https://…/rdv-aurore) ou saisissez l'identifiant."
              onChange={(event) => {
                setValue(event.target.value)
                if (error) setError(null)
              }}
            />

            <Button type="submit" variant="secondary" size="lg" className="w-full">
              <Link2 aria-hidden="true" className="size-5" />
              Rejoindre
              <ArrowRight aria-hidden="true" className="size-4 opacity-70" />
            </Button>
          </form>

          <Notice
            tone="warning"
            title="Réunions locales en Phase 1"
            className="text-xs"
          >
            <WifiOff aria-hidden="true" className="mr-1.5 inline size-3.5 align-[-2px]" />
            {PHASE_2.meetingLinks}
          </Notice>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-5 pb-8 text-xs text-slate-500 sm:px-8">
        <p>
          PhilDEV Visio · cible de déploiement&nbsp;: visio.phildev.online — Phase 1, réunions
          locales uniquement.
        </p>
      </footer>
    </div>
  )
}
