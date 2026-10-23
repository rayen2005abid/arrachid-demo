// Affichage des montants stockés en millimes entiers (PROMPT §6.8) : « 1 250,000 », jamais arrondi.
import { grouperMilliers } from './saisie'

/** « 1250000 » → « 1 250,000 » (dinars, trois décimales exactes). */
export function afficherMillimes(millimes: number): string {
  return `${grouperMilliers(Math.trunc(millimes / 1000))},${String(millimes % 1000).padStart(3, '0')}`
}
