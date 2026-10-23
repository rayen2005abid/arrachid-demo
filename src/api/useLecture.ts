import { useCallback, useEffect, useState } from 'react'
import { lire } from './client'
import { messageUtilisateur } from './erreurs'

/**
 * Lecture GET d'une ressource, avec rechargement manuel ou périodique (`periodeMs`, ex. 5000 pour une file d'attente).
 * Quand le chemin change, les données du chemin précédent restent jusqu'à la réponse ; `cheminLu` dit d'où elles
 * viennent.
 */
export function useLecture<T>(chemin: string | null, periodeMs?: number) {
  const [donnees, definirDonnees] = useState<T | null>(null)
  const [cheminLu, definirCheminLu] = useState<string | null>(null)
  const [erreur, definirErreur] = useState<string | null>(null)
  const [chargement, definirChargement] = useState(chemin !== null)

  const recharger = useCallback(async () => {
    if (chemin === null) return
    try {
      definirDonnees(await lire<T>(chemin))
      definirCheminLu(chemin)
      definirErreur(null)
    } catch (e) {
      definirErreur(messageUtilisateur(e))
    } finally {
      definirChargement(false)
    }
  }, [chemin])

  useEffect(() => {
    void recharger()
    const actualiser = () => void recharger()
    window.addEventListener('arrachid-demo-modifiee', actualiser)
    const minuteur = periodeMs === undefined ? undefined : setInterval(actualiser, periodeMs)
    return () => { clearInterval(minuteur); window.removeEventListener('arrachid-demo-modifiee', actualiser) }
  }, [recharger, periodeMs])

  return { donnees, cheminLu, erreur, chargement, recharger }
}
