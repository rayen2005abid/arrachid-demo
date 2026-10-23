// Logique pure de l'écran des contrats (T6.3). Quantité tapée en kg (envoyée en grammes), prix
// en DT/kg (envoyé en millimes) ; le serveur vérifie le stock et réserve.
import { kgVersGrammes } from '../administration/unites'
import type { Cuve, Registre } from '../cuves/logique'
import { uniteExacte } from '../format/saisie'
import { libelles } from '../libelles'

const e = libelles.contrats.erreurs

export type QualiteVendable = 'extra_vierge' | 'vierge'
export const QUALITES_VENDABLES: readonly QualiteVendable[] = ['extra_vierge', 'vierge']

export interface Reservation {
  id: number
  qualite: string
  cuve_id: number | null
  cuve_code: string | null
  poids_reserve_g: number
  statut: 'active' | 'consommee' | 'annulee' | 'expiree'
  reserve_le: string
}

export interface Contrat {
  id: number
  numero: number
  statut: 'actif' | 'solde' | 'annule'
  client: string
  client_id: number
  qualite: string
  quantite_prevue_g: number
  prix_unitaire_millimes_kg: number
  date_prevue: string
  cree_le: string
  reservations: Reservation[]
  actions_possibles: string[]
}

export interface ListeContrats extends Registre { contrats: Contrat[] }

export interface SaisieContrat {
  clientId: number | null
  qualite: QualiteVendable
  quantite: string
  prix: string
  datePrevue: string
  cuveId: string
}

export const SAISIE_VIDE: SaisieContrat = { clientId: null, qualite: 'extra_vierge', quantite: '', prix: '', datePrevue: '', cuveId: '' }

/** Cuves proposées : de la qualité du contrat, avec de l'huile non réservée. */
export function cuvesPossibles(cuves: readonly Cuve[], qualite: string): Cuve[] {
  return cuves.filter((c) => c.active && c.qualite_affectee === qualite && c.stock_disponible_g > 0)
}

export function corpsContrat(s: SaisieContrat): { corps: Record<string, unknown> | null; erreur: string | null } {
  const refuse = (erreur: string) => ({ corps: null, erreur })
  if (s.clientId === null) return refuse(e.client)
  const grammes = kgVersGrammes(s.quantite.trim())
  if (grammes === null || grammes <= 0) return refuse(e.quantite)
  const prix = uniteExacte(s.prix, 3)
  if (prix === null) return refuse(e.prix)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s.datePrevue)) return refuse(e.date)
  return {
    erreur: null,
    corps: {
      client_id: s.clientId, qualite: s.qualite, quantite_prevue_g: grammes,
      prix_unitaire_millimes_kg: prix, date_prevue: s.datePrevue, cuve_id: s.cuveId === '' ? null : Number(s.cuveId),
    },
  }
}

/** Réservation active d'un contrat, s'il en a une. */
export function reservationActive(c: Contrat): Reservation | null {
  return c.reservations.find((r) => r.statut === 'active') ?? null
}
