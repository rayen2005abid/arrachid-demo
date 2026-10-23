// Logique pure de l'écran des profils fiscaux (T6.2). Les taux tapés en % partent en ppm et le
// timbre en millimes, sans virgule flottante ; le serveur recalcule et décide.
import { uniteExacte } from '../format/saisie'
import { libelles } from '../libelles'
import type { Validation } from '../types'

const e = libelles.profilsFiscaux.erreurs

export type TypeOperation = 'vente_vrac' | 'vente_detail' | 'redevance'
export type RegimeTva = 'normal' | 'suspension' | 'export'

export interface ProfilFiscal {
  id: number
  code: string
  libelle: string
  type_operation: TypeOperation
  regime_tva_client: RegimeTva
  taux_tva_ppm: number
  taux_parafiscal_ppm: number
  parafiscal_dans_base_tva: boolean
  timbre_millimes: number
  valide_du: string
  valide_au: string | null
  actif: number
  auteur: string
  motif: string
  en_vigueur: boolean
}

export interface ListeProfils {
  heure_serveur: string
  valide_du_minimum: string
  types_operation: TypeOperation[]
  profils: ProfilFiscal[]
}

export interface SaisieProfil {
  code: string
  libelle: string
  type_operation: TypeOperation
  regime_tva_client: RegimeTva
  tva: string
  parafiscal: string
  dansBase: boolean
  timbre: string
  depuisOuverture: boolean
  motif: string
}

export const SAISIE_VIDE: SaisieProfil = {
  code: '', libelle: '', type_operation: 'vente_vrac', regime_tva_client: 'normal',
  tva: '', parafiscal: '', dansBase: false, timbre: '', depuisOuverture: false, motif: '',
}

/** Nouvelle version d'un profil existant : mêmes clés et valeurs, à changer. */
export function saisieDe(p: ProfilFiscal): SaisieProfil {
  return {
    code: p.code, libelle: p.libelle, type_operation: p.type_operation, regime_tva_client: p.regime_tva_client,
    tva: ppmEnPourcent(p.taux_tva_ppm), parafiscal: ppmEnPourcent(p.taux_parafiscal_ppm),
    dansBase: p.parafiscal_dans_base_tva, timbre: millimesEnDinars(p.timbre_millimes), depuisOuverture: false, motif: '',
  }
}

/** 190000 → « 19 » ; 12500 → « 1,25 » (affichage exact, sans arrondi). */
export function ppmEnPourcent(ppm: number): string {
  const entier = Math.trunc(ppm / 10_000)
  const fraction = String(ppm % 10_000).padStart(4, '0').replace(/0+$/, '')
  return fraction === '' ? String(entier) : `${entier},${fraction}`
}

export function millimesEnDinars(millimes: number): string {
  return `${Math.trunc(millimes / 1000)},${String(millimes % 1000).padStart(3, '0')}`
}

/** « Depuis l'ouverture » seulement avant toute opération (le serveur donne la date minimale). */
export function ouvertureAutorisee(liste: ListeProfils): boolean {
  return liste.valide_du_minimum < liste.heure_serveur
}

export function corpsProfil(s: SaisieProfil, liste: ListeProfils, validation: Validation | null): { corps: Record<string, unknown> | null; erreur: string | null } {
  const refuse = (erreur: string) => ({ corps: null, erreur })
  if (s.code.trim() === '' || s.libelle.trim() === '') return refuse(e.codeLibelle)
  const tva = uniteExacte(s.tva, 4)
  const parafiscal = uniteExacte(s.parafiscal.trim() === '' ? '0' : s.parafiscal, 4)
  if (tva === null || parafiscal === null || tva > 1_000_000 || parafiscal > 1_000_000) return refuse(e.taux)
  const timbre = uniteExacte(s.timbre.trim() === '' ? '0' : s.timbre, 3)
  if (timbre === null) return refuse(e.timbre)
  if (s.motif.trim() === '') return refuse(e.motif)
  if (validation === null) return refuse(e.validation)
  return {
    erreur: null,
    corps: {
      code: s.code.trim().toUpperCase(), libelle: s.libelle.trim(), type_operation: s.type_operation,
      regime_tva_client: s.regime_tva_client, taux_tva_ppm: tva, taux_parafiscal_ppm: parafiscal,
      parafiscal_dans_base_tva: s.dansBase, timbre_millimes: timbre,
      valide_du: s.depuisOuverture && ouvertureAutorisee(liste) ? liste.valide_du_minimum : null,
      motif: s.motif.trim(), validation,
    },
  }
}
