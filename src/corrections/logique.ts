// Logique pure de l'écran des corrections (T2.7, T3.7). Le serveur reste juge : ces contrôles
// évitent seulement un aller-retour pour une saisie vide (CONTEXTE §50 règle 7).
import { afficherMillimes } from '../format/montants'
import { afficherCentiemes, centiemes, CHAMPS_ANALYSE, type ChampAnalyse, type SaisieAnalyse } from '../laboratoire/analyse'
import { libelles } from '../libelles'
import { millimes, type UnitePrix } from '../prix/logique'
import type { Validation } from '../types'

const m = libelles.corrections.erreurs

/** `directe` : pesée unique sur la balance à plateforme (E-38), qui est le net. */
export type TypePesee = 'brut' | 'tare' | 'directe'

export interface Pesee {
  id: number
  type: TypePesee
  poids_kg: number
  source: 'manuel' | 'automatique'
  horodatage: string
  operateur_nom: string
  active: boolean
}

export type EtatBac = 'occupe' | 'libere' | 'annule' | 'remplace'

export interface OccupationBac {
  id: number
  numero: number
  etat: EtatBac
}

export interface Correction {
  id: number
  table_cible: 'pesee_reception' | 'pesee_directe_reception' | 'bac_reception' | 'analyse_olive' | 'prix_achat' | 'decompte' | 'encaissement' | 'decaissement'
  motif: string
  horodatage: string
  apres_reglement: number
  auteur_nom: string
  /** JSON texte : `{type, poids_kg}` (pesée), `{bac}`, les quatre mesures et `variete` (analyse), `{unite_prix, prix_unitaire_millimes_kg}`. */
  avant: string
  apres: string
}

export interface ReceptionResume {
  id: number
  numero: number
  statut: string
  regime: 'achat' | 'facon' | 'mixte'
  apporteur: { nom: string }
  poids_brut_kg: number | null
  poids_tare_kg: number | null
  net_kg: number | null
  pesee_directe: boolean
}

/** Analyse d'olives de la réception : en vigueur ou remplacée par une correction. */
export interface AnalyseOlive extends Record<ChampAnalyse, number> {
  id: number
  reference: string
  variete_id: number | null
  variete: string | null
  analyseur: string
  saisi_par: string
  saisi_le: string
  active: boolean
}

/** Décision de prix de la réception : acceptée ou refusée, en vigueur ou remplacée. */
export interface DecisionPrix {
  id: number
  unite_prix: UnitePrix
  prix_unitaire_millimes_kg: number | null
  statut: 'accepte' | 'refuse'
  suite_refus: 'facon' | 'retour' | null
  valide_par: string
  valide_le: string
  active: boolean
}

export type ActionCorrection = 'corriger_analyse' | 'corriger_prix' | 'annuler_reglement' | 'changer_mode_reglement'

export type ModeReglement = 'especes' | 'cheque' | 'virement'

/** Décompte émis de la réception et son règlement en vigueur (T5.7). */
export interface ReglementReception {
  decompte_id: number
  decompte_numero: number
  net_millimes: number
  sens_net: 'a_payer' | 'a_encaisser' | 'nul'
  regle: boolean
  recu_numero: number | null
  mode: ModeReglement | null
  regime: 'achat' | 'facon' | 'mixte'
}

export interface VueCorrection {
  reception: ReceptionResume
  pesees: Pesee[]
  bacs: OccupationBac[]
  analyses: AnalyseOlive[]
  prix: DecisionPrix[]
  corrections: Correction[]
  reglement: ReglementReception | null
  /** Corrections d'analyse, de prix et de règlement que le serveur accepterait de cette personne. */
  actions_possibles: string[]
}

export type Erreurs = Partial<Record<'numero' | 'poids' | 'motif' | 'ancien' | 'nouveau' | 'bac' | 'prix' | ChampAnalyse, string>>

const chiffres = /^[0-9]+$/

/** Entier strictement positif tapé par l'opérateur (espaces ignorés) ; `null` sinon. */
export function entierPositif(saisie: string): number | null {
  const propre = saisie.replace(/\s/g, '')
  if (!chiffres.test(propre)) return null
  const valeur = Number(propre)
  return Number.isSafeInteger(valeur) && valeur > 0 ? valeur : null
}

/** Vue de correction d'une réception choisie dans la recherche (EM-07). */
export function cheminVue(receptionId: number): string {
  return `/api/corrections/receptions/${receptionId}`
}

/** `?reception=12` dans l'adresse : la vue de cette réception ; une valeur absente ou illisible n'ouvre rien. */
export function cheminDepuisAdresse(valeur: string | null): string | null {
  if (valeur === null || !/^[1-9][0-9]*$/.test(valeur)) return null
  return cheminVue(Number(valeur))
}

export function cheminCorrection(receptionId: number, ressource: 'pesee' | 'bacs' | 'analyse' | 'prix'): string {
  return `/api/corrections/receptions/${receptionId}/${ressource}`
}

export interface ResultatCorps {
  corps: Record<string, unknown> | null
  erreurs: Erreurs
}

function motifPropre(motif: string, erreurs: Erreurs): string {
  const propre = motif.trim().split(/\s+/).join(' ')
  if (propre === '') erreurs.motif = m.motif
  return propre
}

/** Pesée corrigée : type, nouveau poids en kg entiers, raison, PIN frais déjà saisi. */
export function corpsPesee(
  type: TypePesee,
  poids: string,
  motif: string,
  validation: Validation | null,
): ResultatCorps {
  const erreurs: Erreurs = {}
  const kg = entierPositif(poids)
  if (kg === null) erreurs.poids = m.poids
  const raison = motifPropre(motif, erreurs)
  if (Object.keys(erreurs).length > 0 || validation === null) return { corps: null, erreurs }
  return { corps: { type, poids_kg: kg, motif: raison, validation }, erreurs }
}

/** Bacs : un bac remplacé par un autre et/ou un bac oublié ajouté. Au moins un changement. */
export function corpsBacs(
  ancien: string,
  nouveau: string,
  ajout: string,
  motif: string,
  validation: Validation | null,
): ResultatCorps {
  const erreurs: Erreurs = {}
  const remplacements: { ancien: number; nouveau: number }[] = []
  const ajouts: number[] = []
  if (ancien !== '' || nouveau.trim() !== '') {
    const numeroAncien = entierPositif(ancien)
    const numeroNouveau = entierPositif(nouveau)
    if (numeroAncien === null) erreurs.ancien = m.ancien
    if (numeroNouveau === null) erreurs.nouveau = m.nouveau
    if (numeroAncien !== null && numeroNouveau !== null) remplacements.push({ ancien: numeroAncien, nouveau: numeroNouveau })
  }
  if (ajout.trim() !== '') {
    const numero = entierPositif(ajout)
    if (numero === null) erreurs.bac = m.bac
    else ajouts.push(numero)
  }
  if (remplacements.length === 0 && ajouts.length === 0 && Object.keys(erreurs).length === 0) erreurs.bac = m.aucunChangement
  const raison = motifPropre(motif, erreurs)
  if (Object.keys(erreurs).length > 0 || validation === null) return { corps: null, erreurs }
  return { corps: { remplacements, ajouts, motif: raison, validation }, erreurs }
}

/** Analyse corrigée : les quatre pourcentages en centièmes entiers, variété facultative, raison, PIN frais. */
export function corpsCorrectionAnalyse(
  saisie: SaisieAnalyse,
  varieteId: string,
  confirmer: boolean,
  motif: string,
  validation: Validation | null,
): ResultatCorps {
  const erreurs: Erreurs = {}
  const valeurs: Partial<Record<ChampAnalyse, number>> = {}
  for (const champ of CHAMPS_ANALYSE) {
    const valeur = centiemes(saisie[champ])
    if (valeur === null) erreurs[champ] = libelles.labo.analyse.invalide
    else valeurs[champ] = valeur
  }
  const raison = motifPropre(motif, erreurs)
  if (Object.keys(erreurs).length > 0 || validation === null) return { corps: null, erreurs }
  return { corps: { ...valeurs, variete_id: varieteId === '' ? null : Number(varieteId), confirmer_valeurs: confirmer, motif: raison, validation }, erreurs }
}

/** Prix corrigé : dinars tapés → millimes entiers ; l'unité reste celle du régime (serveur). */
export function corpsCorrectionPrix(texte: string, motif: string, validation: Validation | null): ResultatCorps {
  const erreurs: Erreurs = {}
  const prix = millimes(texte)
  if (prix === null) erreurs.prix = m.prix
  const raison = motifPropre(motif, erreurs)
  if (Object.keys(erreurs).length > 0 || validation === null) return { corps: null, erreurs }
  return { corps: { prix_unitaire_millimes_kg: prix, motif: raison, validation }, erreurs }
}

/** Analyse en vigueur de la réception, ou `null` (façon, ou pas encore analysée). */
export function analyseActive(analyses: readonly AnalyseOlive[]): AnalyseOlive | null {
  return analyses.find((a) => a.active) ?? null
}

/** Décision de prix en vigueur, ou `null`. */
export function prixActif(prix: readonly DecisionPrix[]): DecisionPrix | null {
  return prix.find((p) => p.active) ?? null
}

/** Formulaire pré-rempli avec l'analyse en vigueur : « 1850 » → « 18,50 ». */
export function saisieDepuis(analyse: AnalyseOlive | null): { saisie: SaisieAnalyse; varieteId: string } {
  const saisie = Object.fromEntries(CHAMPS_ANALYSE.map((champ) => [champ, analyse === null ? '' : afficherCentiemes(analyse[champ])])) as SaisieAnalyse
  return { saisie, varieteId: analyse?.variete_id == null ? '' : String(analyse.variete_id) }
}

/** « 1250 », `kg_olives` → « 1,250 DT par kg d’olives ». */
export function textePrix(prixMillimes: number, unite: UnitePrix): string {
  return libelles.corrections.faitPrix.replace('{prix}', afficherMillimes(prixMillimes)).replace('{unite}', libelles.corrections.unitesPrix[unite])
}

type Fait = Partial<Record<ChampAnalyse, number>> & {
  type?: TypePesee
  poids_kg?: number
  bac?: number
  variete?: string | null
  unite_prix?: UnitePrix
  prix_unitaire_millimes_kg?: number
  decompte_numero?: number
  net_millimes?: number
  montant_millimes?: number
  mode?: ModeReglement
  recu?: number | null
  est_extourne?: number
}

/** `{"type":"tare","poids_kg":480}` → « Tare : 480 kg » ; `{"bac":3}` → « Bac 3 » ; analyse et prix en clair. */
export function texteFait(json: string): string {
  const fait = JSON.parse(json) as Fait
  const a = libelles.labo.analyse
  const r = libelles.corrections.reglement
  if (fait.est_extourne === 1) return r.extourne
  if (fait.decompte_numero !== undefined) return r.faitDecompte.replace('{numero}', String(fait.decompte_numero)).replace('{net}', afficherMillimes(fait.net_millimes ?? 0))
  if (fait.montant_millimes !== undefined) {
    return r.faitPaiement.replace('{montant}', afficherMillimes(fait.montant_millimes)).replace('{mode}', r.modes[fait.mode ?? 'especes']).replace('{recu}', String(fait.recu ?? '—'))
  }
  if (fait.bac !== undefined) return `${libelles.corrections.bac} ${fait.bac}`
  if (fait.unite_prix !== undefined) return textePrix(fait.prix_unitaire_millimes_kg ?? 0, fait.unite_prix)
  if (fait.acidite_centiemes !== undefined) {
    const mesures = CHAMPS_ANALYSE.map((champ) => `${a.champs[champ]} ${afficherCentiemes(fait[champ] ?? 0)}`)
    return [...mesures, `${a.variete} ${fait.variete ?? a.varieteInconnue}`].join(' · ')
  }
  return `${libelles.corrections.types[fait.type ?? 'brut']} : ${fait.poids_kg} kg`
}

/** Le serveur permet-il cette correction à cette personne, pour cette réception ? */
export function permise(vue: Pick<VueCorrection, 'actions_possibles'>, action: ActionCorrection): boolean {
  return vue.actions_possibles.includes(action)
}

/** Bacs encore occupés par la réception : seuls ceux-là se remplacent. */
export function bacsRemplacables(bacs: OccupationBac[]): OccupationBac[] {
  return bacs.filter((b) => b.etat === 'occupe')
}

/** Peut-on corriger ? Pas une réception annulée ou retournée (le serveur décide aussi). */
export function corrigeable(statut: string): boolean {
  return statut !== 'annulee' && statut !== 'retournee'
}

/** Corps de la correction d'un règlement : sans mode, le règlement est annulé. */
export function corpsReglement(nouveauMode: ModeReglement | null, motif: string, validation: Validation | null): ResultatCorps {
  const erreurs: Erreurs = {}
  const raison = motifPropre(motif, erreurs)
  if (Object.keys(erreurs).length > 0 || validation === null) return { corps: null, erreurs }
  return { corps: nouveauMode === null ? { motif: raison, validation } : { nouveau_mode: nouveauMode, motif: raison, validation }, erreurs }
}
