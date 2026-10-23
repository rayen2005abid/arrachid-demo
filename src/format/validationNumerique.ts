import type { HTMLAttributes } from 'react'
import { libelles } from '../libelles'
import { uniteExacte } from './saisie'

/** Une saisie incorrecte reste visible : ne jamais retirer un signe ou fusionner des chiffres. */
export function erreurSaisieNumerique(texte: string, mode: HTMLAttributes<HTMLInputElement>['inputMode'], decimales = 3): string | undefined {
  if (texte.trim() === '' || (mode !== 'numeric' && mode !== 'decimal')) return undefined
  if (mode === 'numeric') {
    const propre = texte.replace(/\s/g, '')
    return /^[0-9]+$/.test(propre) && Number.isSafeInteger(Number(propre)) ? undefined : libelles.saisieNumerique.entier
  }
  return uniteExacte(texte.replace(/\s/g, ''), decimales) === null ? libelles.saisieNumerique.decimal.replace('{decimales}', String(decimales)) : undefined
}
