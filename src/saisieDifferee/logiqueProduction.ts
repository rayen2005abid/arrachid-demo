// Logique pure de la reprise des fiches papier de trituration, de remise d'huile et de cuve
// (T4.11). Les valeurs tapées partent en unités entières ; le serveur recalcule partage,
// redevance, écart, stock et classement : rien n'est calculé ici.
import { kgVersGrammes } from '../administration/unites'
import { entierPositif, uniteExacte } from '../format/saisie'
import { libelles } from '../libelles'
import type { Role, Validation } from '../types'

export const CHEMIN_TRI = '/api/saisie-differee/triturations'
export const CHEMIN_REM = '/api/saisie-differee/remises-huile'
export const CHEMIN_CUV = '/api/saisie-differee/cuves'

export interface Auteur { id: number; nom: string; role: Role }
export interface FicheReprise { id: number; numero_papier: string; horodatage_metier: string; reprise: boolean }
export interface EnTeteFiche { numeroPapier: string; heure: string; observations: string; operateur: string }
type Resultat = { corps: Record<string, unknown> | null; erreur: string | null }

const t = libelles.saisieProduction
const EN_TETE_VIDE: EnTeteFiche = { numeroPapier: '', heure: '', observations: '', operateur: '' }
const refuse = (erreur: string): Resultat => ({ corps: null, erreur })
/** « 3 » → 3 ; liste laissée sur « — » → null (le serveur retient alors la personne qui saisit). */
const identifiant = (texte: string) => entierPositif(texte)
/** Poids tapé en kg, converti en grammes ; null s'il est vide, illisible ou nul. */
const grammes = (texte: string) => {
  const valeur = texte.trim() === '' ? null : kgVersGrammes(texte.trim())
  return valeur !== null && valeur > 0 ? valeur : null
}

/** Auteurs proposés dans une liste ; `approbateurs` : responsables et propriétaire seulement. */
export function optionsAuteurs(auteurs: readonly Auteur[], approbateurs = false) {
  return auteurs.filter((u) => !approbateurs || u.role === 'responsable' || u.role === 'proprietaire').map((u) => ({ valeur: String(u.id), libelle: u.nom }))
}

function enTete(s: EnTeteFiche): Record<string, unknown> | null {
  if (!s.numeroPapier.trim() || !s.heure) return null
  return {
    numero_papier: s.numeroPapier.trim().toUpperCase(), horodatage_metier: s.heure,
    observations: s.observations.trim() || null, operateur_id: identifiant(s.operateur),
  }
}

// --- Fiche TRI ---

export interface LigneLot { lotId: string; kg: string }
export interface LignePesee { poids: string; destination: string; heure: string }
export interface SaisieTri extends EnTeteFiche {
  /** Passage déjà connu du logiciel ; vide : la fiche crée le passage (ligne et lots). */
  passageId: string
  ligneId: string
  lots: LigneLot[]
  pesees: LignePesee[]
  avecFin: boolean
  heureFin: string
  temperature: string
  duree: string
  derogation: boolean
  motif: string
}

export const LOT_VIDE: LigneLot = { lotId: '', kg: '' }
export const PESEE_VIDE: LignePesee = { poids: '', destination: '', heure: '' }

export function saisieTriVide(): SaisieTri {
  return {
    ...EN_TETE_VIDE, passageId: '', ligneId: '', lots: [{ ...LOT_VIDE }], pesees: [{ ...PESEE_VIDE }],
    avecFin: false, heureFin: '', temperature: '', duree: '', derogation: false, motif: '',
  }
}

/**
 * Corps de la reprise d'une fiche TRI, ou la première erreur de saisie. `versCuve` : l'huile du
 * passage va en cuve (achat) et non dans un tampon ; `dejaEnCours` : le passage est déjà démarré.
 */
export function construireCorpsTri(s: SaisieTri, versCuve: boolean, dejaEnCours: boolean, validation: Validation | null): Resultat {
  const corps = enTete(s)
  if (corps === null) return refuse(t.erreurFiche)
  if (s.passageId !== '') {
    corps.trituration_id = identifiant(s.passageId)
  } else {
    const lots = s.lots.filter((lot) => lot.lotId !== '')
    if (identifiant(s.ligneId) === null || lots.length === 0) return refuse(t.tri.erreurPassage)
    if (lots.some((lot) => lot.kg.trim() !== '' && entierPositif(lot.kg) === null)) return refuse(t.tri.erreurKg)
    corps.ligne_id = identifiant(s.ligneId)
    corps.lots = lots.map((lot) => ({ lot_id: identifiant(lot.lotId), poids_kg: lot.kg.trim() === '' ? null : entierPositif(lot.kg) }))
  }
  const pesees = s.pesees.filter((pesee) => pesee.poids.trim() !== '')
  if (pesees.some((pesee) => grammes(pesee.poids) === null)) return refuse(t.erreurPoids)
  if (pesees.some((pesee) => identifiant(pesee.destination) === null)) return refuse(versCuve ? t.tri.erreurCuve : t.tri.erreurTampon)
  corps.pesees = pesees.map((pesee) => ({
    poids_g: grammes(pesee.poids), [versCuve ? 'cuve_id' : 'tampon_id']: identifiant(pesee.destination), horodatage: pesee.heure || null,
  }))
  if (s.avecFin) {
    const temperature = s.temperature.trim() === '' ? null : uniteExacte(s.temperature, 2)
    const duree = /^[0-9]+$/.test(s.duree.trim()) && Number.isSafeInteger(Number(s.duree.trim())) ? Number(s.duree.trim()) : null
    if (!s.heureFin || temperature === null || duree === null) return refuse(t.tri.erreurFin)
    corps.fin = { horodatage: s.heureFin, temperature_malaxage_centiemes: temperature, duree_malaxage_min: duree }
  }
  if (dejaEnCours && pesees.length === 0 && !s.avecFin) return refuse(t.erreurVide)
  if (s.derogation && versCuve) {
    if (s.motif.trim() === '') return refuse(t.erreurMotif)
    if (validation === null) return refuse(t.erreurPin)
    Object.assign(corps, { derogation_tolerance: true, motif: s.motif.trim(), validation })
  }
  return { corps, erreur: null }
}

// --- Fiche REM ---

export interface LigneContenant { vide: string; plein: string; tamponId: string; heure: string }
export interface SaisieRem extends EnTeteFiche {
  passageId: string
  contenants: LigneContenant[]
  avecCloture: boolean
  heureCloture: string
  cuveId: string
  validerEcart: boolean
  validePar: string
  motif: string
}

export const CONTENANT_VIDE: LigneContenant = { vide: '', plein: '', tamponId: '', heure: '' }

export function saisieRemVide(): SaisieRem {
  return {
    ...EN_TETE_VIDE, passageId: '', contenants: [{ ...CONTENANT_VIDE }], avecCloture: false,
    heureCloture: '', cuveId: '', validerEcart: false, validePar: '', motif: '',
  }
}

/** Corps de la reprise d'une fiche REM. `partageCalcule` : le logiciel a déjà calculé le partage. */
export function construireCorpsRem(s: SaisieRem, partageCalcule: boolean, validation: Validation | null): Resultat {
  const corps = enTete(s)
  if (corps === null) return refuse(t.erreurFiche)
  if (identifiant(s.passageId) === null) return refuse(t.rem.erreurPassage)
  corps.trituration_id = identifiant(s.passageId)
  const contenants = s.contenants.filter((c) => c.vide.trim() !== '' || c.plein.trim() !== '')
  const poids = contenants.map((c) => ({ vide: c.vide.trim() === '' ? null : kgVersGrammes(c.vide.trim()), plein: grammes(c.plein) }))
  if (poids.some((p) => p.vide === null || p.plein === null || p.plein <= p.vide)) return refuse(t.rem.erreurContenant)
  corps.contenants = contenants.map((c, rang) => ({
    poids_vide_g: poids[rang]?.vide, poids_plein_g: poids[rang]?.plein, tampon_id: identifiant(c.tamponId), horodatage: c.heure || null,
  }))
  if (s.avecCloture) {
    if (!s.heureCloture) return refuse(t.rem.erreurCloture)
    corps.cloture = {
      horodatage: s.heureCloture, cuve_id: identifiant(s.cuveId), valider_ecart: s.validerEcart,
      valide_par_id: s.validerEcart ? identifiant(s.validePar) : null,
    }
    if (s.validerEcart) {
      if (s.motif.trim() === '') return refuse(t.erreurMotif)
      if (validation === null) return refuse(t.erreurPin)
      Object.assign(corps, { motif: s.motif.trim(), validation })
    }
  }
  if (partageCalcule && contenants.length === 0 && !s.avecCloture) return refuse(t.erreurVide)
  return { corps, erreur: null }
}

// --- Fiche CUV ---

export type OperationCuve = 'purge' | 'inventaire' | 'transfert' | 'echantillon' | 'melange'
export const OPERATIONS_CUVE: OperationCuve[] = ['purge', 'inventaire', 'transfert', 'echantillon', 'melange']
export interface SaisieCuve extends EnTeteFiche {
  cuveId: string
  operation: OperationCuve | ''
  poids: string
  mesure: string
  ajuster: boolean
  destinationId: string
  acidite: string
  analysePar: string
  campagneId: string
  approuvePar: string
  motif: string
}

export function saisieCuveVide(): SaisieCuve {
  return {
    ...EN_TETE_VIDE, cuveId: '', operation: '', poids: '', mesure: '', ajuster: false, destinationId: '',
    acidite: '', analysePar: '', campagneId: '', approuvePar: '', motif: '',
  }
}

/** L'opération demande l'accord d'un responsable : ajustement, transfert, mélange de campagnes. */
export function approbationRequise(s: SaisieCuve): boolean {
  return s.operation === 'transfert' || s.operation === 'melange' || (s.operation === 'inventaire' && s.ajuster)
}

/** Corps de la reprise d'une fiche CUV : une opération par fiche. */
export function construireCorpsCuve(s: SaisieCuve, validation: Validation | null, confirmer: boolean): Resultat {
  const corps = enTete(s)
  if (corps === null) return refuse(t.erreurFiche)
  if (identifiant(s.cuveId) === null || s.operation === '') return refuse(t.cuv.erreurOperation)
  corps.cuve_id = identifiant(s.cuveId)
  if (s.operation === 'purge') {
    if (grammes(s.poids) === null) return refuse(t.erreurPoids)
    corps.purge = { poids_g: grammes(s.poids) }
  } else if (s.operation === 'inventaire') {
    const mesure = s.mesure.trim() === '' ? null : kgVersGrammes(s.mesure.trim())
    if (mesure === null) return refuse(t.erreurPoids)
    corps.inventaire = { mesure_physique_g: mesure, ajuster: s.ajuster }
  } else if (s.operation === 'transfert') {
    if (grammes(s.poids) === null) return refuse(t.erreurPoids)
    if (identifiant(s.destinationId) === null) return refuse(t.cuv.erreurDestination)
    corps.transfert = { cuve_destination_id: identifiant(s.destinationId), poids_g: grammes(s.poids) }
  } else if (s.operation === 'echantillon') {
    const acidite = s.acidite.trim() === '' ? null : uniteExacte(s.acidite, 2)
    if (s.acidite.trim() !== '' && acidite === null) return refuse(t.cuv.erreurAcidite)
    corps.echantillon = { acidite_centiemes: acidite, confirmer_valeurs: confirmer, analyse_par_id: identifiant(s.analysePar) }
  } else {
    if (identifiant(s.campagneId) === null) return refuse(t.cuv.erreurCampagne)
    corps.melange = { campagne_source_id: identifiant(s.campagneId) }
  }
  if (approbationRequise(s)) {
    if (s.motif.trim() === '') return refuse(t.erreurMotif)
    if (validation === null) return refuse(t.erreurPin)
    Object.assign(corps, { approuve_par_id: identifiant(s.approuvePar), motif: s.motif.trim(), validation })
  }
  return { corps, erreur: null }
}
