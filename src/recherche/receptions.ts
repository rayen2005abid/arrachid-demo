// Retrouver une réception comme l'agriculteur la désigne (EM-07) : numéro imprimé sur le ticket,
// numéro de réception (= lot) ou nom. Le serveur reconnaît la saisie ; le client la transmet seulement.
import { libelles } from '../libelles'

const t = libelles.rechercheReception

export interface TicketTrouve {
  numero: number
  /** Tel qu'imprimé en haut du ticket : « 2026-000018 ». */
  numero_imprime: string
  statut: 'emise' | 'annulee'
}

export type TrouvePar = 'ticket' | 'reception' | 'nom'

export interface ReceptionTrouvee {
  reception_id: number
  numero: number
  statut: string
  regime: 'achat' | 'facon' | 'mixte'
  cree_le: string
  apporteur_nom: string
  net_kg: number | null
  tickets: TicketTrouve[]
  trouve_par: TrouvePar
}

export interface ResultatRecherche {
  resultats: ReceptionTrouvee[]
  /** Faux quand plus de 20 réceptions correspondent : préciser la recherche. */
  complet: boolean
}

/** Saisie nettoyée (espaces en trop retirés), ou null si rien n'a été tapé. */
export function texteRecherche(saisie: string): string | null {
  const propre = saisie.trim().replace(/\s+/g, ' ')
  return propre === '' ? null : propre
}

/** `base?texte=…` (plus d'éventuels paramètres), ou null si rien n'a été tapé. */
export function cheminRechercheReception(base: string, saisie: string): string | null {
  const texte = texteRecherche(saisie)
  return texte === null ? null : `${base}?texte=${encodeURIComponent(texte)}`
}

/** Numéros imprimés des tickets de la réception ; l'annulé est signalé. */
export function ticketsAffiches(reception: Pick<ReceptionTrouvee, 'tickets'>): string {
  if (reception.tickets.length === 0) return t.sansTicket
  return reception.tickets
    .map((ticket) => (ticket.statut === 'annulee' ? `${ticket.numero_imprime} (${t.annule})` : ticket.numero_imprime))
    .join(', ')
}

/** Ce qu'il faut faire du résultat : ouvrir la seule réception trouvée, ou laisser choisir. */
export function suiteRecherche(resultat: ResultatRecherche): { ouvrir: ReceptionTrouvee | null; erreur?: string } {
  if (resultat.resultats.length === 0) return { ouvrir: null, erreur: t.aucune }
  if (resultat.resultats.length === 1) return { ouvrir: resultat.resultats[0] }
  return { ouvrir: null }
}
