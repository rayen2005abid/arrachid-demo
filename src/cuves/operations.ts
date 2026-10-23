// Logique pure des opérations de cuve (T4.9 ; CONTEXTE §17.4, §18) : purge, contrôle à la
// réglette, ajustement, transfert, autorisation de mélange. Le serveur décide de ce qui est
// possible (`actions_possibles`) et de tout calcul ; l'écran ne fait que saisir des poids.
import { grammesVersKg, kgVersGrammes } from '../administration/unites'
import type { Cuve } from './logique'

export type Operation = 'purge' | 'inventaire' | 'ajustement' | 'transfert' | 'melange'
export type EtatInventaire = 'a_valider' | 'ajuste' | 'conforme' | 'perime'

export interface Inventaire {
  id: number
  cuve_id: number
  horodatage: string
  methode: string
  operateur: string
  mesure_physique_g: number
  stock_calcule_g: number
  ecart_g: number
  etat: EtatInventaire
  valide_par: string | null
  motif: string | null
  actions_possibles: string[]
}

export interface Campagne {
  id: number
  libelle: string
}

export interface AutorisationMelange {
  id: number
  cuve_id: number
  campagne_source: Campagne
  campagne_destination: Campagne
  autorise_par: string
  motif: string
  horodatage: string
}

export const CHEMIN_TRANSFERTS = '/api/transferts-cuve'

export function cheminPurges(cuveId: number): string {
  return `/api/cuves/${cuveId}/purges`
}

export function cheminInventaires(cuveId: number): string {
  return `/api/cuves/${cuveId}/inventaires`
}

export function cheminAjustement(inventaireId: number): string {
  return `/api/inventaires-cuve/${inventaireId}/validation`
}

export function cheminAutorisations(cuveId: number): string {
  return `/api/cuves/${cuveId}/autorisations-melange`
}

const PAR_ACTION: Record<string, Operation> = {
  purger: 'purge',
  inventorier: 'inventaire',
  transferer: 'transfert',
  autoriser_melange: 'melange',
}

/** Opérations que le serveur propose à cette personne pour cette cuve, dans son ordre. */
export function operationsPossibles(cuve: Pick<Cuve, 'actions_possibles'>): Operation[] {
  return cuve.actions_possibles.flatMap((action) => (action in PAR_ACTION ? [PAR_ACTION[action]] : []))
}

/** Poids de la purge tapé en kg ; null s'il n'est pas un poids exact strictement positif. */
export function corpsPurge(poids: string): { poids_g: number } | null {
  const grammes = kgVersGrammes(poids)
  return grammes === null || grammes <= 0 ? null : { poids_g: grammes }
}

/** Mesure à la réglette tapée en kg ; zéro est une mesure valable (cuve vide). */
export function corpsInventaire(mesure: string): { mesure_physique_g: number } | null {
  const grammes = kgVersGrammes(mesure)
  return grammes === null ? null : { mesure_physique_g: grammes }
}

/** « + 2 », « − 1,5 » ou « 0 » kg : écart d'un contrôle, signe moins typographique. */
export function afficherEcart(ecartG: number): string {
  if (ecartG === 0) return '0'
  return `${ecartG > 0 ? '+' : '−'} ${grammesVersKg(Math.abs(ecartG))}`
}

/** Raison d'une opération approuvée ; le PIN est joint par l'écran. */
export function corpsApprobation(motif: string): { motif: string } | null {
  const raison = motif.trim()
  return raison === '' ? null : { motif: raison }
}

export function corpsTransfert(sourceId: number, destinationId: number | null, poids: string, motif: string) {
  const purge = corpsPurge(poids)
  const approbation = corpsApprobation(motif)
  if (destinationId === null || destinationId === sourceId || purge === null || approbation === null) return null
  return { cuve_source_id: sourceId, cuve_destination_id: destinationId, poids_g: purge.poids_g, ...approbation }
}

export function corpsMelange(campagneId: number | null, motif: string) {
  const approbation = corpsApprobation(motif)
  return campagneId === null || approbation === null ? null : { campagne_source_id: campagneId, ...approbation }
}

/** Cuves d'arrivée proposées pour un transfert : les autres cuves actives. Le serveur contrôle le reste. */
export function destinationsPossibles<T extends Pick<Cuve, 'id' | 'active'>>(cuves: readonly T[], sourceId: number): T[] {
  return cuves.filter((cuve) => cuve.active && cuve.id !== sourceId)
}

/** Le contrôle que la personne veut ajuster, s'il peut encore l'être. */
export function inventaireAAjuster(inventaires: readonly Inventaire[], choisi: number | null): Inventaire | null {
  return inventaires.find((i) => i.id === choisi && i.actions_possibles.includes('valider_ajustement')) ?? null
}
