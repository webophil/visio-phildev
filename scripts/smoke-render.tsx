import { renderToStaticMarkup } from 'react-dom/server'

import { UnknownRouteScreen } from '../src/components/screens/UnknownRouteScreen'
import { WelcomeScreen } from '../src/components/screens/WelcomeScreen'
import { createMeetingId, meetingDisplayName, parseMeetingInput } from '../src/lib/ids'
import { buildMeetingUrl, formatDuration, meetingPath } from '../src/lib/format'
import { parsePath } from '../src/lib/router'

const checks: { name: string; run: () => void }[] = []

function expect(condition: boolean, label: string) {
  if (!condition) throw new Error(`ÉCHEC : ${label}`)
  console.log(`  ok  ${label}`)
}

// --- Routeur -------------------------------------------------------------
checks.push({
  name: 'routeur',
  run: () => {
    expect(parsePath('/').name === 'welcome', '« / » → accueil')
    expect(parsePath('/rdv-aurore').name === 'meeting', '« /rdv-aurore » → réunion')
    const route = parsePath('/rdv-aurore')
    expect(route.name === 'meeting' && route.meetingId === 'aurore', 'identifiant extrait')
    expect(parsePath('/rdv-').name === 'unknown', 'identifiant vide rejeté')
    const trailing = parsePath('/rdv-aurore/')
    expect(
      trailing.name === 'meeting' && trailing.meetingId === 'aurore',
      'barre oblique finale tolérée',
    )
    expect(parsePath('/rdv-ab').name === 'meeting', 'identifiant de 2 caractères accepté')
    expect(parsePath('/inconnu').name === 'unknown', 'route inconnue détectée')
  },
})

// --- Identifiants --------------------------------------------------------
checks.push({
  name: 'identifiants',
  run: () => {
    expect(parseMeetingInput('aurore') === 'aurore', 'identifiant simple')
    expect(parseMeetingInput('rdv-aurore') === 'aurore', 'préfixe rdv- retiré')
    expect(parseMeetingInput('/rdv-aurore') === 'aurore', 'chemin interne accepté')
    expect(
      parseMeetingInput('https://visio.phildev.online/rdv-aurore?x=1') === 'aurore',
      'URL complète avec paramètres',
    )
    expect(parseMeetingInput('   ') === null, 'saisie vide rejetée')
    expect(parseMeetingInput('!!') === null, 'caractères invalides rejetés')
    expect(meetingPath('aurore') === '/rdv-aurore', 'chemin de réunion')

    const generated = createMeetingId()
    expect(generated.length === 7, 'identifiant généré de 7 caractères')
    expect(/^[a-z0-9]+$/.test(generated), 'identifiant généré alphanumérique')
    expect(createMeetingId() !== generated, 'deux identifiants générés diffèrent')
    expect(meetingDisplayName('aurore') === 'Aurore', 'nom affiché capitalisé')
    expect(
      meetingDisplayName('visio-client-dupont') === 'Visio Client Dupont',
      'nom affiché multi-mots',
    )
  },
})

// --- Formatage -----------------------------------------------------------
checks.push({
  name: 'formatage',
  run: () => {
    expect(formatDuration(0) === '00:00', 'durée nulle')
    expect(formatDuration(252_000) === '04:12', 'durée en minutes')
    expect(formatDuration(3_852_000) === '01:04:12', 'durée avec heures')
    expect(formatDuration(-5000) === '00:00', 'durée négative bornée')
    expect(
      buildMeetingUrl('aurore', 'https://visio.phildev.online/') ===
        'https://visio.phildev.online/rdv-aurore',
      'URL publique d’invitation',
    )
  },
})

// --- Rendu des écrans ----------------------------------------------------
checks.push({
  name: 'écran d’accueil',
  run: () => {
    const html = renderToStaticMarkup(
      <WelcomeScreen onCreateMeeting={() => {}} onJoinMeeting={() => {}} />,
    )
    expect(html.includes('Vos rendez-vous,'), 'slogan présent')
    expect(html.includes('Créer une réunion'), 'bouton de création')
    expect(html.includes('Rejoindre'), 'bouton rejoindre')
    expect(html.includes('Lien ou identifiant de réunion'), 'champ d’identifiant')
    expect(html.includes('PhilDEV'), 'marque PhilDEV')
    expect(html.includes('Visio'), 'marque Visio')
    expect(html.includes('lang="fr"') === false, 'aucun attribut parasite')
    expect(html.length > 2000, 'markup non trivial')
  },
})

checks.push({
  name: 'route inconnue',
  run: () => {
    const html = renderToStaticMarkup(<UnknownRouteScreen path="/inconnu" onGoHome={() => {}} />)
    expect(html.includes('Page introuvable'), 'titre de page introuvable')
    expect(html.includes('/inconnu'), 'chemin affiché')
  },
})

let failures = 0
for (const check of checks) {
  console.log(`\n▶ ${check.name}`)
  try {
    check.run()
  } catch (error) {
    failures += 1
    console.error(`  ✗ ${(error as Error).message}`)
  }
}

console.log(`\n${checks.length - failures}/${checks.length} groupes de vérifications réussis`)
if (failures > 0) process.exit(1)