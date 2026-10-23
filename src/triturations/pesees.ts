// Logique pure de l'écran « Trituration en cours » (T4.5 ; CONTEXTE §16.1, §16.5, §17.2).
// Le serveur décide de la destination (cuve ou tampon), recommande les cuves et calcule le contenu
// des tampons ; l'écran saisit le poids réel du contenant et choisit parmi ce qui est proposé.
import { grammesVersKg, kgVersGrammes } from '../administration/unites'
import { afficherCentiemes } from '../laboratoire/analyse'
import { CHEMIN_TRITURATIONS, type Passage, type Qualite } from './logique'

export type Destination = 'cuve' | 'tampon'
export type RaisonCuve =
  | 'cuve_inactive'
  | 'qualite_cuve_inconnue'
  | 'qualite_incompatible'
  | 'capacite_depassee'
  | 'acidite_cuve_inconnue'
  | 'hors_tolerance'
  | 'moyenne_hors_qualite'
  | 'au_dela_de_trois'

export interface PeseeHuile {
  id: number
  sequence: number
  poids_g: number
  destination: Destination
  cuve: { id: number; code: string } | null
  tampon: { id: number; code: string } | null
  source: 'manuel' | 'automatique'
  horodatage: string
  operateur: string
  /** Faux pour une pesée remplacée par une correction : visible, hors du total. */
  active: boolean
}

export interface AciditePassage {
  acidite_centiemes: number | null
  acidite_plancher_centiemes: number
  acidite_plafond_centiemes: number
}

interface CuveOrientee {
  id: number
  code: string
  libelle: string
  capacite_g: number
  /** Absente pour une cuve dont la qualité n'est pas encore affectée (écartée). */
  qualite_affectee: Qualite | null
  stock_calcule_g: number
  /** Acidité calculée de la cuve (juste, sinon encadrée) ; rien pour une cuve vide ou inconnue. */
  acidite_centiemes: number | null
  acidite_plancher_centiemes: number | null
  acidite_plafond_centiemes: number | null
  /** Écart exact entre l'huile et la cuve : ce que la tolérance compare. Rien si la cuve est vide ou inconnue. */
  ecart_acidite: AciditePassage | null
  /** Acidité de la cuve après ce contenant (moyenne exacte) ; rien si celle de la cuve est inconnue. */
  acidite_apres: AciditePassage | null
}

export interface CuveRecommandee extends CuveOrientee {
  /** Une cuve proposée a toujours la qualité de l'huile. */
  qualite_affectee: Qualite
  categorie: 'cuve_utilisee' | 'cuve_vide' | 'cuve_en_derogation'
  stock_apres_g: number
  derogation_utilisee: boolean
}

export interface CuveEcartee extends CuveOrientee {
  /** Stock de la cuve après ce contenant (utile pour une cuve compatible non proposée, qui reste choisissable). */
  stock_apres_g: number
  raisons: RaisonCuve[]
  /** Seule la tolérance d'acidité l'écarte : un responsable peut la lever (PIN et raison). */
  derogation_possible: boolean
}

export interface Orientation {
  statut: 'ok' | 'bloque_derogation_possible' | 'bloque_sans_derogation'
  qualite: Qualite
  /** Poids pour lequel le serveur a jugé les cuves (1 g sans poids tapé) : « après » ne vaut que pour ce poids. */
  poids_g: number
  /** Paramètres en vigueur que le serveur a appliqués (seuils de qualité, écart d'acidité toléré). */
  parametres: { seuil_extra_vierge_centiemes: number; seuil_vierge_centiemes: number; ecart_acidite_max_centiemes: number }
  recommandees: CuveRecommandee[]
  ecartees: CuveEcartee[]
}

export interface Tampon {
  id: number
  code: string
  libelle: string
  capacite_g: number
  contenu_g: number
  libre_g: number
  etat: 'libre' | 'ce_passage' | 'occupe'
  passage_occupant: number | null
}

export interface VuePesees {
  passage: Passage
  destination: Destination | null
  pesees: PeseeHuile[]
  huile_totale_g: number
  acidite: AciditePassage | null
  orientation: Orientation | null
  tampons: Tampon[]
  derniere_cuve_id: number | null
  dernier_tampon_id: number | null
  actions_possibles: string[]
  /** Pesées en vigueur que la personne peut corriger (T4.10). */
  pesees_corrigeables?: number[]
}

export interface AlertePesee {
  id: number
  type: string
  details: { poids_g: number; nombre: number }
  cree_le: string
  trituration: { id: number; numero: number; ligne: string }
  actions_possibles: string[]
}

export const CHEMIN_ALERTES = '/api/alertes-pesee'

/** Lecture des pesées d'un passage ; avec le poids tapé, le serveur juge la place dans les cuves. */
export function cheminPesees(passageId: number, poidsG: number | null = null): string {
  const base = `${CHEMIN_TRITURATIONS}/${passageId}/pesees-huile`
  return poidsG === null ? base : `${base}?poids_g=${poidsG}`
}

export function cheminDerogation(passageId: number): string {
  return `${CHEMIN_TRITURATIONS}/${passageId}/pesees-huile/derogation`
}

export function cheminAcquittement(alerteId: number): string {
  return `${CHEMIN_ALERTES}/${alerteId}/acquittement`
}

/** Poids tapé en kg (« 247,3 ») converti en grammes ; null s'il est vide, nul ou illisible. */
export function poidsSaisi(texte: string): number | null {
  const grammes = kgVersGrammes(texte.trim())
  return grammes !== null && grammes > 0 ? grammes : null
}

/** Passages dont l'huile se pèse : ceux qui sont en cours. */
export function passagesAPeser(passages: readonly Passage[]): Passage[] {
  return passages.filter((passage) => passage.statut === 'en_cours')
}

/** Un tampon se choisit s'il est libre ou déjà à ce passage, et s'il lui reste de la place. */
export function tamponChoisissable(tampon: Tampon, poidsG: number | null): boolean {
  return tampon.etat !== 'occupe' && tampon.libre_g > 0 && (poidsG === null || poidsG <= tampon.libre_g)
}

/**
 * Cuves compatibles que le serveur n'a pas proposées (au-delà des trois) : elles respectent toutes les règles, la
 * personne qui pèse peut les choisir librement (T-223). La recommandation reste les trois proposées.
 */
export function compatiblesNonProposees(orientation: Orientation | null): CuveEcartee[] {
  return (orientation?.ecartees ?? []).filter((cuve) => cuve.raisons.length === 1 && cuve.raisons[0] === 'au_dela_de_trois')
}

/** Une cuve où la personne peut verser ce contenant : proposée, ou compatible non proposée. */
export function cuveChoisissable(vue: VuePesees, cuveId: number | null): CuveRecommandee | CuveEcartee | undefined {
  if (cuveId === null) return undefined
  return vue.orientation?.recommandees.find((cuve) => cuve.id === cuveId) ?? compatiblesNonProposees(vue.orientation).find((cuve) => cuve.id === cuveId)
}

/**
 * Destination proposée d'abord : celle du contenant précédent si elle convient encore, sinon la
 * première que le serveur propose. Le choix de la personne (`choisie`) passe avant, s'il reste valable ;
 * il peut porter sur une cuve compatible non proposée, comme la cuve du contenant précédent.
 */
export function cuveProposee(vue: VuePesees, choisie: number | null, poidsG: number | null = null): number | null {
  const tient = (cuve: CuveOrientee) => poidsG === null || cuve.stock_calcule_g + poidsG <= cuve.capacite_g
  const recommandees = (vue.orientation?.recommandees ?? []).filter(tient)
  const possibles = [...recommandees, ...compatiblesNonProposees(vue.orientation).filter(tient)]
  const convient = (id: number | null) => id !== null && possibles.some((cuve) => cuve.id === id)
  if (convient(choisie)) return choisie
  if (convient(vue.derniere_cuve_id)) return vue.derniere_cuve_id
  return recommandees[0]?.id ?? null
}

export function tamponPropose(vue: VuePesees, choisi: number | null, poidsG: number | null): number | null {
  const possibles = vue.tampons.filter((tampon) => tamponChoisissable(tampon, poidsG))
  const convient = (id: number | null) => id !== null && possibles.some((tampon) => tampon.id === id)
  if (convient(choisi)) return choisi
  if (convient(vue.dernier_tampon_id)) return vue.dernier_tampon_id
  return possibles[0]?.id ?? null
}

/** Corps de la pesée, ou null si le poids est illisible ou si aucune destination n'est choisie. */
export function corpsPesee(vue: VuePesees, poids: string, cuveId: number | null, tamponId: number | null) {
  const poidsG = poidsSaisi(poids)
  if (poidsG === null || vue.destination === null) return null
  if (vue.destination === 'cuve') return cuveId === null ? null : { poids_g: poidsG, cuve_id: cuveId }
  return tamponId === null ? null : { poids_g: poidsG, tampon_id: tamponId }
}

/** Corps de la dérogation à la tolérance : poids, cuve, raison ; le PIN est joint par l'écran. */
export function corpsDerogation(poids: string, cuveId: number | null, motif: string) {
  const poidsG = poidsSaisi(poids)
  const raison = motif.trim()
  if (poidsG === null || cuveId === null || raison === '') return null
  return { poids_g: poidsG, cuve_id: cuveId, motif: raison }
}

export const afficherKg = grammesVersKg

/** Acidité du passage : « 0,45 » si elle tombe juste, sinon l'encadrement « 0,46 à 0,47 ». */
export function afficherAciditePassage(acidite: AciditePassage): string {
  if (acidite.acidite_centiemes !== null) return afficherCentiemes(acidite.acidite_centiemes)
  return `${afficherCentiemes(acidite.acidite_plancher_centiemes)} à ${afficherCentiemes(acidite.acidite_plafond_centiemes)}`
}

/** Nom de la destination d'une pesée, pour le tableau. */
export function codeDestination(pesee: PeseeHuile): string {
  return pesee.cuve?.code ?? pesee.tampon?.code ?? ''
}

/** Acidité renvoyée par le serveur, ou null quand il n'en donne pas (cuve vide, acidité inconnue). */
export function afficherAciditeOuRien(acidite: AciditePassage | null | undefined): string | null {
  return acidite === null || acidite === undefined ? null : afficherAciditePassage(acidite)
}

/** Les cuves que le serveur n'a pas proposées, rangées par ce qui compte pour la personne qui pèse. */
export interface AutresCuves {
  /** Même qualité que l'huile mais refusées pour ce contenant : leurs chiffres et la raison, la dérogation éventuelle. */
  refusees: CuveEcartee[]
  /** Compatibles, mais au-delà des trois cuves proposées : choisissables librement. */
  nonProposees: CuveEcartee[]
  /** Codes des cuves d'une autre qualité, par qualité (extra vierge, vierge, lampante). */
  autreQualite: { qualite: Qualite; codes: string[] }[]
  /** Cuves désactivées ou sans qualité affectée. */
  horsService: string[]
}

const ORDRE_QUALITES: readonly Qualite[] = ['extra_vierge', 'vierge', 'lampante']

/** Range les cuves écartées d'après les raisons du serveur ; l'ordre du serveur (par code) est gardé. */
export function regrouperEcartees(ecartees: readonly CuveEcartee[]): AutresCuves {
  const autres: AutresCuves = { refusees: [], nonProposees: [], autreQualite: [], horsService: [] }
  const parQualite = new Map<Qualite, string[]>()
  for (const cuve of ecartees) {
    if (cuve.raisons.includes('cuve_inactive') || cuve.raisons.includes('qualite_cuve_inconnue') || cuve.qualite_affectee === null) {
      autres.horsService.push(cuve.code)
    } else if (cuve.raisons.includes('qualite_incompatible')) {
      parQualite.set(cuve.qualite_affectee, [...(parQualite.get(cuve.qualite_affectee) ?? []), cuve.code])
    } else if (cuve.raisons.includes('au_dela_de_trois')) {
      autres.nonProposees.push(cuve)
    } else {
      autres.refusees.push(cuve)
    }
  }
  autres.autreQualite = ORDRE_QUALITES.filter((qualite) => parQualite.has(qualite)).map((qualite) => ({ qualite, codes: parQualite.get(qualite) ?? [] }))
  return autres
}

/** Nombre de cuves rangées hors des refusées : ce que le volet replié « Autres cuves » contient. */
export function nombreRepliees(autres: AutresCuves): number {
  return autres.nonProposees.length + autres.horsService.length + autres.autreQualite.reduce((somme, groupe) => somme + groupe.codes.length, 0)
}

/**
 * Liste courte de codes de cuve : trois codes qui se suivent ou plus deviennent une plage (« C01–C06, C09, C11–C14 »).
 * Seuls se suivent des codes de même préfixe et de même nombre de chiffres ; les autres restent tels quels.
 */
export function plagesDeCodes(codes: readonly string[]): string {
  const morceaux: string[][] = []
  let precedent: { prefixe: string; nombre: number; largeur: number } | null = null
  for (const code of codes) {
    const trouve = /^(.*?)(\d+)$/.exec(code)
    const actuel = trouve === null ? null : { prefixe: trouve[1], nombre: Number(trouve[2]), largeur: trouve[2].length }
    const suit = actuel !== null && precedent !== null && actuel.prefixe === precedent.prefixe && actuel.largeur === precedent.largeur && actuel.nombre === precedent.nombre + 1
    if (suit) morceaux[morceaux.length - 1].push(code)
    else morceaux.push([code])
    precedent = actuel
  }
  return morceaux.map((suite) => (suite.length >= 3 ? `${suite[0]}–${suite[suite.length - 1]}` : suite.join(', '))).join(', ')
}

/** Grammes qui manquent dans la cuve pour ce contenant (0 s'il tient) ; même contrôle que le serveur : stock + entrée ≤ capacité. */
export function manqueDePlace(cuve: Pick<CuveOrientee, 'stock_calcule_g' | 'capacite_g'>, poidsG: number | null): number {
  return poidsG === null ? 0 : Math.max(0, cuve.stock_calcule_g + poidsG - cuve.capacite_g)
}
