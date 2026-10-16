# PhilDEV Visio — Phase 2

Application de visioconférence de PhilDEV, pensée pour les rendez-vous clients et la
collaboration avec un stagiaire. Interface entièrement en français, sans installation ni
création de compte pour les participants invités.

Cible de déploiement : `https://visio.phildev.online` — exemple de rendez-vous : `/rdv-aurore`.

Prévisualisation en ligne (FreeBuff Sites) :
`https://site-7d9cd941571b45a0933cc272119d3f4b.freebuff.page`. Cette adresse appartient au
projet de déploiement : elle change si le site est recréé.

> **Phase 2 : visioconférence réelle.** Les flux audio et vidéo transitent par **Cloudflare
> RealtimeKit** (SFU). Deux navigateurs distants se voient et se parlent réellement. Les invités
> rejoignent avec un lien, sans compte. Aucun participant n'est simulé.

## Stack

| Élément | Choix |
| --- | --- |
| Interface | React 19 + TypeScript |
| Outillage | Vite 8 |
| Styles | Tailwind CSS 4 (plugin `@tailwindcss/vite`, thème déclaré dans `src/index.css`) |
| Icônes | `lucide-react` |
| Temps réel | `@cloudflare/realtimekit` 2.0.3 + `@cloudflare/realtimekit-react` 2.0.3 |
| Médias | SDK RealtimeKit (`Client.initMedia`) — une seule capture des périphériques |
| Routage | Routeur minimal interne (`src/lib/router.ts`, History API) |
| Lint | Oxlint (`npm run lint`) |
| Déploiement | FreeBuff Sites : Worker Cloudflare + assets statiques (voir « Déploiement ») |

## Architecture

```
Navigateur ──► Worker FreeBuff (/api/...)  ──► API Cloudflare RealtimeKit
    │             (jeton d'API, jamais exposé)
    └──────► Cloudflare RealtimeKit (SFU : audio, vidéo, partage d'écran)
```

| Fichier | Rôle |
| --- | --- |
| `worker/index.js` | Routeur : API (`/api/...`) puis service des assets avec repli SPA |
| `worker/realtimekit.js` | Client REST RealtimeKit (création de réunion, participants, presets) |
| `worker/hostAuth.js` | Session organisateur signée (HMAC-SHA-256), sans base de données |
| `worker/rateLimit.js` | Limitation de débit en mémoire (fenêtre glissante) |
| `src/meeting/transport/RealtimeKitTransport.ts` | Seule frontière avec le SDK côté navigateur |
| `src/media/useRtkMedia.ts` | Capture des périphériques par le SDK (écran de préparation) |
| `src/meeting/rtkApi.ts` | Appels typés à l'API du Worker |
| `src/meeting/hostSession.ts` | Session organisateur et identifiant d'invité, côté navigateur |
| `src/meeting/useCreateMeeting.ts` | Création d'une réunion puis ouverture de la salle |

Le SDK est la **source de vérité** des états audio/vidéo : les composants consomment
l'instantané produit par le transport (`MeetingSessionState`), jamais une intention locale. Aucune
capture `getUserMedia` parallèle n'est ouverte à côté de celle du SDK.

## Secrets et identifiants

| Nom | Type | Rôle |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | **secret** (FreeBuff Sites) | Jeton d'API Cloudflare à portée « Realtime Admin ». Utilisé uniquement par le Worker. |
| `PHILDEV_HOST_KEY` | **secret** (FreeBuff Sites) | Clé organisateur, à définir par PhilDEV. Comparée à temps constant ; sert à signer la session. |

Sans `PHILDEV_HOST_KEY`, l'accès organisateur répond `503 host-key-missing` : la création de
réunion et le rôle d'hôte restent fermés, les invités ne sont pas affectés.

L'identifiant de compte (`adad9ec2e55b7a9279e74eea378c3a54`) et l'application RealtimeKit
(`09fe762d-4e8d-45c7-9129-a466ae061711`) sont des valeurs **non secrètes**, déclarées dans
`worker/realtimekit.js` et surchargeables par `RTK_ACCOUNT_ID` / `RTK_APP_ID`. Les noms de presets
(`group_call_host`, `group_call_participant`) sont surchargeables par `RTK_HOST_PRESET` /
`RTK_GUEST_PRESET`.

> Le jeton d'API n'est jamais transmis au navigateur, jamais journalisé et jamais renvoyé dans une
> réponse. Seuls les jetons **participant** (portée limitée à une réunion et à un preset)
> franchissent la frontière serveur → navigateur, uniquement au moment d'entrer en salle.

## API du Worker

| Méthode | Chemin | Accès | Rôle |
| --- | --- | --- | --- |
| `GET` | `/api/health` | public | Disponibilité du service |
| `POST` | `/api/host/session` | clé organisateur | Échange la clé contre une session signée (30 jours) |
| `POST` | `/api/meetings` | **session hôte** | Crée une réunion et réserve l'emplacement de l'organisateur |
| `POST` | `/api/rtk/token` | public (invité) / session (hôte) | Délivre un jeton de participation |
| `GET` | `/api/rtk/diagnostic` | **session hôte** | État en lecture seule (presets, configuration) — aucun secret |

Garanties communes : réponses `Cache-Control: no-store`, refus des mutations cross-origin,
limitation de débit par adresse cliente, et messages d'erreur en français sans détail amont.

### Limite de cinq participants

Le décompte s'appuie sur l'API RealtimeKit : les **identifiants participants distincts** de la
réunion sont comptés au moment où un invité demande son jeton. L'organisateur occupe le premier
emplacement (réservé dès la création), ce qui laisse quatre invités. Deux conséquences voulues :

- une **reconnexion** ne consomme pas d'emplacement supplémentaire (le même identifiant est
  réutilisé, il est mémorisé par navigateur et par réunion) ;
- l'**organisateur n'est jamais bloqué**, même si la salle est pleine.

Limite assumée : le comptage porte sur les participants **enregistrés**, pas sur une présence
temps réel (l'API RealtimeKit n'expose pas d'état « connecté » sur cette ressource). Un invité qui
obtient un jeton sans entrer occupe donc un emplacement. Une garantie stricte exigerait soit la
ressource « session active » de RealtimeKit, soit un compteur partagé (D1 ou Durable Object) —
volontairement écartés à ce stade.

### Accès organisateur

La clé `PHILDEV_HOST_KEY` n'est envoyée qu'une fois, au serveur, qui la compare à temps constant et
renvoie une session **signée** (`payload.signature`, HMAC-SHA-256) avec sa date d'expiration. Le
navigateur ne conserve que cette session, révocable depuis la boîte de dialogue « Accès
organisateur ». Les invariants vérifiés par les tests : création de réunion et attribution du
preset `group_call_host` impossibles sans session valide, et jeton d'API absent de toutes les
réponses.

## Démarrage

```bash
npm install
npm run dev        # http://localhost:3000
```

Les endpoints `/api/...` n'existent qu'une fois déployés (Worker). En développement local, la page
d'accueil l'indique explicitement : créez et testez les réunions depuis l'adresse de
prévisualisation.

### Vérifications

```bash
npm run typecheck   # TypeScript
npm run lint        # Oxlint
npm run test:smoke  # routeur, identifiants, formatage, rendu des écrans
npm run test:worker # Worker : routage, repli SPA, API, autorisations, capacité, anti-fuite
```

`test:worker` exécute le handler `fetch` du Worker avec un binding `ASSETS` simulé et une API
Cloudflare RealtimeKit interceptée : aucun appel réseau réel, aucune réunion créée.

## Déploiement — FreeBuff Sites

L'artefact publié est **`dist/`**, produit par `npm run build`, servi par le Worker Cloudflare.
Deux fichiers versionnés suffisent à reproduire un déploiement :

| Fichier | Rôle |
| --- | --- |
| `preview.manifest.json` | Manifeste : `entrypoint`, `modules` (4 fichiers du Worker), `assetsDirectory` |
| `worker/*.js` | Worker : API RealtimeKit puis service des assets |

`dist/` n'est pas versionné : il est reconstruit par `npm run build` avant tout déploiement.

### Déploiement explicite uniquement

Un déploiement est **toujours un appel explicite** à l'outil Sites, avec un environnement
(`preview` ou `production`) et une clé d'idempotence. Ce dépôt ne contient **aucune** configuration
d'intégration continue (ni `.github/`, ni `wrangler.toml`) et le site n'est relié à aucun dépôt :
**un commit ou un push GitHub ne déclenche aucun déploiement**. La production n'est jamais publiée
sans autorisation explicite.

### Pourquoi `spa: true` doit rester absent du manifeste

Le drapeau `spa: true` délègue la gestion des chemins inconnus à la couche **assets** de la
plateforme, qui répond alors `index.html` avec un statut **200** pour *toute* requête sans
correspondance — y compris un JavaScript, un CSS, une image ou une source map absents. Une erreur
de livraison se retrouve ainsi masquée par une page d'accueil « 200 », et le Worker n'est même pas
consulté. Le manifeste reste donc volontairement sans `spa` : la décision revient au Worker, où
elle est explicite et testable.

### Repli SPA du Worker

`worker/index.js` ne sert `index.html` que si la requête est une **navigation de l'application**,
ce qui exige les trois conditions suivantes :

1. méthode `GET` ou `HEAD` ;
2. dernier segment du chemin **sans extension** (donc pas `/assets/index-abc123.js`) ;
3. `Sec-Fetch-Mode: navigate` (signal envoyé par les navigateurs modernes) ou, à défaut,
   `Accept` contenant `text/html`.

Tout le reste conserve son statut d'origine : une ressource absente reste **404**. Une navigation
vers `/rdv-aurore?r=…` reçoit `index.html` en 200, puis le routeur client (`src/lib/router.ts`)
prend la suite.

> Nuance mesurée en ligne : la plateforme injecte son beacon d'analyse (Cloudflare Web Analytics)
> dans les documents servis à une navigation. Le document reçu peut donc compter quelques
> centaines d'octets de plus que `dist/index.html` ; le reste du contenu est identique.

## Liens d'invitation

Un identifiant lisible (`/rdv-aurore`) nomme le rendez-vous ; la réunion Cloudflare, elle, est
désignée par un identifiant transporté par le lien : `/rdv-aurore?r=<uuid>`. Ce paramètre **n'est
pas un secret** — le lien est l'invitation — mais il ne contient jamais de jeton de participation :
chaque participant reçoit le sien au moment d'entrer.

Conséquence : un lien réduit à `/rdv-aurore`, sans `?r=`, n'ouvre aucune réunion. L'application le
dit clairement et propose à l'organisateur de rattacher le rendez-vous à une nouvelle réunion.
Rendre les identifiants lisibles résolvables sans paramètre demanderait une table de
correspondance persistée (D1) — hors périmètre à ce stade.
