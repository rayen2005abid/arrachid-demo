// Logique pure de l'écran « Analyses d'huile » (T4.8 ; CONTEXTE §20).
// Le serveur donne la référence, la conservation et le classement ; l'écran choisit d'où vient
// l'échantillon et saisit l'acidité lue sur l'analyseur.
import type { Qualite } from '../cuves/logique'
import { centiemes } from '../laboratoire/analyse'

export type Sujet = 'cuve' | 'trituration' | 'chargement'

export interface AnalyseHuile {
  id: number
  acidite_centiemes: number
  classement: Qualite
  saisi_le: string
  saisi_par: string
  analyseur: string
}

export interface EchantillonHuile {
  id: number
  reference: string
  preleve_le: string
  preleve_par: string
  conservation_jusqua: string
  sujet: Sujet
  cuve: { id: number; code: string; qualite_affectee: Qualite } | null
  trituration: { id: number; numero: number } | null
  analyse: AnalyseHuile | null
  actions_possibles: string[]
}

export interface CuvePrelevable {
  id: number
  code: string
  qualite_affectee: Qualite
  qualite_calculee: Qualite | null
  stock_calcule_g: number
}

export interface PassagePrelevable {
  id: number
  numero: number
  statut: string
  ligne: string
}

export interface ReservationARevoir {
  id: number
  contrat_vente_id: number
  cuve_id: number
  qualite: Qualite
  qualite_calculee: Qualite
  poids_reserve_g: number
}

/** Cuve dont l'analyse donne une autre qualité que celle qui lui est affectée. */
export interface CuveAReclasser {
  id: number
  code: string
  qualite_affectee: Qualite
  qualite_calculee: Qualite
  actions_possibles: string[]
}

export interface EcranAnalysesHuile {
  a_analyser: EchantillonHuile[]
  analyses: EchantillonHuile[]
  cuves: CuvePrelevable[]
  passages: PassagePrelevable[]
  cuves_a_reclasser: CuveAReclasser[]
  reservations_a_revoir: ReservationARevoir[]
  actions_possibles: string[]
}

/** Ce que la personne a choisi de prélever : une cuve ou un passage. */
export type Choix = { type: 'cuve'; id: number } | { type: 'trituration'; id: number }

export const CHEMIN_ECHANTILLONS = '/api/echantillons-huile'
export const CHEMIN_ANALYSES_HUILE = '/api/analyses-huile'

export function cheminReclassement(cuveId: number): string {
  return `/api/cuves/${cuveId}/reclassement`
}

/** Corps du reclassement : la qualité que donne l'analyse, et la raison ; le PIN est joint par l'écran. */
export function corpsReclassement(cuve: Pick<CuveAReclasser, 'qualite_calculee'>, motif: string): { qualite: Qualite; motif: string } | null {
  const raison = motif.trim()
  return raison === '' ? null : { qualite: cuve.qualite_calculee, motif: raison }
}

/** Corps du prélèvement : exactement la cuve ou le passage choisi. */
export function corpsPrelevement(choix: Choix | null): { cuve_id: number } | { trituration_id: number } | null {
  if (choix === null) return null
  return choix.type === 'cuve' ? { cuve_id: choix.id } : { trituration_id: choix.id }
}

/** Corps de l'analyse ; null si l'acidité tapée n'est pas un pourcentage à deux décimales au plus. */
export function corpsAnalyseHuile(echantillonId: number, acidite: string, confirmer: boolean) {
  const valeur = centiemes(acidite)
  if (valeur === null) return null
  return { echantillon_huile_id: echantillonId, acidite_centiemes: valeur, confirmer_valeurs: confirmer }
}

/** Échantillon montré : le choix de la personne s'il existe encore, sinon rien. */
export function echantillonMontre(ecran: EcranAnalysesHuile, choisi: number | null): EchantillonHuile | null {
  return [...ecran.a_analyser, ...ecran.analyses].find((e) => e.id === choisi) ?? null
}

/** L'analyse d'une cuve donne une autre qualité que celle de la cuve : elle est à reclasser. */
export function cuveAReclasser(echantillon: EchantillonHuile): boolean {
  return echantillon.cuve !== null && echantillon.analyse !== null && echantillon.analyse.classement !== echantillon.cuve.qualite_affectee
}
