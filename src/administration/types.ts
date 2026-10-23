// Formes des réponses des API d'administration (T1.7 serveur).
import type { Role, TypePoste } from '../types'

export interface Element {
  id: number
  actions_possibles: string[]
}

export interface Utilisateur extends Element {
  nom: string
  role: Role
  actif: number
  cree_le: string
  desactive_le: string | null
}

export interface PosteAdmin extends Element {
  code: string
  libelle: string
  type_poste: TypePoste
  actif: number
  appairages_actifs: number
}

export interface Appairage extends Element {
  poste_id: number
  appaire_par: number
  appaire_par_nom: string
  appaire_le: string
  revoque_le: string | null
}

export interface Lien extends Element {
  poste_id: number
  equipement_id: number
  code: string
  type: TypeEquipement
  libelle: string
  equipement_actif: number
  actif: number
}

export const TYPES_EQUIPEMENT = [
  'bascule',
  'imprimante_ticket',
  'imprimante_a4',
  'analyseur',
  'balance_huile',
  'thermometre',
  'ligne_trituration',
] as const
export type TypeEquipement = (typeof TYPES_EQUIPEMENT)[number]

export interface Equipement extends Element {
  code: string
  type: TypeEquipement
  libelle: string
  marque: string | null
  modele: string | null
  numero_serie: string | null
  emplacement: string | null
  adresse_reseau: string | null
  actif: number
  ajoute_par: number
  ajoute_par_nom: string
  ajoute_le: string
  postes: { id: number; code: string; libelle: string }[]
}

/** Fiche de référentiel : colonnes de la table, état dérivé, `en_usage` et actions. */
export type FicheReferentiel = Element & { en_usage: boolean } & Record<string, unknown>

export interface Changement {
  champ: string
  avant: unknown
  apres: unknown
}

export interface EntreeHistorique {
  id: number
  modifie_le: string
  modifie_par: number
  modifie_par_nom: string
  motif: string | null
  operation_id: string
  anciennes_valeurs: Record<string, unknown>
  changements: Changement[]
}

export interface VueHistorique {
  table: string
  ligne_id: number
  ligne: Record<string, unknown>
  historique: EntreeHistorique[]
}
