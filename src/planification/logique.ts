// Logique pure de la planification (T3.8, CONTEXTE §13). Le serveur propose l'ordre, calcule le
// supplément et l'estimation ; l'écran ne fait que choisir et ranger.
import { entierPositif } from '../format/saisie'

export type Plage = 'matin' | 'apres_midi' | 'soir'
export type Niveau = 'normal' | 'prioritaire' | 'matinal'
export type Regime = 'achat' | 'facon' | 'mixte'

export const PLAGES: readonly Plage[] = ['matin', 'apres_midi', 'soir']
export const NIVEAUX: readonly Niveau[] = ['normal', 'prioritaire', 'matinal']

export interface LotAPlanifier {
  id: number
  numero: number
  apporteur: string
  regime: Regime
  net_kg: number
  reste_kg: number
  arrivee: string
  prix_en_attente: boolean
}

export interface Reservation {
  id: number
  lot: { id: number; numero: number }
  apporteur: string
  regime: Regime
  quantite_prevue_kg: number
  date_souhaitee: string
  plage_souhaitee: Plage
  niveau_service: Niveau
  supplement_millimes: number
  statut: string
  ordre_priorite: number
  actions_possibles: string[]
  rang?: number
  debut_estime_min?: number | null
  duree_estimee_min?: number | null
}

export interface Planification {
  lots_a_planifier: LotAPlanifier[]
  reservations: Reservation[]
  capacite_kg_h: number | null
  actions_possibles: string[]
}

export interface SaisieReservation {
  date: string
  plage: Plage
  niveau: Niveau
  quantite: string
}

export const CHEMIN_PLANIFICATION = '/api/planification'
export const CHEMIN_RESERVATIONS = '/api/planification/reservations'
export const CHEMIN_ORDRE = '/api/planification/ordre'

export function cheminAnnulation(reservationId: number): string {
  return `${CHEMIN_RESERVATIONS}/${reservationId}/annulation`
}

/** Un lot à façon ou mixte se planifie en entier : la quantité ne se saisit que pour un achat. */
export function quantiteSaisissable(lot: LotAPlanifier): boolean {
  return lot.regime === 'achat'
}

/** Le matinal se réserve le matin : choisir ce niveau ramène la plage au matin. */
export function avecNiveau(saisie: SaisieReservation, niveau: Niveau): SaisieReservation {
  return { ...saisie, niveau, plage: niveau === 'matinal' ? 'matin' : saisie.plage }
}

/** Corps de la commande, ou null si la quantité saisie est illisible ou dépasse le reste. */
export function corpsReservation(lot: LotAPlanifier, saisie: SaisieReservation) {
  const corps = { lot_id: lot.id, date_souhaitee: saisie.date, plage_souhaitee: saisie.plage, niveau_service: saisie.niveau }
  if (!quantiteSaisissable(lot) || saisie.quantite.trim() === '') return corps
  const quantite = entierPositif(saisie.quantite)
  if (quantite === null || quantite > lot.reste_kg) return null
  return { ...corps, quantite_prevue_kg: quantite }
}

/** Réservations regroupées par jour, dans l'ordre reçu du serveur. */
export function parJour(reservations: readonly Reservation[]): { date: string; reservations: Reservation[] }[] {
  const jours: { date: string; reservations: Reservation[] }[] = []
  for (const reservation of reservations) {
    const dernier = jours[jours.length - 1]
    if (dernier !== undefined && dernier.date === reservation.date_souhaitee) dernier.reservations.push(reservation)
    else jours.push({ date: reservation.date_souhaitee, reservations: [reservation] })
  }
  return jours
}

/** Monte (-1) ou descend (+1) une réservation d'un rang dans la liste d'un jour ; sinon liste inchangée. */
export function deplacer(ids: readonly number[], id: number, sens: -1 | 1): number[] {
  const position = ids.indexOf(id)
  const cible = position + sens
  if (position < 0 || cible < 0 || cible >= ids.length) return [...ids]
  const suite = [...ids]
  suite[position] = ids[cible] as number
  suite[cible] = id
  return suite
}

export function memeOrdre(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((id, rang) => id === b[rang])
}

/** Raison obligatoire pour ranger l'ordre d'un jour (CONTEXTE §13), sinon null. */
export function corpsOrdre(date: string, ids: readonly number[], motif: string) {
  const raison = motif.trim()
  return raison === '' ? null : { date_souhaitee: date, reservations: [...ids], motif: raison }
}

/** « 95 » → « 1 h 35 » ; « 30 » → « 30 min ». */
export function afficherMinutes(minutes: number): string {
  const heures = Math.trunc(minutes / 60)
  const reste = minutes % 60
  return heures === 0 ? `${reste} min` : `${heures} h ${String(reste).padStart(2, '0')}`
}
