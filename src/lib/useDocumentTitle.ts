import { useEffect } from 'react'

export const DEFAULT_DOCUMENT_TITLE = 'PhilDEV Visio — Vos rendez-vous, simplement.'

/** Met à jour le titre de l'onglet, puis restaure le titre par défaut. */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title
    return () => {
      document.title = DEFAULT_DOCUMENT_TITLE
    }
  }, [title])
}
