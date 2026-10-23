/** Comptes des apporteurs par campagne (T5.5). Le serveur calcule tous les soldes. */
import type { TonPastille } from '../composants/Pastille'

export type Sens = 'a_payer' | 'a_encaisser' | 'nul'

export interface Montants {
  debit_millimes: number
  credit_millimes: number
  solde_millimes: number
  sens: Sens
}

export interface CompteResume extends Montants {
  apporteur_id: number
  nom: string
  cin_masquee: string | null
  nombre_ecritures: number
  derniere_ecriture_le: string
}

export interface ListeComptes {
  campagnes: { id: number; libelle: string; active: boolean }[]
  campagne_id: number | null
  comptes: CompteResume[]
  total_a_payer_millimes: number
  total_a_encaisser_millimes: number
}

export interface Ecriture {
  id: number
  date: string
  type: string
  libelle: string
  debit_millimes: number
  credit_millimes: number
  est_extourne: boolean
  annulee: boolean
  type_piece: string | null
  piece_numero: number | null
  decompte_id: number | null
  recu_id: number | null
  reception_numero: number | null
  solde_apres_millimes: number
}

export interface CompteDetail extends Montants {
  apporteur: { id: number; nom: string; cin_masquee: string | null; localite: string | null }
  campagne_id: number
  ecritures: Ecriture[]
}

/** « L'huilerie doit 1 250,000 DT », « L'apporteur doit 180,000 DT » ou « Compte soldé ». */
export function texteSolde(solde: number, formater: (millimes: number) => string): string {
  if (solde === 0) return 'Compte soldé'
  return solde > 0 ? `L’huilerie doit ${formater(solde)} DT` : `L’apporteur doit ${formater(-solde)} DT`
}

/**
 * Libellé d'une écriture : « Type — libellé », sans répéter le type quand le libellé du serveur commence déjà par lui
 * (« Achat d'olives », « Avance versée »).
 */
export function libelleEcriture(type: string, libelle: string): string {
  return simplifier(libelle).startsWith(simplifier(type)) ? libelle : `${type} — ${libelle}`
}

/** Couleur du solde : l'huilerie doit (à payer), l'apporteur doit (à encaisser), compte soldé. */
export function tonSolde(solde: number): TonPastille {
  if (solde === 0) return 'ok'
  return solde > 0 ? 'alerte' : 'violet'
}

/** Comparaison sans accents ni casse, pour filtrer la liste affichée par nom. */
export function simplifier(texte: string): string {
  return texte.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

export function filtrerComptes<T extends { nom: string }>(comptes: T[], saisie: string): T[] {
  const cle = simplifier(saisie)
  return cle === '' ? comptes : comptes.filter((c) => simplifier(c.nom).includes(cle))
}

/** Lien vers le PDF archivé de la pièce de l'écriture, s'il y en a un. */
export function lienPiece(e: Ecriture): string | null {
  if (e.decompte_id !== null) return `/api/decomptes/${e.decompte_id}/pdf`
  if (e.recu_id !== null) return `/api/reglements/${e.recu_id}/pdf`
  return null
}

export function cheminComptes(campagneId: number | null): string {
  return campagneId === null ? '/api/comptes/apporteurs' : `/api/comptes/apporteurs?campagne_id=${campagneId}`
}

export function cheminCompte(apporteurId: number, campagneId: number | null): string {
  const base = `/api/comptes/apporteurs/${apporteurId}`
  return campagneId === null ? base : `${base}?campagne_id=${campagneId}`
}
