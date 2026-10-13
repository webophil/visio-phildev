import { Compass, Home } from 'lucide-react'

import { PhilDevLogo } from '../Brand/PhilDevLogo'
import { Button } from '../ui/Button'

export interface UnknownRouteScreenProps {
  path: string
  onGoHome: () => void
}

export function UnknownRouteScreen({ path, onGoHome }: UnknownRouteScreenProps) {
  return (
    <div className="stage-backdrop flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <PhilDevLogo size="md" />

      <Compass aria-hidden="true" className="size-10 text-ink-400" />

      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-semibold text-white">Page introuvable</h1>
        <p className="max-w-md text-sm leading-relaxed text-slate-400">
          L&apos;adresse <code className="rounded bg-ink-850 px-1.5 py-0.5 text-accent-200">{path}</code>{' '}
          ne correspond à aucune réunion. Vérifiez le lien reçu, ou revenez à l&apos;accueil pour
          créer une réunion.
        </p>
      </div>

      <Button size="lg" onClick={onGoHome}>
        <Home aria-hidden="true" className="size-5" />
        Revenir à l&apos;accueil
      </Button>
    </div>
  )
}