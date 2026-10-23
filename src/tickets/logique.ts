// Logique pure du ticket (T2.4) : le serveur décide de tout, le client choisit seulement quoi afficher.
import { libelles } from '../libelles'
import { texteRecherche } from '../recherche/receptions'

const t = libelles.tickets

export type ResultatImpression = 'reussie' | 'echec' | 'non_confirmee'

/** État d'impression renvoyé par la tare et par `POST /api/pieces/{id}/impression`. */
export interface EtatImpression {
  piece_id: number
  statut: ResultatImpression
  /** Message du catalogue serveur (§14.4) ; null quand le ticket est imprimé. */
  message: string | null
  numero_impression: number | null
  nombre_impressions: number
}

export interface Impression {
  numero_impression: number
  resultat: ResultatImpression
  imprime_le: string
  imprime_par_nom: string
  poste_libelle: string
}

export interface Piece {
  id: number
  type_piece: string
  numero: number
  /** Tel qu'imprimé en haut du ticket : « 2026-000018 » (EM-07). */
  numero_imprime: string
  /** Numéro de la réception (= lot), lu dans l'archive du ticket. */
  reception_numero: number | null
  statut: 'emise' | 'annulee'
  nombre_impressions: number
  emis_le: string
  emis_par_nom: string
  apporteur_nom: string | null
  net_kg: number | null
  actions_possibles: string[]
  impressions?: Impression[]
}

/** Numéro du ticket (« 18 » ou « 2026-000018 ») ou nom de l'apporteur ; null si rien n'est tapé (EM-07). */
export function cheminRecherche(saisie: string): string | null {
  const texte = texteRecherche(saisie)
  return texte === null ? null : `/api/pieces?texte=${encodeURIComponent(texte)}`
}

/** Tous les tickets émis ce jour-là (AAAA-MM-JJ, journée de Tunis). */
export const cheminDuJour = (jour: string) => `/api/pieces/recents?jour=${jour}`

export const cheminImpression = (pieceId: number) => `/api/pieces/${pieceId}/impression`
export const cheminApercu = (pieceId: number) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" viewBox="0 0 400 240"><rect width="400" height="240" fill="white"/><g fill="black" font-family="monospace" text-anchor="middle"><text x="200" y="42" font-size="22">ARRACHID — DÉMONSTRATION</text><text x="200" y="85" font-size="18">Ticket fictif ${pieceId}</text><text x="200" y="130" font-size="14">Aucune impression matérielle</text><text x="200" y="165" font-size="14">Données à consulter dans la fiche</text><text x="200" y="205" font-size="14">SANS VALEUR COMPTABLE</text></g></svg>`)}`

/** « Réessayer » seulement quand l'impression n'est pas confirmée (PROMPT §6.4). */
export function peutReessayer(etat: EtatImpression): boolean {
  return etat.statut !== 'reussie'
}

/** DUPLICATA dès qu'une impression a été confirmée (CONTEXTE §8.2). */
export function etiquetteImpression(piece: Pick<Piece, 'nombre_impressions'>): string {
  return piece.nombre_impressions > 0 ? t.reimprimer : t.imprimer
}

export function texteEtat(etat: EtatImpression): string {
  return etat.message ?? t.imprime
}

/** Couleur de l'état d'un ticket, tel que le serveur le donne : émis, ou annulé (il ne se réimprime plus). */
export function tonStatutPiece(statut: Piece['statut']): 'ok' | 'erreur' {
  return statut === 'annulee' ? 'erreur' : 'ok'
}

/** Couleur d'un résultat d'impression : imprimé, échec, ou non confirmé (l'imprimante n'a pas répondu). */
export function tonResultat(resultat: ResultatImpression): 'ok' | 'erreur' | 'alerte' {
  return resultat === 'reussie' ? 'ok' : resultat === 'echec' ? 'erreur' : 'alerte'
}

export function remplacer(modele: string, valeurs: Record<string, string | number>): string {
  return modele.replace(/\{(\w+)\}/g, (marque, cle: string) => (cle in valeurs ? String(valeurs[cle]) : marque))
}
