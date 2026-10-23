// Logique pure de la saisie d'analyse (T3.2, CONTEXTE §11.3–§11.5). Les pourcentages tapés
// (« 0,45 ») partent en centièmes entiers ; le serveur juge les plages plausibles.
import { uniteExacte } from '../format/saisie'
import type { ReceptionEnAttente } from './logique'

export const CHAMPS_ANALYSE = ['acidite_centiemes', 'taux_huile_centiemes', 'rendement_prevu_centiemes', 'humidite_centiemes'] as const
export type ChampAnalyse = (typeof CHAMPS_ANALYSE)[number]
export type SaisieAnalyse = Record<ChampAnalyse, string>

export const SAISIE_VIDE: SaisieAnalyse = { acidite_centiemes: '', taux_huile_centiemes: '', rendement_prevu_centiemes: '', humidite_centiemes: '' }
export const CHEMIN_ANALYSES = '/api/analyses'
export const CHEMIN_VARIETES = '/api/varietes'
const MAXIMUM_CENTIEMES = 10_000

export interface Variete {
  id: number
  libelle: string
  actif: number | boolean
}

export interface Analyse extends Record<ChampAnalyse, number> {
  id: number
  variete: { id: number; libelle: string } | null
  analyseur: string
  saisi_par: string
  saisi_le: string
  echantillon: { id: number; reference: string }
  reception: { id: number; numero: number; statut: string; apporteur: string; analyse_prete: boolean }
}

export type EtapeAnalyse = 'prix_attendu' | 'prix_fixe' | 'prix_refuse' | 'en_production' | 'close'

/** Une analyse en vigueur de la campagne (`GET /api/analyses`), la plus récente d'abord. */
export interface AnalyseSaisie extends Record<ChampAnalyse, number> {
  id: number
  reception: { id: number; numero: number; apporteur: string; regime: string }
  variete: string | null
  analyseur: string
  saisi_par: string
  saisi_le: string
  reference: string
  etape: EtapeAnalyse
  corrections: number
  actions_possibles: string[]
}

/** Écran des corrections ouvert sur cette réception (CONTEXTE §29). */
export function cheminCorrectionAnalyse(receptionId: number): string {
  return `/bureau/corrections?reception=${receptionId}`
}

/** L'échantillon prélevé, ou la réception analysée sur place (E-37) : le serveur crée alors son échantillon. */
export type CibleAnalyse = { echantillon_id: number } | { reception_id: number }
export type CorpsAnalyse = Record<ChampAnalyse, number> & CibleAnalyse & { variete_id: number | null; confirmer_valeurs: boolean }

/** Pourcentage tapé → centièmes entiers ; vide, illisible, plus de 2 décimales ou plus de 100 % → null. */
export function centiemes(texte: string): number | null {
  if (texte.trim() === '') return null
  const valeur = uniteExacte(texte, 2)
  return valeur !== null && valeur <= MAXIMUM_CENTIEMES ? valeur : null
}

/** Champs dont la saisie est vide ou illisible, dans l'ordre de l'écran. */
export function champsInvalides(saisie: SaisieAnalyse): ChampAnalyse[] {
  return CHAMPS_ANALYSE.filter((champ) => centiemes(saisie[champ]) === null)
}

/** Corps de la commande, ou null tant qu'un champ est invalide. Un nombre seul désigne l'échantillon. */
export function corpsAnalyse(cible: number | CibleAnalyse, saisie: SaisieAnalyse, varieteId: string, confirmer: boolean): CorpsAnalyse | null {
  if (champsInvalides(saisie).length > 0) return null
  const valeurs = Object.fromEntries(CHAMPS_ANALYSE.map((champ) => [champ, centiemes(saisie[champ])])) as Record<ChampAnalyse, number>
  const vers = typeof cible === 'number' ? { echantillon_id: cible } : cible
  return { ...vers, ...valeurs, variete_id: varieteId === '' ? null : Number(varieteId), confirmer_valeurs: confirmer }
}

/** Analyse sur place (E-37) : le serveur propose l'analyse d'une réception qui n'a pas d'échantillon. */
export function surPlace(reception: Pick<ReceptionEnAttente, 'etape' | 'echantillon'>): boolean {
  return reception.etape === 'a_analyser' && reception.echantillon === null
}

/** Ce que vise l'analyse de cette réception : son échantillon, ou la réception elle-même sur place. */
export function cibleAnalyse(reception: Pick<ReceptionEnAttente, 'id' | 'echantillon'>): CibleAnalyse {
  return reception.echantillon === null ? { reception_id: reception.id } : { echantillon_id: reception.echantillon.id }
}

/** « 1850 » → « 18,50 » (affichage exact, sans arrondi). */
export function afficherCentiemes(valeur: number): string {
  return `${Math.trunc(valeur / 100)},${String(valeur % 100).padStart(2, '0')}`
}

/** Réceptions qui attendent leur analyse (échantillon prélevé, ou sur place) et que le serveur permet d'analyser. */
export function aAnalyser(file: readonly ReceptionEnAttente[]): ReceptionEnAttente[] {
  return file.filter((r) => r.etape === 'a_analyser' && r.actions_possibles.includes('analyser'))
}

export function varietesActives(varietes: readonly Variete[]): Variete[] {
  return varietes.filter((v) => Boolean(v.actif))
}
