// Logique pure de l'écran Décomptes (T5.1, T5.2 ; T-164, A3). L'état d'une réception vient seulement des champs du
// serveur : `statut_reception`, `pret`, `decompte_id`, `regle`, puis `sens_net` et `lot_statut` du décompte émis.
// Rien n'est calculé avant l'émission (A13) : les montants sont ceux du décompte archivé.
import { MODES, type ModePaiement } from '../caisse/avances'
import { simplifier } from '../comptes/comptes'

export type Regime = 'achat' | 'facon' | 'mixte'
export type SensNet = 'a_payer' | 'a_encaisser' | 'nul'

/** Ligne de `/api/decomptes` : une réception de la campagne active et son décompte éventuel. */
export interface ReceptionDecompte {
  reception_id: number
  reception_numero: number
  regime: Regime
  statut_reception: string
  apporteur: string
  apporteur_id: number
  decompte_id: number | null
  pret: boolean
  /** 1 quand un règlement en vigueur est lié au décompte. */
  regle: number
  /** Statut du lot : le règlement final exige `produit`. */
  lot_statut: string | null
  /** EM-02 (M17) : pourquoi un décompte émis attend encore, dit par le serveur ; sinon `null`. */
  attente_reglement: string | null
}

export interface LigneDecompte {
  type: string
  libelle: string
  montant_millimes: number
}

/** `/api/decomptes/{id}` : le décompte émis, ses lignes figées et son net. */
export interface Decompte {
  id: number
  numero: number
  serie: string
  net_millimes: number
  sens_net: SensNet
  lot_statut: string | null
  attente_reglement: string | null
  regle: boolean
  recu_id: number | null
  lignes: LigneDecompte[]
}

export const CHEMIN_DECOMPTES = '/api/decomptes'

export function cheminDecompte(id: number): string {
  return `${CHEMIN_DECOMPTES}/${id}`
}

export function cheminPdfDecompte(id: number): string {
  return `${CHEMIN_DECOMPTES}/${id}/pdf`
}

export function cheminPdfRecu(recuId: number): string {
  return `/api/reglements/${recuId}/pdf`
}

export type EtatDecompte = 'en_attente' | 'a_emettre' | 'a_regler' | 'soldee'
export type FiltreDecomptes = 'a_faire' | EtatDecompte | 'toutes'
export const FILTRES_DECOMPTES: readonly FiltreDecomptes[] = ['a_faire', 'a_emettre', 'a_regler', 'en_attente', 'soldee', 'toutes']

/**
 * Soldé (règlement lié), à régler (décompte émis, lot produit), à émettre (prêt selon le serveur), sinon en attente.
 * Un décompte émis dont le lot n'est pas produit ne peut pas se régler : il attend, il ne compte pas « À régler » (M17).
 */
export function etatReception(ligne: ReceptionDecompte): EtatDecompte {
  if (ligne.regle) return 'soldee'
  if (ligne.decompte_id !== null) return ligne.lot_statut === 'produit' ? 'a_regler' : 'en_attente'
  return ligne.pret ? 'a_emettre' : 'en_attente'
}

function correspond(ligne: ReceptionDecompte, filtre: FiltreDecomptes): boolean {
  if (filtre === 'toutes') return true
  const etat = etatReception(ligne)
  return filtre === 'a_faire' ? etat === 'a_emettre' || etat === 'a_regler' : etat === filtre
}

/** Nombre exact de lignes reçues pour chaque filtre (audit §4.4). */
export function compterReceptions(lignes: readonly ReceptionDecompte[]): Record<FiltreDecomptes, number> {
  return Object.fromEntries(FILTRES_DECOMPTES.map((filtre) => [filtre, lignes.filter((l) => correspond(l, filtre)).length])) as Record<FiltreDecomptes, number>
}

/** Lignes du filtre choisi dont le nom de l'apporteur ou le numéro de réception contient la recherche. */
export function filtrerReceptions(lignes: readonly ReceptionDecompte[], filtre: FiltreDecomptes, recherche: string): ReceptionDecompte[] {
  const cle = simplifier(recherche)
  return lignes.filter((l) => correspond(l, filtre) && (cle === '' || simplifier(l.apporteur).includes(cle) || String(l.reception_numero).includes(cle)))
}

/** Statuts de la réception avant le ticket : la réception elle-même n'est pas finie. */
const AVANT_TICKET = ['pesee_brut', 'versee']

/**
 * Rang de l'étape en cours du parcours « Réception, prêt (prix fixé ou huile remise), décompte émis, réglé » :
 * 0 à 3, ou 4 quand tout est fait. Il ne vient que des champs du serveur.
 */
export function rangParcours(ligne: ReceptionDecompte): number {
  if (ligne.regle) return 4
  if (ligne.decompte_id !== null) return 3
  if (ligne.pret) return 2
  return AVANT_TICKET.includes(ligne.statut_reception) ? 0 : 1
}

export type Reglement = 'regle' | 'lot_non_produit' | 'caisse_fermee' | 'possible'

/** Ce que l'écran propose pour un décompte émis : les mêmes conditions que le serveur vérifie au règlement. */
export function reglementPossible(decompte: Pick<Decompte, 'regle' | 'lot_statut'>, caisseOuverte: boolean): Reglement {
  if (decompte.regle) return 'regle'
  if (decompte.lot_statut !== 'produit') return 'lot_non_produit'
  return caisseOuverte ? 'possible' : 'caisse_fermee'
}

/** CONTEXTE §25.3 (T-202) : avance en cours → le responsable ou le propriétaire émet le décompte et
 * décide de la déduction ; le serveur refuse l'opérateur (`decompte_avance_en_cours`). */
export function emissionReservee(avancesEnCours: number, peutImputer: boolean): boolean {
  return avancesEnCours > 0 && !peutImputer
}

/** Modes de règlement acceptés : la façon se règle en espèces seulement (règle du serveur, `verifier_mode`). */
export function modesPermis(regime: Regime): readonly ModePaiement[] {
  return regime === 'facon' ? ['especes'] : MODES
}
