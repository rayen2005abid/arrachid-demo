/** Avances aux apporteurs (T5.3) : fermées tant que le propriétaire n'a pas répondu à P1. */

export type ModePaiement = 'especes' | 'cheque' | 'virement'

/** Modes de paiement, dans l'ordre des choix à l'écran. */
export const MODES: readonly ModePaiement[] = ['especes', 'cheque', 'virement']

export interface Avance {
  id: number
  apporteur_id: number
  apporteur: string
  montant_millimes: number
  mode: ModePaiement
  horodatage: string
  recu_id: number
  recu_numero: number
}

export interface LectureAvances {
  ouvertes: boolean
  actions_possibles: ('donner' | 'imputer')[]
  avances: Avance[]
}

export function cheminAvances(apporteurId?: number): string {
  return apporteurId === undefined ? '/api/avances' : `/api/avances?apporteur_id=${apporteurId}`
}

/** Coche ou décoche une avance à déduire ; l'ordre de la liste choisie reste croissant. */
export function basculer(choisies: number[], id: number): number[] {
  return choisies.includes(id) ? choisies.filter((x) => x !== id) : [...choisies, id].sort((a, b) => a - b)
}
