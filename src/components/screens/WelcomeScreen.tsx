import { useEffect, useState } from 'react'
import {
  ArrowRight,
  Crown,
  KeyRound,
  Link2,
  Loader2,
  MonitorUp,
  ShieldCheck,
  UserRound,
  Video,
} from 'lucide-react'

import { PhilDevLogo } from '../Brand/PhilDevLogo'
import { HostAccessDialog } from '../meeting/HostAccessDialog'
import { Button } from '../ui/Button'
import { Notice } from '../ui/Notice'
import { StatusPill } from '../ui/StatusPill'
import { TextField } from '../ui/TextField'
import { parseMeetingLink } from '../../lib/format'
import type { MeetingLink } from '../../lib/format'
import { DEFAULT_MEETING_TITLE, MAX_MEETING_TITLE_LENGTH } from '../../lib/meetingTitle'
import { NOTICES } from '../../lib/notices'
import { readHostSession } from '../../meeting/hostSession'
import { checkApiAvailability } from '../../meeting/rtkApi'
import { useCreateMeeting } from '../../meeting/useCreateMeeting'

const CAPABILITIES = [
  {
    icon: Video,
    title: 'Visioconférence réelle',
    description:
      'Audio et vidéo transitent par Cloudflare RealtimeKit : deux navigateurs distants se voient et se parlent vraiment.',
  },
  {
    icon: MonitorUp,
    title: "Partage d'écran natif",
    description:
      'Écran, fenêtre ou onglet : le navigateur propose les sources disponibles, et les autres participants les voient.',
  },
  {
    icon: ShieldCheck,
    title: 'Sans compte pour les invités',
    description:
      "Un lien suffit : les invités saisissent leur nom et rejoignent la salle depuis leur navigateur.",
  },
] as const

export interface WelcomeScreenProps {
  onJoinMeeting: (link: MeetingLink) => void
}

/**
 * Page d'accueil.
 * La création de réunion est réservée à l'organisateur (session protégée par la
 * clé `PHILDEV_HOST_KEY`) ; les invités rejoignent uniquement avec un lien.
 */
export function WelcomeScreen({ onJoinMeeting }: WelcomeScreenProps) {
  const [value, setValue] = useState('')
  // Nom de la réunion : pré-rempli, modifiable, jamais obligatoire.
  const [title, setTitle] = useState(DEFAULT_MEETING_TITLE)
  const [error, setError] = useState<string | null>(null)
  const [hostDialogOpen, setHostDialogOpen] = useState(false)
  const [hostReady, setHostReady] = useState(() => readHostSession() !== null)
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null)

  const { start, busy, error: createError, clearError } = useCreateMeeting()

  useEffect(() => {
    let active = true
    void checkApiAvailability().then((available) => {
      if (active) setApiAvailable(available)
    })
    return () => {
      active = false
    }
  }, [])

  const handleCreate = () => {
    clearError()
    if (!hostReady) {
      setHostDialogOpen(true)
      return
    }
    void start({ title })
  }

  const handleJoin = () => {
    const link = parseMeetingLink(value)

    if (!link) {
      setError(
        value.trim().length === 0
          ? 'Collez le lien d’invitation reçu (ex. …/rdv-aurore?r=…).'
          : "Ce lien n'est pas valide. Attendu : une adresse terminée par /rdv-…, éventuellement suivie de ?r=.",
      )
      return
    }

    setError(null)
    onJoinMeeting(link)
  }

  return (
    <div className="stage-backdrop flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <PhilDevLogo size="md" />

        <div className="flex flex-wrap items-center gap-2">
          {hostReady ? (
            <StatusPill
              tone="info"
              icon={<Crown aria-hidden="true" className="size-3.5 text-amber-300" />}
            >
              Session organisateur
            </StatusPill>
          ) : null}

          <Button variant="ghost" size="sm" onClick={() => setHostDialogOpen(true)}>
            <KeyRound aria-hidden="true" className="size-4" />
            Accès organisateur
          </Button>
        </div>
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
            unique, sans installation et sans création de compte pour les invités. Les échanges
            audio et vidéo passent par Cloudflare RealtimeKit.
          </p>

          <dl className="mt-2 grid gap-4 sm:grid-cols-3">
            {CAPABILITIES.map(({ icon: Icon, title, description }) => (
              <div key={title} className="surface-panel flex flex-col gap-2 rounded-2xl p-4">
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
              Créez un rendez-vous, ou rejoignez une réunion avec le lien reçu.
            </p>
          </div>

          {apiAvailable === false ? (
            <Notice tone="warning" title="Service de réunion injoignable">
              L’API de réunion répond uniquement depuis la prévisualisation déployée. Ouverte en
              développement local, cette page ne peut ni créer ni rejoindre de réunion.
            </Notice>
          ) : null}

          {createError ? (
            <Notice tone="danger" title="Création impossible">
              {createError}
            </Notice>
          ) : null}

          <TextField
            label="Nom de la réunion"
            placeholder={DEFAULT_MEETING_TITLE}
            value={title}
            maxLength={MAX_MEETING_TITLE_LENGTH}
            autoComplete="off"
            hint={`Affiché à tous les participants. Laissez vide pour « ${DEFAULT_MEETING_TITLE} ».`}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={() => {
              // Un champ vide revient au nom par défaut : le nom transmis reste
              // toujours lisible.
              if (title.trim().length === 0) setTitle(DEFAULT_MEETING_TITLE)
            }}
          />

          <Button size="lg" onClick={handleCreate} disabled={busy} className="w-full">
            {busy ? (
              <Loader2 aria-hidden="true" className="size-5 animate-spin" />
            ) : (
              <Video aria-hidden="true" className="size-5" />
            )}
            {hostReady ? 'Créer une réunion' : 'Créer une réunion (organisateur)'}
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
              label="Lien d’invitation"
              placeholder="https://…/rdv-aurore?r=…"
              value={value}
              error={error}
              autoComplete="off"
              spellCheck={false}
              hint="Collez le lien complet reçu de l'organisateur."
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

          <Notice tone="info" title="Invités" className="text-xs">
            <UserRound aria-hidden="true" className="mr-1.5 inline size-3.5 align-[-2px]" />
            {NOTICES.inviteLink}
          </Notice>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-5 pb-8 text-xs text-slate-500 sm:px-8">
        <p>PhilDEV Visio · Cloudflare RealtimeKit — cible : visio.phildev.online</p>
      </footer>

      <HostAccessDialog
        key={hostDialogOpen ? 'open' : 'closed'}
        open={hostDialogOpen}
        onClose={() => setHostDialogOpen(false)}
        onSuccess={() => {
          setHostReady(true)
          setHostDialogOpen(false)
        }}
      />
    </div>
  )
}
