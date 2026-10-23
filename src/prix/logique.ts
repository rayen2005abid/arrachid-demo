// Logique pure de l'écran des prix (T3.4, CONTEXTE §12). Le serveur choisit l'unité, calcule et
// garde le montant ; l'aperçu affiché ici n'est qu'une aide à la saisie.
import { entierPositif, uniteExacte } from '../format/saisie'
import type { ChampAnalyse } from '../laboratoire/analyse'
import type { Validation } from '../types'

export type UnitePrix = 'kg_olives' | 'kg_huile'
export type SuiteRefus = 'facon' | 'retour'

export interface ReceptionAPrix {
  id: number
  numero: number
  apporteur: string
  regime: 'achat' | 'mixte'
  net_kg: number
  unite_prix: UnitePrix
  partage: { mode_partage: 'huile_kg' | 'pourcentage'; huile_agriculteur_declaree_g: number | null; pourcentage_agriculteur_centiemes: number | null } | null
  analyse: {
    reference: string
    acidite_centiemes: number
    taux_huile_centiemes: number
    rendement_prevu_centiemes: number
    humidite_centiemes: number
    variete: string | null
    saisi_le: string
    /** Mesures hors des plages du propriétaire (confirmées au labo) : à regarder avant le prix (EM-04). */
    inhabituelles: ChampAnalyse[]
  }
  actions_possibles: string[]
}

/** La mesure est-elle hors des plages habituelles ? Le serveur le dit ; l'écran ne compare rien. */
export function inhabituelle(reception: Pick<ReceptionAPrix, 'analyse'>, champ: ChampAnalyse): boolean {
  return reception.analyse.inhabituelles.includes(champ)
}

export interface PrixFixe {
  id: number
  statut: string
  unite_prix: UnitePrix
  /** Absent pour un refus. */
  prix_unitaire_millimes_kg: number | null
  suite_refus: SuiteRefus | null
  /** Pesée de la remorque à la sortie ; seulement après un refus suivi du retour des olives. */
  poids_retour_kg: number | null
  motif: string | null
  net_kg: number
  montant_millimes: number | null
  /** Ticket en cours de la réception (le remplaçant après un refus suivi de façon). */
  ticket: { piece_id: number; numero: number } | null
  valide_par: string
  valide_le: string
  reception: { id: number; numero: number; statut: string; regime: string; apporteur: string }
}

export const CHEMIN_ATTENTE = '/api/prix/en-attente'
export const CHEMIN_PRIX = '/api/prix'
export const CHEMIN_REFUS_FACON = '/api/prix/refus/facon'
export const CHEMIN_REFUS_RETOUR = '/api/prix/refus/retour'

/** Prix tapé en dinars (« 1,250 ») → millimes entiers ; vide, illisible, nul ou plus de 3 décimales → null. */
export function millimes(texte: string): number | null {
  if (texte.trim() === '') return null
  const valeur = uniteExacte(texte, 3)
  return valeur !== null && valeur > 0 ? valeur : null
}

/** Aperçu du montant d'un achat pur (net × prix) ; pour un mixte, connu seulement après la trituration. */
export function apercuMontant(reception: ReceptionAPrix, texte: string): number | null {
  const prix = millimes(texte)
  if (prix === null || reception.unite_prix !== 'kg_olives') return null
  const montant = reception.net_kg * prix
  return Number.isSafeInteger(montant) ? montant : null
}

/** Corps de la commande, ou null tant que le prix est illisible ou que le PIN frais manque. */
export function corpsPrix(receptionId: number, texte: string, validation: Validation | null) {
  const prix = millimes(texte)
  if (prix === null || validation === null) return null
  return { reception_id: receptionId, prix_unitaire_millimes_kg: prix, validation }
}

export function peutFixer(reception: ReceptionAPrix): boolean {
  return reception.actions_possibles.includes('fixer_prix')
}

export function peutRefuser(reception: ReceptionAPrix): boolean {
  return reception.actions_possibles.includes('refuser_prix')
}

/** Refus du prix : raison et PIN frais obligatoires (CONTEXTE §12.3), sinon null. */
export function corpsRefus(receptionId: number, motif: string, validation: Validation | null) {
  const raison = motif.trim()
  if (raison === '' || validation === null) return null
  return { reception_id: receptionId, motif: raison, validation }
}

/** Refus suivi du retour des olives (T3.6) : en plus, le poids de la remorque à la sortie, en kg entiers. */
export function corpsRetour(receptionId: number, motif: string, poidsTexte: string, validation: Validation | null) {
  const poids = entierPositif(poidsTexte)
  const corps = corpsRefus(receptionId, motif, validation)
  if (poids === null || corps === null) return null
  return { ...corps, poids_retour_kg: poids }
}
