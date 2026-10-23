import { formaterHorodatage } from '../format/dates'
import { libelles } from '../libelles'

// Journal SMS (PROMPT T2.5) : logique pure, testée sans navigateur.

export type StatutSms = 'en_file' | 'en_envoi' | 'envoye' | 'remis' | 'echec'

export interface MessageSms {
  id: number
  type: 'reception' | 'correction' | 'annulation'
  statut: StatutSms
  telephone: string
  corps: string
  segments: number
  essais: number
  renvois: number
  derniere_erreur: string | null
  cree_le: string
  prochain_essai_le: string | null
  envoye_le: string | null
  remis_le: string | null
  reception: { id: number; numero: number }
  ticket: { numero: number; statut: string }
  apporteur: { nom: string }
  actions_possibles: string[]
}

export interface EtatEnvoi {
  actif: boolean
  derniere_execution: string | null
  derniere_erreur: string | null
  /** Raison française pour laquelle la file attend (paramètre absent…). */
  attente: string | null
}

export interface Filtre {
  statut: '' | StatutSms
  reception: string
  avantId: number | null
}

export const FILTRE_VIDE: Filtre = { statut: '', reception: '', avantId: null }
export const TAILLE_PAGE = 50

const t = libelles.sms

/** Chemin de lecture ; un numéro de réception non entier est ignoré (pas de requête refusée). */
export function cheminJournal(filtre: Filtre): string {
  const parametres = new URLSearchParams()
  if (filtre.statut !== '') parametres.set('statut', filtre.statut)
  const numero = filtre.reception.trim()
  if (/^[0-9]+$/.test(numero) && Number(numero) > 0) parametres.set('reception', String(Number(numero)))
  if (filtre.avantId !== null) parametres.set('avant_id', String(filtre.avantId))
  parametres.set('limite', String(TAILLE_PAGE))
  return `/api/messages-sms?${parametres.toString()}`
}

/** Ce qui se passe ensuite, en mots simples (CONTEXTE §45 : « en attente / nouvel essai »). */
export function suite(sms: MessageSms): string {
  switch (sms.statut) {
    case 'en_file':
      return sms.prochain_essai_le === null ? t.suites.enFile : t.suites.prochainEssai.replace('{heure}', formaterHorodatage(sms.prochain_essai_le))
    case 'en_envoi':
      return t.suites.enEnvoi
    case 'envoye':
      return sms.envoye_le === null ? '' : t.suites.envoyeLe.replace('{heure}', formaterHorodatage(sms.envoye_le))
    case 'remis':
      return sms.remis_le === null ? '' : t.suites.remisLe.replace('{heure}', formaterHorodatage(sms.remis_le))
    case 'echec':
      return t.suites.echec
  }
}

export function peutRenvoyer(sms: MessageSms): boolean {
  return sms.actions_possibles.includes('renvoyer')
}

/** Page suivante : plus anciens que le dernier reçu ; rien si la page n'est pas pleine. */
export function pageSuivante(messages: readonly MessageSms[]): number | null {
  if (messages.length < TAILLE_PAGE) return null
  return messages[messages.length - 1].id
}
