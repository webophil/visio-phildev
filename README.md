# PhilDEV Visio — Phase 1

Application de visioconférence de PhilDEV, pensée pour les rendez-vous clients et la
collaboration avec un stagiaire. Interface entièrement en français, sans installation ni
création de compte pour les participants invités.

Cible de déploiement : `https://visio.phildev.online` — exemple de rendez-vous : `/rdv-aurore`.

> **Phase 1 : réunions locales.** Aucune infrastructure temps réel n'est connectée. Les
> identifiants de réunion sont créés localement et ne désignent pas encore de salle distante.
> Aucun participant distant n'est simulé et aucune connectivité n'est annoncée à tort.

## Stack

| Élément | Choix |
| --- | --- |
| Interface | React 19 + TypeScript |
| Outillage | Vite 8 |
| Styles | Tailwind CSS 4 (plugin `@tailwindcss/vite`, thème déclaré dans `src/index.css`) |
| Icônes | `lucide-react` |
| Médias | API navigateur natives : `getUserMedia`, `getDisplayMedia`, `enumerateDevices`, `devicechange` |
| Routage | Routeur minimal interne (`src/lib/router.ts`, History API) — deux routes |
| Lint | Oxlint (`npm run lint`) |

Aucune dépendance supplémentaire : ni Supabase, ni Firebase, ni Convex, ni base de données.

## Démarrage

```bash
npm install
npm run dev        # http://localhost:3000
```

### Environnement de prévisualisation

Le serveur de développement écoute sur `0.0.0.0:3000`. Vite n'autorise que `localhost`, les
adresses IP et les hôtes déclarés : aucun nom d'hôte temporaire n'est inscrit dans un fichier
versionné. Pour une prévisualisation distante, l'hôte est injecté au lancement via la variable
native de Vite :

```bash
__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=exemple.style.dev npm run dev
```

Cette variable n'a aucun effet sur `vite build` : la configuration de production n'en dépend pas.

## Scripts

| Script | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement (port 3000) |
| `npm run build` | Vérification TypeScript (`tsc -b`) puis build de production |
| `npm run typecheck` | Vérification TypeScript seule |
| `npm run lint` | Analyse statique Oxlint |
| `npm run test:smoke` | Vérifications de rendu et de logique (routeur, identifiants, formatage, écrans) |
| `npm run preview` | Sert le build de production localement |

## Parcours utilisateur

1. **Accueil** (`/`) — marque PhilDEV Visio, slogan « Vos rendez-vous, simplement. », bouton
   « Créer une réunion », champ de saisie d'un lien ou identifiant et bouton « Rejoindre ».
2. **Pré-réunion** (`/rdv-<identifiant>`) — nom du participant, aperçu réel de la caméra,
   activation du micro et de la caméra, choix des périphériques, gestion des permissions.
3. **Réunion** — scène vidéo, durée, participant local, micro, caméra, partage d'écran,
   effets de fond, panneaux participants et chat, copie du lien d'invitation, quitter.

## Architecture

```
src/
├── components/
│   ├── Brand/        Logo typographique provisoire (PhilDevLogo)
│   ├── meeting/      Scène, barre de contrôle, panneaux, lien d'invitation
│   ├── screens/      Accueil, pré-réunion, réunion, route inconnue
│   └── ui/           Primitives accessibles (bouton, champ, panneau, notice…)
├── lib/              Routeur, identifiants, formatage, presse-papiers, erreurs médias
├── media/            Matériel local : périphériques, getUserMedia, partage d'écran
├── meeting/transport Frontière d'intégration temps réel (interface + transport local)
├── state/            Session de réunion (contexte + provider)
└── types/            Types du domaine
```

Séparation des responsabilités :

- **UI** — uniquement des composants de présentation et d'interaction.
- **État de réunion** (`src/state`) — phase de session, panneaux, durée, participant local.
- **Matériel** (`src/media`) — acquisition, bascule, changement de périphérique, libération.
- **Transport** (`src/meeting/transport`) — seul point à remplacer pour brancher le temps réel.

### Frontière d'intégration Cloudflare RealtimeKit

`MeetingTransport` (`src/meeting/transport/types.ts`) décrit le contrat consommé par l'état :
`join`, `leave`, publication des flux locaux et d'écran, activation micro/caméra, état de
connexion. La Phase 1 fournit `LocalOnlyTransport`, qui n'ouvre aucune connexion réseau et
déclare `supportsRemoteParticipants: false`.

L'intégration Phase 2 consiste à ajouter un `RealtimeKitTransport` et à le renvoyer depuis
`createTransport()` (`src/meeting/transport/index.ts`). Les composants n'auront pas à changer.
Conformément à l'architecture RealtimeKit (SFU), la création de réunion et la délivrance des
jetons participants devront s'exécuter côté serveur (Cloudflare Worker) : **aucun identifiant
d'API Cloudflare ne doit être exposé au navigateur**. Aucun serveur de signalisation WebRTC
maison n'est prévu.

## Accessibilité et fiabilité

- Boutons bascules avec `aria-pressed`, libellés permanents et états explicites.
- Alertes `role="alert"` pour les erreurs, régions `aria-live` pour la copie du lien.
- Contraste élevé sur fond bleu nuit, focus visible, cibles tactiles généreuses.
- Pistes arrêtées systématiquement : changement de périphérique, sortie de réunion,
  démontage du composant (`track.stop()` sur chaque piste).
- Coupure de piste (`ended`) détectée et signalée en français (matériel débranché).
- Erreurs `getUserMedia` / `getDisplayMedia` traduites : refus, absence de périphérique,
  matériel occupé, contexte non sécurisé, navigateur non compatible.

## Périmètre de la Phase 1

**Fonctionnel :** accueil, création et saisie d'identifiant local, pré-réunion avec aperçu réel,
bascule micro/caméra, choix des périphériques, réunion avec durée, partage d'écran natif,
panneaux participants et chat, copie du lien, sortie propre.

**Volontairement différé (Phase 2) :** participants distants et signalisation, chat réellement
transmis, flou et fonds virtuels (segmentation vidéo), authentification, enregistrement,
déploiement Cloudflare Workers.

## Limitations connues

- Les réunions ne sont **pas** partagées entre appareils : l'identifiant est local.
- Les effets de fond sont présentés comme indisponibles : ils ne sont pas simulés.
- Le partage d'écran dépend du navigateur (généralement indisponible sur mobile).
- L'accès caméra/micro exige HTTPS ou `localhost`.