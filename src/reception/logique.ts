// Logique pure de l'écran de réception (T2.10, CONTEXTE §7, PROMPT §6.20.4).
// Le serveur reste juge (pas de la bascule, minimum, tare < brut, bacs libres) : ces fonctions
// préparent seulement des corps lisibles et un aperçu du net.
import { entierPositif, uniteExacte } from '../format/saisie'
import { libelles } from '../libelles'

const m = libelles.reception.erreurs

export type Regime = 'achat' | 'facon' | 'mixte'
export type ModePartage = 'huile_kg' | 'pourcentage'
export type Mode = 'arrivee' | 'dechargement' | 'tare' | 'directe'
export type StatutOuvert = 'pesee_brut' | 'versee'

/** Carte de la file d'attente et de la recherche par CIN (`lecture._resume`). */
export interface ResumeReception {
  id: number
  numero: number
  statut: string
  regime: Regime
  apporteur: { id: number; nom: string }
  cin_masquee: string | null
  immatriculation: string | null
  cree_le: string
  poids_brut_kg: number | null
  actions_possibles: string[]
}

export interface SmsReception {
  id: number
  type: string
  statut: 'en_file' | 'en_envoi' | 'envoye' | 'remis' | 'echec'
  segments: number
  essais: number
}

export interface RechercheTare {
  a_tarer: (ResumeReception & { bacs: number[] })[]
  a_decharger: ResumeReception[]
}

/** Fiche complète renvoyée après chaque commande (`lecture.detail`). */
export interface DetailReception extends ResumeReception {
  apporteur: { id: number; nom: string; telephone: string }
  poids_tare_kg: number | null
  net_kg: number | null
  /** Pesée directe sur la balance à plateforme (E-38) : pas de brut ni de tare. */
  pesee_directe: boolean
  bacs: number[]
  ticket: { piece_id: number; numero: number; statut: string; nombre_impressions: number } | null
  sms: SmsReception | null
}

export interface ApporteurTrouve {
  id: number
  nom: string
  cin_masquee: string | null
  matricule_fiscal: string | null
  telephone: string
}

export interface SaisieArrivee {
  apporteur: ApporteurTrouve | null
  cinChauffeur: boolean
  cinPresentee: string
  immatriculation: string
  regime: Regime | null
  modePartage: ModePartage
  valeurPartage: string
  brut: string
}

export const ARRIVEE_VIDE: SaisieArrivee = {
  apporteur: null,
  cinChauffeur: false,
  cinPresentee: '',
  immatriculation: '',
  regime: null,
  modePartage: 'huile_kg',
  valeurPartage: '',
  brut: '',
}

export const REGIMES: readonly Regime[] = ['achat', 'facon', 'mixte']

type Resultat = { corps: Record<string, unknown> | null; erreur: string | null }

/** Champs du partage : seulement en mixte, l'unité suit le mode (grammes ou centièmes). */
export function corpsPartage(regime: Regime | null, mode: ModePartage, valeur: string): Resultat {
  if (regime === null) return { corps: null, erreur: m.regime }
  if (regime !== 'mixte') {
    return { corps: { regime, mode_partage: null, huile_agriculteur_declaree_g: null, pourcentage_agriculteur_centiemes: null }, erreur: null }
  }
  const nombre = uniteExacte(valeur, mode === 'huile_kg' ? 3 : 2)
  if (nombre === null || nombre === 0) return { corps: null, erreur: m.partage }
  return {
    corps: {
      regime,
      mode_partage: mode,
      huile_agriculteur_declaree_g: mode === 'huile_kg' ? nombre : null,
      pourcentage_agriculteur_centiemes: mode === 'pourcentage' ? nombre : null,
    },
    erreur: null,
  }
}

/** Corps de `POST /api/receptions` ; un CIN vide d'apporteur est complété par le serveur. */
export function corpsArrivee(s: SaisieArrivee): Resultat {
  if (s.apporteur === null) return { corps: null, erreur: m.apporteur }
  const partage = corpsPartage(s.regime, s.modePartage, s.valeurPartage)
  if (partage.corps === null) return partage
  const brut = entierPositif(s.brut)
  if (brut === null) return { corps: null, erreur: m.poids }
  const texte = (v: string) => (v.trim() === '' ? null : v.trim())
  return {
    corps: {
      apporteur_id: s.apporteur.id,
      cin_de: s.cinChauffeur ? 'conducteur' : 'apporteur',
      cin_presentee: texte(s.cinPresentee),
      immatriculation: texte(s.immatriculation),
      poids_brut_kg: brut,
      ...partage.corps,
    },
    erreur: null,
  }
}

/** Pesée directe (E-38) : un petit lot pesé une fois sur la balance à plateforme ; ce poids est le net. */
export interface SaisieDirecte {
  apporteur: ApporteurTrouve | null
  cinChauffeur: boolean
  cinPresentee: string
  regime: Regime | null
  modePartage: ModePartage
  valeurPartage: string
  bacs: string
  poids: string
}

/** Brouillons du mode pesée directe, effacés à chaque changement de mode (PageReception). */
export const BROUILLONS_DIRECTE = ['reception.directe', 'reception.directe.recherche', 'reception.directe.commande', 'reception.directe.enCours'] as const

export const DIRECTE_VIDE: SaisieDirecte = {
  apporteur: null,
  cinChauffeur: false,
  cinPresentee: '',
  regime: null,
  modePartage: 'huile_kg',
  valeurPartage: '',
  bacs: '',
  poids: '',
}

/** Corps de `POST /api/receptions/pesee-directe` ; le serveur contrôle le pas et le maximum de la balance. */
export function corpsDirecte(s: SaisieDirecte): Resultat {
  if (s.apporteur === null) return { corps: null, erreur: m.apporteur }
  const partage = corpsPartage(s.regime, s.modePartage, s.valeurPartage)
  if (partage.corps === null) return partage
  const bacs = lireBacs(s.bacs)
  if (bacs === null) return { corps: null, erreur: m.bacs }
  const poids = entierPositif(s.poids)
  if (poids === null) return { corps: null, erreur: m.poids }
  return {
    corps: {
      apporteur_id: s.apporteur.id,
      cin_de: s.cinChauffeur ? 'conducteur' : 'apporteur',
      cin_presentee: s.cinPresentee.trim() === '' ? null : s.cinPresentee.trim(),
      poids_kg: poids,
      bacs,
      ...partage.corps,
    },
    erreur: null,
  }
}

/**
 * Numéros de bacs tapés : « 22 23 24 », « 22,23 » ou plage « 22-25 ». Triés, sans doublon ;
 * null si un morceau est illisible (une plage à l'envers aussi).
 */
export function lireBacs(texte: string): number[] | null {
  const morceaux = texte.split(/[\s,;]+/).filter(Boolean)
  if (morceaux.length === 0) return null
  const numeros = new Set<number>()
  for (const morceau of morceaux) {
    const plage = /^([0-9]+)-([0-9]+)$/.exec(morceau)
    if (plage !== null) {
      const debut = entierPositif(plage[1])
      const fin = entierPositif(plage[2])
      if (debut === null || fin === null || fin < debut || fin - debut >= 100) return null
      for (let n = debut; n <= fin; n++) numeros.add(n)
      continue
    }
    const numero = entierPositif(morceau)
    if (numero === null) return null
    numeros.add(numero)
  }
  return [...numeros].sort((a, b) => a - b)
}

/** Clic sur un bac de la grille : l'ajoute ou le retire du champ texte, qui reste la référence. */
export function basculerBac(texte: string, numero: number): string {
  const actuels = lireBacs(texte) ?? []
  const suivants = actuels.includes(numero) ? actuels.filter((n) => n !== numero) : [...actuels, numero]
  return suivants.sort((a, b) => a - b).join(' ')
}

export function corpsDechargement(texte: string): Resultat {
  const bacs = lireBacs(texte)
  return bacs === null ? { corps: null, erreur: m.bacs } : { corps: { bacs }, erreur: null }
}

export function corpsTare(texte: string): Resultat {
  const tare = entierPositif(texte)
  return tare === null ? { corps: null, erreur: m.poids } : { corps: { poids_tare_kg: tare }, erreur: null }
}

/** Aperçu seulement : le serveur recalcule et contrôle (tare < brut, pas, minimum). */
export function netApercu(brut: number | null, tareTexte: string): number | null {
  const tare = entierPositif(tareTexte)
  if (brut === null || tare === null || tare >= brut) return null
  return brut - tare
}

/** Mode où une réception de la file continue son parcours (CONTEXTE §7.1). */
export function modePour(statut: string): Mode | null {
  if (statut === 'pesee_brut') return 'dechargement'
  if (statut === 'versee') return 'tare'
  return null
}

/**
 * Rang de l'étape en cours d'une remorque sur le site (arrivée, déchargement, tare), d'après le statut renvoyé par le
 * serveur : pesée brute → déchargement à faire ; versée → tare à faire. Un autre statut n'a pas d'étape en cours.
 */
export function etapeRemorque(statut: string): number {
  if (statut === 'pesee_brut') return 1
  if (statut === 'versee') return 2
  return -1
}

export function cheminRechercheTare(cin: string): string | null {
  const propre = cin.replace(/\s/g, '')
  return propre === '' ? null : `/api/receptions/tare?cin=${encodeURIComponent(propre)}`
}

/** Heure locale de Tunis « 08:14 » d'un horodatage UTC du serveur. */
const HEURE = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Tunis', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
export function heureLocale(horodatage: string): string {
  return HEURE.format(new Date(horodatage))
}

export function texteSms(sms: SmsReception | null): string {
  return sms === null ? libelles.reception.smsEtat.aucun : libelles.reception.smsEtat[sms.statut]
}
