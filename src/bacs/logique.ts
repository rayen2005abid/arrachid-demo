// Logique pure de la grille des bacs (T2.3, CONTEXTE §7.6, E-11). Le serveur reste juge :
// un bac n'est libéré que par la commande de libération avec la confirmation explicite.

export type Regime = 'achat' | 'facon' | 'mixte'

export interface Occupation {
  bac_reception_id: number
  reception_id: number
  numero_reception: number
  apporteur: string
  regime: Regime
  occupe_le: string
}

export interface Bac {
  id: number
  numero: number
  libelle: string
  etat: 'libre' | 'occupe'
  occupation: Occupation | null
  actions_possibles: string[]
}

export const CHEMIN_GRILLE = '/api/bacs-reception/grille'

export function cheminLiberation(bacReceptionId: number): string {
  return `/api/bacs-reception/${bacReceptionId}/liberation`
}

/** Corps de la commande : envoyé seulement après que l'opérateur a confirmé le vidage physique. */
export function corpsLiberation(): { confirmation_vide: true } {
  return { confirmation_vide: true }
}

/** Le bouton « Confirmer bac vidé » n'existe que si le serveur l'a proposé pour un bac occupé. */
export function peutLiberer(bac: Bac): boolean {
  return bac.etat === 'occupe' && bac.occupation !== null && bac.actions_possibles.includes('liberer')
}

export function compter(bacs: readonly Bac[]): { libres: number; occupes: number } {
  const occupes = bacs.filter((b) => b.etat === 'occupe').length
  return { libres: bacs.length - occupes, occupes }
}

export type FiltreBacs = 'tous' | 'libres' | 'occupes'

/** Bacs du filtre choisi, d'après l'état donné par le serveur. */
export function filtrer(bacs: readonly Bac[], filtre: FiltreBacs): Bac[] {
  if (filtre === 'tous') return [...bacs]
  return bacs.filter((b) => (filtre === 'libres' ? b.etat === 'libre' : b.etat === 'occupe'))
}

/** Ordre stable de la grille : par numéro de bac. */
export function trierParNumero(bacs: readonly Bac[]): Bac[] {
  return [...bacs].sort((a, b) => a.numero - b.numero)
}
