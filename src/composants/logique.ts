// Logique pure des composants partagés (refonte UI, Session 2) : testée sans navigateur (logique.test.ts).
import { NOMS_TOUCHES, type Touches } from '../contextes/touches'
import type { TypePoste } from '../types'

/** Densité de l'écran : `tactile` donne des cibles de 44 px (PROMPT §6.20.1), `normale` garde le style serré de 13 px. */
export type Densite = 'normale' | 'tactile'

/** Les tablettes du laboratoire et de la production sont tactiles ; les autres postes ont clavier et souris. */
export function densitePoste(typePoste: TypePoste): Densite {
  return typePoste === 'laboratoire' || typePoste === 'production' ? 'tactile' : 'normale'
}

/** Assemble des classes CSS ; les noms vides, faux ou absents sont ignorés. */
export function classes(...noms: (string | false | null | undefined)[]): string {
  return noms.filter((nom) => typeof nom === 'string' && nom !== '').join(' ')
}

export type EtatEtape = 'faite' | 'actuelle' | 'bloquee' | 'a_venir'

/**
 * État de chaque étape d'un parcours d'après le rang de l'étape en cours, lui-même tiré d'un état donné par le serveur :
 * avant ce rang, les étapes sont faites ; après, à venir. Un rang égal au nombre d'étapes veut dire que tout est fait,
 * un rang négatif que rien n'a commencé. `bloquee` marque l'étape en cours comme arrêtée.
 */
export function etatsEtapes(nombre: number, rangActuel: number, bloquee = false): EtatEtape[] {
  return Array.from({ length: nombre }, (_, rang): EtatEtape => {
    if (rang < rangActuel) return 'faite'
    if (rang > rangActuel) return 'a_venir'
    return bloquee ? 'bloquee' : 'actuelle'
  })
}

/**
 * Piège du focus d'un tiroir. `rang` : place de l'élément qui a le focus parmi les `nombre` éléments atteignables du
 * tiroir (-1 s'il n'en fait pas partie). Renvoie le rang à atteindre quand Tab (ou Maj+Tab si `arriere`) sortirait du
 * tiroir, ou null quand le navigateur peut avancer normalement.
 */
export function cibleTabulation(rang: number, nombre: number, arriere: boolean): number | null {
  if (nombre === 0) return null
  if (rang < 0) return arriere ? nombre - 1 : 0
  if (arriere && rang === 0) return nombre - 1
  if (!arriere && rang === nombre - 1) return 0
  return null
}

/**
 * Touches tant qu'un tiroir est ouvert : F8 le valide, les autres touches de l'écran sont suspendues (la barre les
 * montre vides) jusqu'à sa fermeture. Le tiroir s'enregistre après l'écran : ses touches l'emportent (`useTouches`).
 */
export function touchesTiroir(libelle: string, valider: () => void, inactif: boolean): Touches {
  const touches: Touches = {}
  for (const nom of NOMS_TOUCHES) touches[nom] = undefined
  touches.F8 = { libelle, action: valider, inactif }
  return touches
}

/**
 * Niveau d'une jauge en pourcentage CSS, d'après un contenu et une capacité renvoyés par le serveur, borné entre 0 et
 * 100 %. Un repère visuel seulement : il n'est jamais écrit à l'écran (les chiffres du serveur le sont).
 */
export function largeurNiveau(contenu: number, capacite: number): string {
  if (!(capacite > 0) || !(contenu > 0)) return '0%'
  if (contenu >= capacite) return '100%'
  return `${(contenu * 100) / capacite}%`
}
