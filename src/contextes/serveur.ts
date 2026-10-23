import { createContext, useContext } from 'react'
import type { EtatServeur } from '../types'

export interface ValeurServeur {
  /** Dernier `/api/etat` reçu ; `null` tant qu'aucune réponse. */
  etat: EtatServeur | null
  /** `false` dès qu'une lecture ou une commande n'atteint pas le serveur. */
  disponible: boolean
  /** `null` = pas encore connu ; `true` = première mise en service à faire (T1.6). */
  miseEnServiceRequise: boolean | null
  /** À appeler quand la mise en service vient d'être terminée. */
  reverifierMiseEnService: () => Promise<void>
}

export const ContexteServeur = createContext<ValeurServeur>({
  etat: null,
  disponible: true,
  miseEnServiceRequise: null,
  reverifierMiseEnService: () => Promise.resolve(),
})

export function useServeur(): ValeurServeur {
  return useContext(ContexteServeur)
}
