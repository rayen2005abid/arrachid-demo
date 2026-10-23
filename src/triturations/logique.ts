// Logique pure de la file de trituration (T4.3, T4.4 ; CONTEXTE §14–§15). Le serveur décide de la
// compatibilité des lots, de l'acidité du groupe et de l'indicateur de froid ; l'écran choisit
// des lots, une ligne, et saisit la température et la durée relevées à la main.
import { entierPositif, uniteExacte } from '../format/saisie'
import { afficherCentiemes } from '../laboratoire/analyse'

export type Regime = 'achat' | 'facon' | 'mixte'
export type Qualite = 'extra_vierge' | 'vierge' | 'lampante'
export type Raison = 'acidite_trop_eloignee' | 'qualites_differentes'
export type Statut = 'planifiee' | 'en_cours' | 'production_terminee' | 'rendement_bloque' | 'terminee' | 'annulee'

/** Lot à façon ou mixte prêt à triturer : il passe seul et en entier. */
export interface LotEntier {
  id: number
  numero: number
  apporteur: string
  regime: Regime
  net_kg: number
  reste_kg: number
}

/** Lot d'achat au prix accepté, avec le verdict du serveur par rapport aux lots déjà choisis. */
export interface LotAchat {
  id: number
  numero: number
  apporteur: string
  net_kg: number
  reste_kg: number
  acidite_centiemes: number
  qualite: Qualite
  variete: { id: number; libelle: string } | null
  choisi: boolean
  compatible: boolean | null
  raisons: Raison[]
  avertissements: string[]
}

export interface Groupe {
  compatible: boolean
  raisons: Raison[]
  avertissements: string[]
  qualite: Qualite | null
  poids_kg: number
  acidite_centiemes: number | null
  acidite_plancher_centiemes: number
  acidite_plafond_centiemes: number
}

export interface Regroupement {
  selection: Groupe | null
  lots: LotAchat[]
}

export interface Ligne {
  id: number
  code: string
  libelle: string
}

export interface LotDuPassage {
  affectation_id: number
  lot: { id: number; numero: number; statut: string }
  apporteur: string
  regime: Regime
  poids_kg: number
  net_kg: number
  acidite_centiemes: number | null
  variete: string | null
  bacs_occupes: number[]
}

export interface Passage {
  id: number
  numero: number
  statut: Statut
  ligne: Ligne
  regime: Regime | null
  debut: string | null
  fin: string | null
  temperature_malaxage_centiemes: number | null
  duree_malaxage_min: number | null
  froid: { seuil_centiemes: number | null; seuil_depasse: boolean | null } | null
  poids_kg: number
  /** Huile des pesées en vigueur et leur nombre. Absents d'une réponse enregistrée avant leur ajout (rejeu). */
  huile_pesee_g?: number
  contenants_peses?: number
  groupe: Groupe | null
  lots: LotDuPassage[]
  actions_possibles: string[]
}

export interface File {
  passages: Passage[]
  lignes: Ligne[]
  lots_entiers: LotEntier[]
  actions_possibles: string[]
}

export const CHEMIN_TRITURATIONS = '/api/triturations'

export function cheminRegroupement(lotsAchat: readonly number[]): string {
  const requete = lotsAchat.map((id) => `lots=${id}`).join('&')
  return `${CHEMIN_TRITURATIONS}/regroupement${requete === '' ? '' : `?${requete}`}`
}

export function cheminAction(passageId: number, action: 'demarrage' | 'fin-production' | 'annulation'): string {
  return `${CHEMIN_TRITURATIONS}/${passageId}/${action}`
}

/** Lots choisis pour le passage en préparation : un lot entier seul, ou des lots d'achat. */
export interface Choix {
  entier: number | null
  achats: number[]
}

export const CHOIX_VIDE: Choix = { entier: null, achats: [] }

export function choixVide(choix: Choix): boolean {
  return choix.entier === null && choix.achats.length === 0
}

/** Choisir un lot entier remplace tout ; le choisir de nouveau l'enlève. */
export function basculerEntier(choix: Choix, lotId: number): Choix {
  return choix.entier === lotId ? CHOIX_VIDE : { entier: lotId, achats: [] }
}

/** Ajouter ou enlever un lot d'achat ; un lot entier déjà choisi est abandonné. */
export function basculerAchat(choix: Choix, lotId: number): Choix {
  const achats = choix.achats.includes(lotId) ? choix.achats.filter((id) => id !== lotId) : [...choix.achats, lotId]
  return { entier: null, achats }
}

/** Un lot d'achat se choisit s'il est déjà choisi ou si le serveur le dit compatible. */
export function achatChoisissable(choix: Choix, lot: LotAchat): boolean {
  return choix.entier === null && (lot.choisi || lot.compatible === true)
}

/** Retire du choix les lots qui ont disparu des listes (pris par un autre poste, annulés). */
export function choixEncoreValide(choix: Choix, entiers: readonly LotEntier[], achats: readonly LotAchat[] | null): Choix {
  const entier = choix.entier !== null && entiers.some((l) => l.id === choix.entier) ? choix.entier : null
  const restants = achats === null ? choix.achats : choix.achats.filter((id) => achats.some((l) => l.id === id))
  return entier === choix.entier && restants.length === choix.achats.length ? choix : { entier, achats: restants }
}

/**
 * Corps de la création du passage, ou null si une ligne manque ou si des kg sont illisibles ou
 * dépassent le reste. Kg vides : tout le reste du lot (le serveur le calcule).
 */
export function corpsCreation(choix: Choix, ligneId: number | null, kgSaisis: Readonly<Record<number, string>>, achats: readonly LotAchat[]) {
  if (ligneId === null || choixVide(choix)) return null
  if (choix.entier !== null) return { ligne_id: ligneId, lots: [{ lot_id: choix.entier }] }
  const lots: { lot_id: number; poids_kg?: number }[] = []
  for (const lotId of choix.achats) {
    const lot = achats.find((l) => l.id === lotId)
    const texte = (kgSaisis[lotId] ?? '').trim()
    if (lot === undefined) return null
    if (texte === '') {
      lots.push({ lot_id: lotId })
      continue
    }
    const kg = entierPositif(texte)
    if (kg === null || kg > lot.reste_kg) return null
    lots.push({ lot_id: lotId, poids_kg: kg })
  }
  return { ligne_id: ligneId, lots }
}

/** Corps de la fin de production, ou null si la température (°C) ou la durée (min) est illisible. */
export function corpsFinProduction(temperature: string, duree: string) {
  const centiemesTemperature = temperature.trim() === '' ? null : uniteExacte(temperature, 2)
  const minutes = duree.trim() === '0' ? 0 : entierPositif(duree)
  if (centiemesTemperature === null || centiemesTemperature > 10_000 || minutes === null || minutes > 1_440) return null
  return { temperature_malaxage_centiemes: centiemesTemperature, duree_malaxage_min: minutes }
}

/** Acidité d'un groupe : « 0,45 » si elle tombe juste, sinon l'encadrement « 0,46 à 0,47 ». */
export function afficherAciditeGroupe(groupe: Groupe): string {
  if (groupe.acidite_centiemes !== null) return afficherCentiemes(groupe.acidite_centiemes)
  return `${afficherCentiemes(groupe.acidite_plancher_centiemes)} à ${afficherCentiemes(groupe.acidite_plafond_centiemes)}`
}

/** État de l'indicateur de froid d'un passage dont la production est finie. */
export function etatFroid(passage: Passage): 'respecte' | 'depasse' | 'sans_seuil' | null {
  if (passage.froid === null) return null
  if (passage.froid.seuil_depasse === null) return 'sans_seuil'
  return passage.froid.seuil_depasse ? 'depasse' : 'respecte'
}

/**
 * Passages d'une ligne pour le tableau des lignes : en cours, puis planifiés, dans l'ordre de la liste du serveur.
 * Rien n'est estimé : ni avancement, ni heure de fin.
 */
export function passagesDeLigne(passages: readonly Passage[], ligneId: number): { enCours: Passage[]; planifies: Passage[] } {
  const surLigne = passages.filter((p) => p.ligne.id === ligneId)
  return { enCours: surLigne.filter((p) => p.statut === 'en_cours'), planifies: surLigne.filter((p) => p.statut === 'planifiee') }
}
