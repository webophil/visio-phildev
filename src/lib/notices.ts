/**
 * Messages affichés dans l'interface.
 * Ils décrivent l'état **réel** de l'application : ce qui fonctionne, ce qui est
 * volontairement hors périmètre, et ce qui dépend d'une action de
 * l'organisateur. Rien n'y est présenté comme actif à tort.
 */
export const NOTICES = {
  /** Invitation */
  inviteLink:
    "Toute personne qui possède ce lien peut rejoindre la réunion. Aucun compte n'est nécessaire côté invité.",
  inviteLinkHostOnly:
    "Ce lien est celui de la réunion Cloudflare. Il ne contient aucun jeton : chaque participant reçoit le sien au moment de rejoindre.",

  /** Capacité */
  capacity:
    "Une réunion accueille cinq personnes au maximum, organisateur compris. Le contrôle est effectué côté serveur, au moment où un participant rejoint.",

  /** Partage d'écran */
  screenShareNote:
    "Votre écran est transmis à tous les participants. Votre caméra reste visible en vignette pendant le partage.",

  /** Hors périmètre */
  chat: "Le chat écrit n'est pas disponible dans cette version : la réunion se limite à l'audio, la vidéo et le partage d'écran.",
  backgroundEffects:
    "Le flou et les fonds virtuels exigent une segmentation vidéo image par image. Ces réglages restent désactivés plutôt que présentés comme actifs.",

  /** Matériel */
  deviceFallback:
    "Si votre navigateur refuse l'accès au matériel, vous pouvez malgré tout rejoindre la réunion pour écouter et partager votre écran.",
} as const
