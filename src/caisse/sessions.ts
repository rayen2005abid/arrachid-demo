/** Sessions de la caisse commune et leur clôture (T5.4, EM-05). Le serveur calcule l'attendu et l'écart. */
import type { Chiffre } from '../composants/Chiffres'
import type { TonPastille } from '../composants/Pastille'
import { libelles } from '../libelles'

/** Tiroir de la session ouverte : l'attendu pour le propriétaire seulement (comptage à l'aveugle, E-28). */
export const CHEMIN_RESUME = '/api/caisse/resume'
export const CHEMIN_SESSIONS = '/api/caisse/sessions'
export const CHEMIN_JOURNAL = '/api/caisse/journal'

export function cheminJournalPdf(sessionId: number): string {
  return `${CHEMIN_JOURNAL}/pdf?session_id=${sessionId}`
}

export interface SessionCaisse {
  id: number
  ouverte_le: string
  fonds_ouverture_millimes: number
  statut: 'ouverte'
}

/** Lecture de `/api/caisse/session` : gestes permis, fonds proposé à l'ouverture, caisse oubliée ouverte. */
export interface LectureSession {
  session_caisse: SessionCaisse | null
  actions_possibles: string[]
  fonds_propose_millimes: number | null
  ouverte_avant_aujourdhui: boolean
}

export interface ResumeCaisse {
  fonds_ouverture_millimes: number
  autres_modes_millimes: Record<string, number>
  comptage_aveugle: boolean
  // Absents tant que le responsable compte à l'aveugle.
  entrees_especes_millimes?: number
  sorties_especes_millimes?: number
  attendu_millimes?: number
}

export interface SessionFermee {
  id: number
  ouverte_le: string
  ouverte_par: string
  fonds_ouverture_millimes: number
  attendu_fermeture_millimes: number | null
  compte_fermeture_millimes: number | null
  ecart_millimes: number | null
  fermee_par: string | null
  fermee_le: string | null
  statut: 'ouverte' | 'fermee'
  fonds_laisse_millimes?: number | null
  motif_ecart?: string | null
  ecart_valide_par?: string | null
}

/** « Il manque 2,500 DT », « 1,000 DT en trop » ou « Aucun écart » (montant déjà formaté). */
export function texteEcart(ecart: number, formater: (millimes: number) => string): string {
  if (ecart === 0) return 'Aucun écart'
  return ecart < 0 ? `Il manque ${formater(-ecart)} DT` : `${formater(ecart)} DT en trop`
}

/** Couleur de l'écart gardé par le serveur : juste, manque ou excédent. */
export function tonEcart(ecart: number): TonPastille {
  if (ecart === 0) return 'ok'
  return ecart < 0 ? 'erreur' : 'alerte'
}

/** Sessions fermées seulement, dans l'ordre du serveur (la plus récente d'abord). */
export function sessionsFermees(sessions: readonly SessionFermee[]): SessionFermee[] {
  return sessions.filter((session) => session.statut === 'fermee')
}

/**
 * Chiffres du résumé de caisse/resume, tels que le serveur les donne : attendu, fonds, espèces reçues et versées (pour
 * le propriétaire), puis chaque mode hors tiroir. À l'aveugle, seuls le fonds et les autres modes. Rien n'est additionné.
 */
export function chiffresResume(resume: ResumeCaisse, formater: (millimes: number) => string): Chiffre[] {
  const t = libelles.caisse
  const dt = (millimes: number) => `${formater(millimes)} DT`
  const especes: Chiffre[] = resume.attendu_millimes === undefined ? [] : [
    { etiquette: t.attendu, valeur: dt(resume.attendu_millimes), ton: 'afficheur' },
    { etiquette: t.fondsDepart, valeur: dt(resume.fonds_ouverture_millimes) },
    { etiquette: t.entrees, valeur: dt(resume.entrees_especes_millimes ?? 0) },
    { etiquette: t.sorties, valeur: dt(resume.sorties_especes_millimes ?? 0) },
  ]
  return [
    ...(especes.length > 0 ? especes : [{ etiquette: t.fondsDepart, valeur: dt(resume.fonds_ouverture_millimes), ton: 'fort' as const }]),
    ...Object.entries(resume.autres_modes_millimes).map(([mode, montant]) => ({ etiquette: t.autresModes[mode] ?? mode, valeur: dt(montant) })),
  ]
}

/** Remis au propriétaire à la clôture : le compté moins ce qui reste dans le tiroir. */
export function remisAuProprietaire(compteMillimes: number, laisseMillimes: number): number {
  return Math.max(0, compteMillimes - laisseMillimes)
}

/** La raison envoyée : celle saisie, puis les chèques que la personne n'a pas retrouvés dans le tiroir. */
export function raisonCloture(raison: string, absents: readonly string[]): string | undefined {
  const parties = [raison.trim(), absents.length > 0 ? libelles.caisse.chequesAbsents.replace('{liste}', absents.join(', ')) : ''].filter((p) => p !== '')
  return parties.length > 0 ? parties.join(' — ') : undefined
}
