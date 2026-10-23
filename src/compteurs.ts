// Compteurs et voyants des onglets (refonte UI, T-164 A11 ; docs/interface/audit_refonte.md §4.1 et §4.4).
// Seulement ceux dont une route existante donne la donnée, et seulement pour le module affiché. Chaque compteur est
// un nombre exact de lignes que le serveur a renvoyées : aucun seuil, aucune estimation, aucun état inventé.
// Les lectures sont celles des écrans eux-mêmes ; useCompteurs les réutilise quand l'écran ouvert vient de les faire.
import type { TonCompteur } from './composants/Compteur'
import type { EtatLampe } from './composants/Lampe'
import { qualiteACorriger, type Cuve } from './cuves/logique'
import { peutDetruire, type Echantillon } from './laboratoire/logique'
import { libelles } from './libelles'
import type { EntreeMenu } from './navigation'

export type Indicateur =
  | { type: 'nombre'; nombre: number; ton: TonCompteur; libelle: string }
  | { type: 'lampe'; etat: EtatLampe; libelle: string }
  | { type: 'texte'; texte: string }

export interface SourceCompteur {
  /** Lecture de l'écran (même chemin que lui, donc même permission). */
  chemin: string
  /** Indicateur tiré de la réponse ; null si elle n'a pas la forme attendue. */
  calculer: (donnees: unknown) => Indicateur | null
}

const c = libelles.compteurs
type Modele = readonly [string, string]
/** « 1 remorque », « 2 remorques » : le singulier jusqu'à 1. */
const phrase = ([un, plusieurs]: Modele, n: number) => (n > 1 ? plusieurs : un).replace('{n}', String(n))
const nombre = (n: number, ton: TonCompteur, modele: Modele): Indicateur => ({ type: 'nombre', nombre: n, ton, libelle: phrase(modele, n) })

const liste = (donnees: unknown): unknown[] | null => (Array.isArray(donnees) ? donnees : null)
function champListe(donnees: unknown, champ: string): unknown[] | null {
  if (typeof donnees !== 'object' || donnees === null) return null
  return liste((donnees as Record<string, unknown>)[champ])
}
const lignes = <T,>(valeurs: unknown[] | null) => valeurs as T[] | null

/** Compte les lignes d'une liste du serveur qui remplissent la condition. */
function compter<T>(valeurs: T[] | null, garder: (ligne: T) => boolean, ton: TonCompteur, modele: Modele): Indicateur | null {
  return valeurs === null ? null : nombre(valeurs.filter(garder).length, ton, modele)
}

const tout = () => true

/** Rendements bloqués : un passage peut figurer dans plusieurs listes de la réponse ; il n'est compté qu'une fois. */
function rendementsBloques(donnees: unknown): Indicateur | null {
  type Vue = { passage: { id: number }; controle: { statut: string } | null }
  const listes = ['passages', 'alertes', 'controles'].map((champ) => lignes<Vue>(champListe(donnees, champ)))
  if (listes.some((l) => l === null)) return null
  const bloques = new Set<number>()
  for (const vue of listes.flatMap((l) => l ?? [])) if (vue.controle?.statut === 'bloque') bloques.add(vue.passage.id)
  return nombre(bloques.size, 'erreur', c.rendementsBloques)
}

function caisse(donnees: unknown): Indicateur | null {
  if (typeof donnees !== 'object' || donnees === null || !('session_caisse' in donnees)) return null
  const ouverte = (donnees as { session_caisse: unknown }).session_caisse !== null
  return { type: 'lampe', etat: ouverte ? 'ok' : 'alerte', libelle: ouverte ? c.caisseOuverte : c.caisseFermee }
}

function bacsLibres(donnees: unknown): Indicateur | null {
  const bacs = lignes<{ etat: string }>(liste(donnees))
  if (bacs === null) return null
  const n = bacs.filter((bac) => bac.etat === 'libre').length
  return { type: 'texte', texte: phrase(c.bacsLibres, n) }
}

/** Source de chaque écran qui a un compteur, par code d'écran (audit §4.1, verdict « oui »). */
export const SOURCES: Readonly<Record<string, SourceCompteur>> = {
  'REC-01': { chemin: '/api/receptions/en-attente', calculer: (d) => compter(liste(d), tout, 'action', c.remorques) },
  'BAC-01': { chemin: '/api/bacs-reception/grille', calculer: bacsLibres },
  'CHG-01': {
    chemin: '/api/chargements',
    calculer: (d) => compter(lignes<{ statut: string }>(champListe(d, 'chargements')), (l) => l.statut !== 'termine' && l.statut !== 'annule', 'action', c.chargements),
  },
  'LAB-01': { chemin: '/api/laboratoire/file', calculer: (d) => compter(lignes<{ etape: string }>(liste(d)), (l) => l.etape === 'a_prelever', 'action', c.aPrelever) },
  'LAB-03': { chemin: '/api/laboratoire/file', calculer: (d) => compter(lignes<{ etape: string }>(liste(d)), (l) => l.etape === 'a_analyser', 'action', c.aAnalyser) },
  // La destruction est proposée par le serveur (`actions_possibles`), à la fin de la conservation.
  'LAB-02': { chemin: '/api/echantillons-olive', calculer: (d) => compter(lignes<Echantillon>(liste(d)), (e) => e.detruit_le === null && peutDetruire(e), 'alerte', c.aDetruire) },
  'PLN-01': { chemin: '/api/planification', calculer: (d) => compter(champListe(d, 'lots_a_planifier'), tout, 'action', c.aPlanifier) },
  'PRD-02': { chemin: '/api/triturations', calculer: (d) => compter(lignes<{ statut: string }>(champListe(d, 'passages')), (p) => p.statut === 'en_cours', 'ok', c.enCours) },
  // `passages` : les remises encore ouvertes ; `remis` : celles qui sont closes.
  'PRD-03': { chemin: '/api/partages', calculer: (d) => compter(champListe(d, 'passages'), tout, 'action', c.remises) },
  'PRD-05': { chemin: '/api/controles-rendement', calculer: rendementsBloques },
  'CUV-01': {
    chemin: '/api/cuves/registre',
    calculer: (d) => compter(lignes<Pick<Cuve, 'qualite_affectee' | 'qualite_calculee'>>(champListe(d, 'cuves')), qualiteACorriger, 'alerte', c.cuvesAReclasser),
  },
  'PRD-04': { chemin: '/api/echantillons-huile', calculer: (d) => compter(champListe(d, 'a_analyser'), tout, 'alerte', c.huilesAAnalyser) },
  'CAI-01': { chemin: '/api/caisse/session', calculer: caisse },
  // À émettre (`pret`), ou émis, pas encore réglé et réglable (lot produit, M17). Le sens du net n'est pas dans la liste.
  'DEC-01': {
    chemin: '/api/decomptes',
    calculer: (d) => compter(lignes<{ pret: boolean; decompte_id: number | null; regle: number | boolean; lot_statut?: string | null }>(liste(d)), (r) => r.pret || (r.decompte_id !== null && !r.regle && r.lot_statut === 'produit'), 'action', c.decomptes),
  },
  'PRX-01': { chemin: '/api/prix/en-attente', calculer: (d) => compter(liste(d), tout, 'alerte', c.prix) },
}

/** SMS en échec : compté par `/api/etat` (sondé toutes les 5 s par la coquille), sans lecture de plus. */
export function indicateurSms(etat: unknown): Indicateur | null {
  if (typeof etat !== 'object' || etat === null) return null
  const sms = (etat as { sms?: { echec?: unknown } }).sms
  return typeof sms?.echec === 'number' && Number.isSafeInteger(sms.echec) ? nombre(sms.echec, 'erreur', c.smsEchec) : null
}

/** Chemins à lire pour les écrans donnés (ceux du module affiché), sans doublon. */
export function cheminsACompter(entrees: readonly EntreeMenu[]): string[] {
  return [...new Set(entrees.flatMap((entree) => (SOURCES[entree.code] === undefined ? [] : [SOURCES[entree.code].chemin])))].sort()
}

/** Indicateurs par code d'écran, à partir des dernières réponses connues (par chemin). */
export function calculerIndicateurs(entrees: readonly EntreeMenu[], reponses: ReadonlyMap<string, unknown>, etat: unknown): Map<string, Indicateur> {
  const resultat = new Map<string, Indicateur>()
  for (const entree of entrees) {
    const source = SOURCES[entree.code]
    const indicateur = entree.code === 'SMS-01' ? indicateurSms(etat) : source !== undefined && reponses.has(source.chemin) ? source.calculer(reponses.get(source.chemin)) : null
    if (indicateur !== null) resultat.set(entree.code, indicateur)
  }
  return resultat
}

const GRAVITE: Record<TonCompteur, number> = { ok: 0, action: 1, alerte: 2, erreur: 3 }

/**
 * Indicateur d'un onglet à partir de ceux de ses écrans visibles. Un seul écran : son indicateur. Plusieurs : la
 * somme exacte des nombres non nuls, avec le ton le plus grave ; les voyants et textes restent sur les sous-onglets.
 */
export function indicateurOnglet(ecrans: readonly EntreeMenu[], indicateurs: ReadonlyMap<string, Indicateur>): Indicateur | null {
  if (ecrans.length === 1) return indicateurs.get(ecrans[0].code) ?? null
  const nombres = ecrans.flatMap((entree) => {
    const indicateur = indicateurs.get(entree.code)
    return indicateur?.type === 'nombre' && indicateur.nombre > 0 ? [indicateur] : []
  })
  if (nombres.length === 0) return null
  const ton = nombres.reduce<TonCompteur>((pire, i) => (GRAVITE[i.ton] > GRAVITE[pire] ? i.ton : pire), nombres[0].ton)
  return { type: 'nombre', nombre: nombres.reduce((somme, i) => somme + i.nombre, 0), ton, libelle: nombres.map((i) => i.libelle).join(', ') }
}
