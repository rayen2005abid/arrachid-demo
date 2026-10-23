// Logique pure du registre des cuves (T4.1, CONTEXTE §17, §18). Le serveur calcule le stock,
// le disponible et l'acidité ; l'écran ne fait qu'afficher, sans jamais arrondir.
import { grammesVersKg } from '../administration/unites'
import { afficherCentiemes } from '../laboratoire/analyse'
import { libelles } from '../libelles'
import type { AutorisationMelange, Campagne, Inventaire } from './operations'

const t = libelles.cuves

export type Qualite = 'extra_vierge' | 'vierge' | 'lampante'
export type EtatAcidite = 'vide' | 'connue' | 'inconnue' | 'a_verifier'

export interface Cuve {
  id: number
  code: string
  libelle: string
  groupe: string | null
  active: boolean
  capacite_g: number
  qualite_affectee: Qualite
  stock_calcule_g: number
  stock_reserve_g: number
  stock_disponible_g: number
  remplissage_centiemes: number
  etat_acidite: EtatAcidite
  /** Valeur exacte en centièmes, ou null si elle ne tombe pas juste (voir l'encadrement). */
  acidite_centiemes: number | null
  acidite_plancher_centiemes: number | null
  acidite_plafond_centiemes: number | null
  qualite_calculee: Qualite | null
  campagnes_origine: { id: number; libelle: string }[]
  actions_possibles: string[]
}

export interface ResumeQualite {
  qualite: Qualite
  stock_calcule_g: number
  stock_reserve_g: number
  reserve_sans_cuve_g: number
  stock_disponible_g: number
}

export interface Registre {
  cuves: Cuve[]
  qualites: ResumeQualite[]
}

interface Passage {
  id: number
  numero: number
}
interface LotOrigine {
  id: number
  numero: number
  reception_id: number
  apporteur: string
}

export type Origine =
  | { type: 'pesee_huile'; id: number; sequence: number; trituration: Passage; lots: LotOrigine[] }
  | { type: 'partage_huile'; id: number; trituration: Passage; lots: LotOrigine[] }
  | { type: 'transfert_cuve'; id: number; cuve_source: { id: number; code: string }; cuve_destination: { id: number; code: string } }
  | { type: 'purge'; id: number; methode: string }
  | { type: 'inventaire_cuve'; id: number; methode: string }
  | { type: 'chargement'; id: number }
  | { type: 'vente_detail'; id: number }

export type TypeMouvement = 'entree' | 'sortie' | 'purge' | 'transfert_entree' | 'transfert_sortie' | 'ajustement'

export interface MouvementCuve {
  id: number
  horodatage: string
  type: TypeMouvement
  /** Effet réel sur le stock : une extourne agit à l'inverse de son type. */
  sens: 'entree' | 'sortie'
  poids_g: number
  acidite_centiemes: number | null
  /** Encadrement exact de l'acidité portée quand elle ne tombe pas juste (passage groupé, T4.5). */
  acidite_plancher_centiemes?: number | null
  acidite_plafond_centiemes?: number | null
  campagne_origine: { id: number; libelle: string }
  melange_autorise: boolean
  est_extourne: boolean
  extourne_de_id: number | null
  annule_par_id: number | null
  operateur: string
  origine: Origine
}

export interface AnalyseCuve {
  id: number
  reference: string
  preleve_le: string
  saisi_le: string
  acidite_centiemes: number
  classement: Qualite
}

export interface DetailCuve {
  cuve: Cuve
  analyses: AnalyseCuve[]
  mouvements: MouvementCuve[]
  /** Opérations de cuve (T4.9) : derniers contrôles, mélanges autorisés, autres campagnes. */
  inventaires?: Inventaire[]
  autorisations_melange?: AutorisationMelange[]
  campagnes_precedentes?: Campagne[]
  /** Mouvements manuels en vigueur que la personne peut annuler ou corriger (T4.10). */
  mouvements_corrigeables?: number[]
}

export const CHEMIN_REGISTRE = '/api/cuves/registre'

export function cheminMouvements(cuveId: number): string {
  return `/api/cuves/${cuveId}/mouvements`
}

/** Identifiant de cuve lu dans l'adresse (`?cuve=3`) ; null si absent ou illisible. */
export function identifiantCuve(parametre: string | null): number | null {
  if (parametre === null || !/^[1-9][0-9]*$/.test(parametre)) return null
  const valeur = Number(parametre)
  return Number.isSafeInteger(valeur) ? valeur : null
}

export const afficherKg = grammesVersKg

/**
 * Acidité calculée d'une cuve : « 0,50 % », « entre 0,41 et 0,42 % » quand elle ne tombe pas
 * juste, sinon « Vide », « Inconnue » ou « À vérifier ». Jamais 0 pour une valeur absente.
 */
export function afficherAcidite(cuve: Pick<Cuve, 'etat_acidite' | 'acidite_centiemes' | 'acidite_plancher_centiemes' | 'acidite_plafond_centiemes'>): string {
  if (cuve.etat_acidite !== 'connue') return t.acidite[cuve.etat_acidite]
  if (cuve.acidite_centiemes !== null) return t.acidite.exacte.replace('{valeur}', afficherCentiemes(cuve.acidite_centiemes))
  if (cuve.acidite_plancher_centiemes === null || cuve.acidite_plafond_centiemes === null) return t.acidite.inconnue
  return t.acidite.encadree
    .replace('{bas}', afficherCentiemes(cuve.acidite_plancher_centiemes))
    .replace('{haut}', afficherCentiemes(cuve.acidite_plafond_centiemes))
}

/** Acidité portée par un mouvement : « 0,45 », l'encadrement « 0,46 à 0,47 », ou « — » si aucune. */
export function afficherAciditePortee(mouvement: Pick<MouvementCuve, 'acidite_centiemes' | 'acidite_plancher_centiemes' | 'acidite_plafond_centiemes'>): string {
  if (mouvement.acidite_centiemes !== null) return afficherCentiemes(mouvement.acidite_centiemes)
  const { acidite_plancher_centiemes: bas, acidite_plafond_centiemes: haut } = mouvement
  if (bas === null || bas === undefined || haut === null || haut === undefined) return '—'
  return `${afficherCentiemes(bas)} à ${afficherCentiemes(haut)}`
}

/** L'acidité calculée ne correspond plus à la qualité affectée : à signaler, rien n'est changé. */
export function qualiteACorriger(cuve: Pick<Cuve, 'qualite_affectee' | 'qualite_calculee'>): boolean {
  return cuve.qualite_calculee !== null && cuve.qualite_calculee !== cuve.qualite_affectee
}

export function stockTotal(cuves: readonly Pick<Cuve, 'stock_calcule_g'>[]): number {
  return cuves.reduce((somme, cuve) => somme + cuve.stock_calcule_g, 0)
}

/** Couleur d'une cuve dessinée : sa qualité, « attente » tant que l'acidité n'est pas sûre, rien si elle est vide. */
export type Remplissage = Qualite | 'attente' | 'vide'

export function remplissageCuve(cuve: Pick<Cuve, 'stock_calcule_g' | 'etat_acidite' | 'qualite_affectee'>): Remplissage {
  if (cuve.stock_calcule_g <= 0) return 'vide'
  if (cuve.etat_acidite === 'inconnue' || cuve.etat_acidite === 'a_verifier') return 'attente'
  return cuve.qualite_affectee
}

/** Rangée de la cave à huile : les cuves d'un même groupe (référentiel), avec leur stock et leur capacité. */
export interface Rangee {
  groupe: string | null
  cuves: Cuve[]
  stock_g: number
  capacite_g: number
}

/**
 * Cuves rangées par groupe, dans l'ordre où les groupes apparaissent ; les cuves sans groupe ferment la cave.
 * Dans une rangée, les cuves gardent l'ordre du serveur.
 */
export function rangeesCuves(cuves: readonly Cuve[]): Rangee[] {
  const parGroupe = new Map<string | null, Cuve[]>()
  for (const cuve of cuves) {
    const groupe = cuve.groupe === null || cuve.groupe.trim() === '' ? null : cuve.groupe
    parGroupe.set(groupe, [...(parGroupe.get(groupe) ?? []), cuve])
  }
  const groupes = [...parGroupe.keys()].sort((a, b) => Number(a === null) - Number(b === null))
  return groupes.map((groupe) => {
    const liste = parGroupe.get(groupe) ?? []
    return { groupe, cuves: liste, stock_g: stockTotal(liste), capacite_g: liste.reduce((somme, c) => somme + c.capacite_g, 0) }
  })
}

const CUVE_DESSINEE = { hauteur: { min: 52, max: 150 }, largeur: { min: 30, max: 60 } }

/**
 * Taille d'une cuve dessinée en pixels, proportionnelle à la racine cubique de sa capacité (comme un volume) et bornée
 * pour qu'une petite cuve reste visible. Simple dessin : aucun chiffre n'en découle.
 */
export function tailleCuve(capaciteG: number, capaciteMaxG: number): { hauteur: number; largeur: number } {
  const rapport = capaciteMaxG > 0 ? Math.cbrt(Math.min(Math.max(capaciteG, 0) / capaciteMaxG, 1)) : 1
  const borne = (cote: { min: number; max: number }) => Math.round(Math.max(cote.min, cote.max * rapport))
  return { hauteur: borne(CUVE_DESSINEE.hauteur), largeur: borne(CUVE_DESSINEE.largeur) }
}

/** Largeur de la jauge, bornée à 100 % ; le chiffre affiché reste celui du serveur. */
export function largeurJauge(remplissageCentiemes: number): string {
  return `${afficherCentiemes(Math.min(Math.max(remplissageCentiemes, 0), 10000)).replace(',', '.')}%`
}

/** « + 250 » pour ce qui entre, « − 40 » pour ce qui sort (signe moins typographique). */
export function poidsSigne(mouvement: Pick<MouvementCuve, 'sens' | 'poids_g'>): string {
  return `${mouvement.sens === 'entree' ? '+' : '−'} ${afficherKg(mouvement.poids_g)}`
}

/** Marque d'un mouvement corrigé : l'extourne elle-même, ou l'original qu'elle annule. */
export function marque(mouvement: Pick<MouvementCuve, 'est_extourne' | 'annule_par_id'>): 'extourne' | 'annule' | null {
  if (mouvement.est_extourne) return 'extourne'
  return mouvement.annule_par_id !== null ? 'annule' : null
}

function texteLots(lots: readonly LotOrigine[]): string {
  return lots.length === 0 ? '' : ` — ${t.origines.lots.replace('{numeros}', lots.map((lot) => lot.numero).join(', '))}`
}

/** Apporteurs des lots d'un mouvement, sans doublon ; vide quand le mouvement ne vient pas d'une trituration. */
export function decrireApporteurs(origine: Origine): string {
  if (origine.type !== 'pesee_huile' && origine.type !== 'partage_huile') return ''
  return [...new Set(origine.lots.map((lot) => lot.apporteur))].join(', ')
}

/** Origine d'un mouvement en une ligne : pesée ou partage, passage, lots et réceptions (CONTEXTE §17.4). */
export function decrireOrigine(origine: Origine): string {
  switch (origine.type) {
    case 'pesee_huile':
      return t.origines.pesee.replace('{sequence}', String(origine.sequence)).replace('{passage}', String(origine.trituration.numero)) + texteLots(origine.lots)
    case 'partage_huile':
      return t.origines.partage.replace('{passage}', String(origine.trituration.numero)) + texteLots(origine.lots)
    case 'transfert_cuve':
      return t.origines.transfert.replace('{source}', origine.cuve_source.code).replace('{destination}', origine.cuve_destination.code)
    case 'purge':
      return t.origines.purge.replace('{methode}', origine.methode)
    case 'inventaire_cuve':
      return t.origines.inventaire.replace('{methode}', origine.methode)
    case 'chargement':
      return t.origines.chargement.replace('{id}', String(origine.id))
    case 'vente_detail':
      return t.origines.venteDetail.replace('{id}', String(origine.id))
  }
}
