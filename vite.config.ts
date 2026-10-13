import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * Configuration Vite — PhilDEV Visio (Phase 1).
 *
 * Note sur les hôtes de prévisualisation :
 * `server.allowedHosts` valait auparavant `true` dans ce projet. Il est
 * volontairement laissé à sa valeur par défaut (liste vide) : Vite n'autorise
 * alors que `localhost`, les adresses IP et les hôtes explicitement déclarés.
 *
 * Pour les environnements de prévisualisation distants (FreeBuff Cloud), l'hôte
 * éphémère est fourni au lancement via la variable d'environnement native de
 * Vite, sans jamais inscrire de nom d'hôte temporaire dans un fichier versionné :
 *
 *   __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=exemple.style.dev npm run dev
 *
 * Cette variable n'a aucun effet sur `vite build` : la configuration de
 * production (Cloudflare Workers / assets statiques) n'en dépend pas.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 3000,
  },
  preview: {
    host: true,
    port: 4173,
  },
})
