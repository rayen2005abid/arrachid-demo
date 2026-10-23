// Logique pure de l'écran « Remise d'huile » (T4.6 ; CONTEXTE §16.2–§16.3).
// Le serveur calcule le partage, le reste dû, l'écart et ce qui bloque ; l'écran saisit les deux
// poids réels de chaque contenant et choisit le tampon vidé et, s'il en faut une, la cuve.
import { grammesVersKg, kgVersGrammes } from '../administration/unites'
import type { Orientation } from '../triturations/pesees'

export type Regime = 'facon' | 'mixte'
export type Blocage = 'p17' | 'arrondi' | 'aucune_huile' | 'parametre_absent'
export type StatutPartage = 'calcule' | 'remise_en_cours' | 'ecart_a_valider' | 'remis'

export interface ContenantRemis {
  id: number
  sequence: number
  poids_vide_g: number
  poids_plein_g: number
  huile_nette_g: number
  tampon: { id: number; code: string } | null
  /** Faux pour un contenant remplacé par une correction : visible, hors du total. */
  active: boolean
}

export interface TamponDuPassage {
  id: number
  code: string
  solde_g: number
}

export interface Cloture {
  id: number
  huile_remise_g: number
  ecart_g: number
  valide_par: string | null
  motif_ecart: string | null
  cloture_le: string
  bon_sortie: { piece_id: number; serie: string; numero: number } | null
  entree_cuve: { cuve: { id: number; code: string }; poids_g: number; acidite_centiemes: number | null } | null
}

export interface VueRemise {
  passage: { id: number; numero: number; statut: string }
  reception: { id: number; numero: number }
  apporteur: string
  regime: Regime
  mode_partage: 'huile_kg' | 'pourcentage' | null
  huile_agriculteur_declaree_g: number | null
  pourcentage_agriculteur_centiemes: number | null
  huile_pesee_g: number
  blocage: Blocage | null
  partage: { id: number; statut: StatutPartage; huile_totale_g: number; huile_due_g: number; huile_huilerie_g: number; calcule_le: string } | null
  contenants: ContenantRemis[]
  huile_remise_g: number
  reste_du_g: number | null
  ecart_g: number | null
  tolerance_g: number | null
  ecart_hors_tolerance: boolean | null
  tampons: TamponDuPassage[]
  reste_tampons_g: number
  acidite_centiemes: number | null
  orientation: Orientation | null
  cloture: Cloture | null
  actions_possibles: string[]
  /** Contenants en vigueur que la personne peut corriger (T4.10). */
  contenants_corrigeables?: number[]
}

export interface ResumeRemise {
  passage: { id: number; numero: number; statut: string }
  reception: { id: number; numero: number }
  apporteur: string
  regime: Regime
  huile_pesee_g: number
  statut_partage: StatutPartage | null
  blocage: Blocage | null
}

export interface FileRemise {
  passages: ResumeRemise[]
  remis: ResumeRemise[]
}

export const CHEMIN_PARTAGES = '/api/partages'

export function cheminRemise(passageId: number): string {
  return `${CHEMIN_PARTAGES}/passages/${passageId}`
}

export function cheminContenants(partageId: number): string {
  return `${CHEMIN_PARTAGES}/${partageId}/contenants`
}

export function cheminCloture(partageId: number, validation = false): string {
  return `${CHEMIN_PARTAGES}/${partageId}/cloture${validation ? '/validation' : ''}`
}

export const afficherKg = grammesVersKg

/** Écart signé : « +0,2 », « −0,2 », « 0 ». */
export function afficherEcart(ecartG: number): string {
  if (ecartG === 0) return '0'
  return `${ecartG > 0 ? '+' : '−'}${grammesVersKg(Math.abs(ecartG))}`
}

/** Poids tapé en kg converti en grammes ; null s'il est vide ou illisible. Zéro est un poids. */
export function poidsSaisi(texte: string): number | null {
  return texte.trim() === '' ? null : kgVersGrammes(texte.trim())
}

/** Huile du contenant d'après les deux poids tapés ; null tant que le plein ne dépasse pas le vide. */
export function huileNette(vide: string, plein: string): number | null {
  const videG = poidsSaisi(vide)
  const pleinG = poidsSaisi(plein)
  if (videG === null || pleinG === null || pleinG <= videG) return null
  return pleinG - videG
}

/**
 * Tampon proposé pour le contenant : le choix de la personne s'il garde encore de l'huile, sinon
 * le seul tampon du passage ; avec plusieurs tampons, la personne dit lequel elle vide.
 */
export function tamponPropose(vue: VueRemise, choisi: number | null): number | null {
  if (choisi !== null && vue.tampons.some((tampon) => tampon.id === choisi)) return choisi
  return vue.tampons.length === 1 ? (vue.tampons[0]?.id ?? null) : null
}

/** Corps de la pesée d'un contenant, ou null si un poids est illisible ou si le tampon manque. */
export function corpsContenant(vide: string, plein: string, tamponId: number | null) {
  const videG = poidsSaisi(vide)
  if (videG === null || huileNette(vide, plein) === null || tamponId === null) return null
  return { poids_vide_g: videG, poids_plein_g: poidsSaisi(plein) as number, tampon_id: tamponId }
}

/** L'agriculteur a reçu ce qui lui est dû (ou plus) : l'opérateur doit s'arrêter. */
export function quantiteAtteinte(vue: VueRemise): boolean {
  return vue.reste_du_g !== null && vue.reste_du_g <= 0
}

/** La part de l'huilerie restée dans les tampons demande une cuve à la clôture. */
export function cuveRequise(vue: VueRemise): boolean {
  return vue.cloture === null && vue.partage !== null && vue.reste_tampons_g > 0 && vue.acidite_centiemes !== null
}

/** Façon : de l'huile reste dans le tampon alors que tout revient à l'agriculteur. */
export function resteBloquant(vue: VueRemise): boolean {
  return vue.cloture === null && vue.partage !== null && vue.reste_tampons_g > 0 && vue.acidite_centiemes === null
}

/** Cuve proposée pour la part de l'huilerie : le choix s'il reste recommandé, sinon la première. */
export function cuveProposee(vue: VueRemise, choisie: number | null): number | null {
  const recommandees = vue.orientation?.recommandees ?? []
  if (choisie !== null && recommandees.some((cuve) => cuve.id === choisie)) return choisie
  return recommandees[0]?.id ?? null
}

/** Corps de la clôture ; null si une cuve est requise et qu'aucune n'est choisie. */
export function corpsCloture(vue: VueRemise, cuveId: number | null): { cuve_id?: number } | null {
  if (!cuveRequise(vue)) return {}
  return cuveId === null ? null : { cuve_id: cuveId }
}

/** Corps de la validation d'un écart : la raison est obligatoire ; le PIN est joint par l'écran. */
export function corpsValidation(vue: VueRemise, cuveId: number | null, motif: string) {
  const corps = corpsCloture(vue, cuveId)
  const raison = motif.trim()
  return corps === null || raison === '' ? null : { ...corps, motif: raison }
}

/** Part convenue de l'agriculteur, pour l'en-tête du partage. */
export function partConvenue(vue: VueRemise): { type: 'tout' | 'kg' | 'pourcentage'; valeur: string } {
  if (vue.mode_partage === 'huile_kg') return { type: 'kg', valeur: grammesVersKg(vue.huile_agriculteur_declaree_g ?? 0) }
  if (vue.mode_partage === 'pourcentage') {
    const centiemes = String(vue.pourcentage_agriculteur_centiemes ?? 0).padStart(3, '0')
    const fraction = centiemes.slice(-2).replace(/0+$/, '')
    return { type: 'pourcentage', valeur: centiemes.slice(0, -2) + (fraction === '' ? '' : `,${fraction}`) }
  }
  return { type: 'tout', valeur: '' }
}
