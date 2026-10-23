// Logique pure des chargements de citerne (T6.4, T-155). Le serveur reste juge (pas de la bascule, minimum, plein
// au-dessus du vide, stock disponible) : ces fonctions choisissent seulement quoi afficher et préparent les corps.
import { uniteExacte } from '../format/saisie'
import { libelles } from '../libelles'

const t = libelles.chargements

export type StatutChargement = 'cree' | 'pesee_vide' | 'termine' | 'annule'

export interface ContratChargeable {
  id: number
  numero: number
  client: string
  qualite: string
  cuve_id: number | null
  poids_restant_g: number
  prix_unitaire_millimes_kg: number
}

export interface CuvePreparation {
  id: number
  code: string
  qualite: string
  stock_g: number
}

export interface Preparation {
  contrats: ContratChargeable[]
  cuves: CuvePreparation[]
}

/** Ligne de `chargement` relue par le serveur (`service.lire`). */
export interface Chargement {
  id: number
  contrat_vente_id: number
  client_id: number
  cuve_id: number
  cuve_code: string
  qualite: string
  statut: StatutChargement
  poids_vide_kg: number | null
  poids_plein_kg: number | null
  poids_charge_g: number | null
  prix_unitaire_millimes_kg: number | null
  echantillon_reference: string | null
}

/** Cuves proposées pour un contrat : de sa qualité, et seulement la sienne s'il en réserve une. */
export function cuvesDuContrat(cuves: readonly CuvePreparation[], contrat: ContratChargeable | null): CuvePreparation[] {
  if (contrat === null) return []
  return cuves.filter((c) => c.qualite === contrat.qualite && (contrat.cuve_id === null || c.id === contrat.cuve_id))
}

export interface Etape {
  cle: string
  libelle: string
}

/**
 * Étapes du chargement d'après son `statut` et son échantillon, tels que le serveur les donne. L'échantillon acheteur
 * est facultatif : un chargement terminé sans échantillon n'affiche pas cette étape comme faite.
 */
export function etapesChargement(c: Pick<Chargement, 'statut' | 'echantillon_reference'>): { etapes: Etape[]; rang: number } {
  const toutes: Etape[] = [
    { cle: 'cree', libelle: t.etapes.cree },
    { cle: 'pesee_vide', libelle: t.etapes.pesee_vide },
    { cle: 'echantillon', libelle: t.etapes.echantillon },
    { cle: 'termine', libelle: t.etapes.termine },
  ]
  const avecEchantillon = c.echantillon_reference !== null
  if (c.statut === 'termine') {
    const etapes = avecEchantillon ? toutes : toutes.filter((e) => e.cle !== 'echantillon')
    return { etapes, rang: etapes.length }
  }
  if (c.statut === 'pesee_vide') return { etapes: toutes, rang: avecEchantillon ? 3 : 2 }
  return { etapes: toutes, rang: 1 }
}

/** Couleur de l'état : en cours (créé, pesé à vide), terminé, ou annulé. */
export function tonStatut(statut: StatutChargement): 'neutre' | 'action' | 'ok' {
  if (statut === 'termine') return 'ok'
  if (statut === 'pesee_vide') return 'action'
  return 'neutre'
}

/** Annulable seulement avant la sortie de stock (le serveur refuse ensuite). */
export function annulable(statut: StatutChargement): boolean {
  return statut === 'cree' || statut === 'pesee_vide'
}

type Resultat = { corps: Record<string, unknown> | null; erreur: string | null }

const kgEntiers = (texte: string): number | null => {
  const propre = texte.trim()
  if (!/^\d+$/.test(propre)) return null
  const poids = Number(propre)
  return Number.isSafeInteger(poids) ? poids : null
}

export function corpsPeseeVide(texte: string): Resultat {
  const poids = kgEntiers(texte)
  return poids === null ? { corps: null, erreur: t.erreurs.vide } : { corps: { poids_vide_kg: poids }, erreur: null }
}

/** Le prix propre au chargement est facultatif ; vide, le serveur garde celui du contrat. */
export function corpsFinalisation(plein: string, prix: string): Resultat {
  const poids = kgEntiers(plein)
  if (poids === null) return { corps: null, erreur: t.erreurs.plein }
  const prixSaisi = prix.trim() === '' ? null : uniteExacte(prix, 3)
  if (prix.trim() !== '' && prixSaisi === null) return { corps: null, erreur: t.erreurs.prix }
  return { corps: { poids_plein_kg: poids, prix_unitaire_millimes_kg: prixSaisi }, erreur: null }
}
