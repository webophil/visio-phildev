/**
 * Messages informatifs sur les fonctionnalités volontairement hors du périmètre
 * de la Phase 1. Ils sont affichés dans l'interface afin de ne jamais laisser
 * croire qu'une fonction distante est active alors qu'elle ne l'est pas.
 */
export const PHASE_2 = {
  remoteParticipantsShort: 'Aucun autre participant connecté',
  remoteParticipants:
    "Phase 1 : vous êtes seul dans cette réunion. La connexion des participants distants arrivera avec l'infrastructure temps réel (Cloudflare RealtimeKit).",
  remoteParticipantsPanel:
    "Seul votre participant local est affiché. Les participants distants nécessitent le transport temps réel, non branché en Phase 1.",
  chat: "Le chat sera activé en Phase 2, en même temps que la connexion temps réel. Aucun message n'est transmis pour le moment.",
  backgroundEffects:
    "Le flou et les fonds virtuels demandent une segmentation vidéo (pipeline de traitement d'image). Ces réglages seront activés en Phase 2 — ils sont désactivés ici plutôt que simulés.",
  screenShareNote:
    "Le partage d'écran est local : aucune autre personne ne voit encore votre écran, faute de connexion distante.",
  meetingLinks:
    "Phase 1 : les réunions fonctionnent sur cet appareil uniquement. Aucun serveur de signalisation n'est encore connecté.",
  inviteLink: "Le lien est prêt à être partagé, mais il n'ouvre pas encore de salle distante (Phase 1).",
} as const
