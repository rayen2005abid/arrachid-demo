import { createContext, useContext } from 'react'
import type { DescriptionSession, UtilisateurListe } from '../types'
import type { Brouillons } from './brouillons'

export type StatutSession =
  | 'chargement'
  | 'indisponible' // serveur injoignable au démarrage
  | 'non_appaire'
  | 'deconnecte'
  | 'verrouille' // session terminée (inactivité, 401, bouton) : même utilisateur présélectionné
  | 'connecte'

export interface ValeurSession {
  /** Brouillons privés en mémoire, effacés au changement d'utilisateur. Aucun PIN. */
  brouillons?: Brouillons
  statut: StatutSession
  session: DescriptionSession | null
  /** Utilisateur à présélectionner au déverrouillage. */
  utilisateurVerrouille: UtilisateurListe | null
  connecter: (utilisateurId: number, pin: string) => Promise<void>
  /** Bouton « Verrouiller » : ferme la session côté serveur puis affiche l'écran de verrouillage. */
  verrouiller: () => Promise<void>
  /** Écran de verrouillage → liste complète des noms. */
  changerUtilisateur: () => void
  /** À appeler après un appairage réussi. */
  recharger: () => Promise<void>
}

export const ContexteSession = createContext<ValeurSession | null>(null)

export function useSession(): ValeurSession {
  const valeur = useContext(ContexteSession)
  if (valeur === null) throw new Error('FournisseurSession manquant')
  return valeur
}

/** Session ouverte : à utiliser dans les écrans opérationnels (toujours connectés). */
export function useSessionOuverte(): DescriptionSession {
  const { session } = useSession()
  if (session === null) throw new Error('Aucune session ouverte')
  return session
}
