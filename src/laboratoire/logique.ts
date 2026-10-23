// Logique pure du laboratoire (T3.1, CONTEXTE §11.1–§11.2). Le serveur reste juge : il calcule la
// référence et la date de fin de conservation, et dit quelles actions sont possibles.

export type Regime = 'achat' | 'mixte'

export interface Echantillon {
  id: number
  reference: string
  reception: { id: number; numero: number; regime: Regime; apporteur: string }
  preleve_le: string
  preleve_par: string
  emplacement: string
  date_fin_conservation: string
  detruit_le: string | null
  detruit_par: string | null
  analyse_saisie: boolean
  actions_possibles: string[]
}

export interface ReceptionEnAttente {
  id: number
  numero: number
  statut: string
  regime: Regime
  apporteur: string
  net_kg: number
  bacs: number[]
  ticket_le: string
  etape: 'a_prelever' | 'a_analyser'
  echantillon: Echantillon | null
  actions_possibles: string[]
}

export type EtatEchantillon = 'conserve' | 'a_detruire' | 'detruit'

/** Mode du laboratoire (E-37) : analyse sur place, et échantillons encore gardés de la campagne. */
export interface ModeLabo {
  analyse_sur_place: boolean
  echantillons_conserves: number
}

export const CHEMIN_MODE = '/api/laboratoire/mode'
export const CODE_REGISTRE = 'LAB-02'

/** Sur place et sans sachet à garder, le registre n'a rien à montrer : son entrée de menu est masquée. */
export function registreInutile(mode: ModeLabo | null): boolean {
  return mode !== null && mode.analyse_sur_place && mode.echantillons_conserves === 0
}

export const CHEMIN_FILE = '/api/laboratoire/file'
export const CHEMIN_ECHANTILLONS = '/api/echantillons-olive'

export function cheminRegistre(avecDetruits: boolean): string {
  return avecDetruits ? `${CHEMIN_ECHANTILLONS}?detruits=true` : CHEMIN_ECHANTILLONS
}

export function cheminDestruction(echantillonId: number): string {
  return `${CHEMIN_ECHANTILLONS}/${echantillonId}/destruction`
}

/** Écran de saisie d'analyse ouvert sur cet échantillon (T3.2). */
export function cheminSaisie(echantillonId: number): string {
  return `/laboratoire/analyses?echantillon=${echantillonId}`
}

/** Seule saisie de l'opérateur : l'emplacement ; le reste vient du serveur. */
export function corpsEchantillon(receptionId: number, emplacement: string): { reception_id: number; emplacement: string } {
  return { reception_id: receptionId, emplacement: emplacement.trim() }
}

export function peutPrelever(reception: ReceptionEnAttente): boolean {
  return reception.actions_possibles.includes('prelever')
}

export function peutDetruire(echantillon: Echantillon): boolean {
  return echantillon.actions_possibles.includes('detruire')
}

/** « À détruire » quand le serveur propose la destruction (fin de conservation atteinte). */
export function etatEchantillon(echantillon: Echantillon): EtatEchantillon {
  if (echantillon.detruit_le !== null) return 'detruit'
  return peutDetruire(echantillon) ? 'a_detruire' : 'conserve'
}

export function compter(file: readonly ReceptionEnAttente[]): { aPrelever: number; aAnalyser: number } {
  const aPrelever = file.filter((r) => r.etape === 'a_prelever').length
  return { aPrelever, aAnalyser: file.length - aPrelever }
}

/** Emplacement proposé : celui du dernier échantillon prélevé de la file, sinon vide. */
export function dernierEmplacement(file: readonly ReceptionEnAttente[]): string {
  const echantillons = file.flatMap((r) => (r.echantillon === null ? [] : [r.echantillon]))
  const dernier = echantillons.sort((a, b) => b.id - a.id)[0]
  return dernier?.emplacement ?? ''
}

/** Bacs « 1, 2, 5 » pour aller chercher les olives. */
export function texteBacs(bacs: readonly number[]): string {
  return bacs.join(', ')
}

/**
 * Réception montrée à droite de l'écran « Analyses d'olives » (LAB-01 et LAB-03 réunis) : celle que la personne a
 * choisie, sinon celle de l'échantillon nommé dans l'adresse (`?echantillon=`), sinon, sur la saisie d'analyse, le seul
 * échantillon qui attend son analyse (ou la seule réception analysée sur place, E-37). Une réception sortie de la file
 * n'est plus montrée.
 */
export function receptionMontree(
  file: readonly ReceptionEnAttente[],
  choisieId: number | null,
  echantillonAdresse: string | null,
  vueAnalyse: boolean,
): ReceptionEnAttente | null {
  const choisie = file.find((r) => r.id === choisieId)
  if (choisie !== undefined) return choisie
  const parAdresse = file.find((r) => r.echantillon !== null && String(r.echantillon.id) === echantillonAdresse)
  if (parAdresse !== undefined) return parAdresse
  // Sur place (E-37), une réception sans échantillon attend aussi son analyse.
  const enAttente = file.filter((r) => r.etape === 'a_analyser' && r.actions_possibles.includes('analyser'))
  return vueAnalyse && enAttente.length === 1 ? (enAttente[0] ?? null) : null
}

/** Rang de l'étape en cours du parcours ticket, échantillon, analyse, prix : tiré de la seule `etape` du serveur. */
export function rangParcours(reception: Pick<ReceptionEnAttente, 'etape'>): number {
  return reception.etape === 'a_prelever' ? 1 : 2
}

/** « actifs » : conservés et à détruire (la puce « Tous ») ; les détruits se lisent à part. */
export type FiltreEchantillons = 'actifs' | 'a_detruire' | 'detruits'

/** Les détruits ne sont lus que pour le filtre qui les montre. */
export function lireDetruits(filtre: FiltreEchantillons): boolean {
  return filtre === 'detruits'
}

/** Lignes du registre gardées par le filtre ; « à détruire » suit ce que le serveur propose. */
export function filtrerEchantillons(registre: readonly Echantillon[], filtre: FiltreEchantillons): Echantillon[] {
  return registre.filter((e) => {
    const etat = etatEchantillon(e)
    if (filtre === 'actifs') return etat !== 'detruit'
    if (filtre === 'a_detruire') return etat === 'a_detruire'
    return etat === 'detruit'
  })
}

/**
 * Nombre exact de lignes de chaque filtre dans la réponse lue. Les détruits ne sont comptés que si la lecture les
 * contient (`avecDetruits`) : sinon leur nombre n'est pas connu et n'est pas montré.
 */
export function compterEchantillons(
  registre: readonly Echantillon[],
  avecDetruits: boolean,
): { actifs: number; a_detruire: number; detruits: number | undefined } {
  const n = (filtre: FiltreEchantillons) => filtrerEchantillons(registre, filtre).length
  return {
    actifs: n('actifs'),
    a_detruire: n('a_detruire'),
    detruits: avecDetruits ? n('detruits') : undefined,
  }
}
