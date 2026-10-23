// Logique pure de l'écran « Contrôle de rendement » (T4.7 ; CONTEXTE §19).
// Le serveur mesure, compare et décide ; l'écran montre le verdict, lance le contrôle d'un passage
// qui l'attend et, pour le responsable, envoie la justification d'un rendement bloqué.
import { grammesVersKg } from '../administration/unites'
import { afficherCentiemes } from '../laboratoire/analyse'

export type StatutControle = 'ok' | 'alerte' | 'bloque' | 'justifie'
export type TypeReference = 'prevision_analyseur' | 'moyenne_campagne'
export type Etape = 'a_controler' | 'remise_en_cours'

export interface Controle {
  id: number
  rendement_reel_centiemes: number
  type_reference: TypeReference
  rendement_reference_centiemes: number | null
  ecart_centiemes: number | null
  tolerance_centiemes: number | null
  statut_initial: 'ok' | 'alerte' | 'bloque'
  statut: StatutControle
  calcule_le: string
  justification: { texte: string; justifie_par: string; justifie_le: string } | null
}

export interface VueRendement {
  passage: { id: number; numero: number; statut: string; ligne: string }
  regime: 'achat' | 'facon' | 'mixte' | null
  lots: { numero: number; reception: number; poids_kg: number }[]
  olives_kg: number
  huile_g: number
  rendement_reel_centiemes: number | null
  etape: Etape | null
  controle: Controle | null
  actions_possibles: string[]
}

export interface FileRendement {
  passages: VueRendement[]
  alertes: VueRendement[]
  controles: VueRendement[]
}

export const CHEMIN_CONTROLES = '/api/controles-rendement'

export function cheminControle(passageId: number): string {
  return `/api/triturations/${passageId}/controle-rendement`
}

export function cheminJustification(passageId: number): string {
  return `${cheminControle(passageId)}/justification`
}

export const afficherKg = grammesVersKg

/** Étiquette d'un passage dans la liste : son verdict, ou « à contrôler » tant qu'il attend. */
export function etat(vue: VueRendement): StatutControle | Etape {
  return vue.controle?.statut ?? vue.etape ?? 'remise_en_cours'
}

/** Écart signé en points : « +2,01 », « −6,20 », « 0,00 ». */
export function afficherEcart(centiemes: number): string {
  if (centiemes === 0) return afficherCentiemes(0)
  return `${centiemes > 0 ? '+' : '−'}${afficherCentiemes(Math.abs(centiemes))}`
}

/** Passages de la liste sans doublon : à traiter, puis alertes, puis derniers contrôles. */
export function tousLesPassages(file: FileRendement): VueRendement[] {
  const vus = new Set<number>()
  return [...file.passages, ...file.alertes, ...file.controles].filter((vue) => {
    if (vus.has(vue.passage.id)) return false
    vus.add(vue.passage.id)
    return true
  })
}

/** Passage montré : le choix de la personne, sinon le seul passage qui attend quelque chose. */
export function passageMontre(file: FileRendement, choisi: number | null): number | null {
  if (choisi !== null && tousLesPassages(file).some((vue) => vue.passage.id === choisi)) return choisi
  return file.passages.length === 1 ? (file.passages[0]?.passage.id ?? null) : null
}

/** Corps de la justification : la raison est obligatoire ; le PIN est joint par l'écran. */
export function corpsJustification(motif: string): { motif: string } | null {
  const raison = motif.trim()
  return raison === '' ? null : { motif: raison }
}

/** Ton du verdict du serveur : vert conforme ou justifié, ambre alerte, rouge bloqué. */
export function tonVerdict(statut: StatutControle): 'ok' | 'alerte' | 'erreur' {
  if (statut === 'bloque') return 'erreur'
  return statut === 'alerte' ? 'alerte' : 'ok'
}

/**
 * Repères de la jauge du rendement, pour l'affichage seulement : la bande de tolérance autour de la référence et le
 * rendement réel, placés en pourcentage de largeur sur une échelle qui les contient avec une marge. Aucun verdict
 * n'est tiré d'ici : il vient du serveur (`statut`), et les valeurs écrites sont celles du serveur.
 */
export function reperesJauge(reelCentiemes: number, referenceCentiemes: number, toleranceCentiemes: number) {
  const bas = Math.min(reelCentiemes, referenceCentiemes - toleranceCentiemes)
  const haut = Math.max(reelCentiemes, referenceCentiemes + toleranceCentiemes)
  const marge = Math.max((haut - bas) / 4, 50)
  const debut = bas - marge
  const etendue = haut + marge - debut
  const position = (valeur: number) => `${((valeur - debut) * 100) / etendue}%`
  return {
    bande: { gauche: position(referenceCentiemes - toleranceCentiemes), largeur: `${(toleranceCentiemes * 200) / etendue}%` },
    reference: position(referenceCentiemes),
    reel: position(reelCentiemes),
  }
}
