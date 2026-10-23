// « Quitter » : fermeture de l'application sur ce poste (maquette MES, BUR-01). Le navigateur ne peut pas se fermer
// seul : la session est verrouillée et l'écran « fermé sur ce poste » remplace tout jusqu'à « Rouvrir ». Le serveur
// et les autres postes ne sont pas touchés. Petit état partagé hors de React : la coquille disparaît au verrouillage.
import { useSyncExternalStore } from 'react'

export interface PosteFerme {
  /** Heure de fermeture « HH:MM » et nom de qui a quitté. */
  heure: string
  par: string
}

let courant: PosteFerme | null = null
const ecouteurs = new Set<() => void>()
const diffuser = () => ecouteurs.forEach((ecouteur) => ecouteur())

export function fermerLePoste(etat: PosteFerme): void {
  courant = etat
  diffuser()
}
export function rouvrirLePoste(): void {
  courant = null
  diffuser()
}
export function usePosteFerme(): PosteFerme | null {
  return useSyncExternalStore(
    (ecouteur) => {
      ecouteurs.add(ecouteur)
      return () => void ecouteurs.delete(ecouteur)
    },
    () => courant,
    () => null,
  )
}
