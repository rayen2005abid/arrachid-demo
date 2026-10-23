// Logique pure du pavé numérique (sans React) : PIN de 4 chiffres.

export const LONGUEUR_PIN = 4

export type Touche = { type: 'chiffre'; chiffre: string } | { type: 'effacer' } | { type: 'valider' }

/** Applique une touche à la saisie ; ne dépasse jamais LONGUEUR_PIN et n'accepte que des chiffres. */
export function appliquerTouche(saisie: string, touche: Touche, longueur = LONGUEUR_PIN): string {
  if (touche.type === 'effacer') return saisie.slice(0, -1)
  if (touche.type === 'chiffre') {
    if (!/^[0-9]$/.test(touche.chiffre) || saisie.length >= longueur) return saisie
    return saisie + touche.chiffre
  }
  return saisie
}

/** Traduit `KeyboardEvent.key` en touche du pavé ; `null` si la touche est sans effet. */
export function toucheDepuisClavier(cle: string): Touche | null {
  if (/^[0-9]$/.test(cle)) return { type: 'chiffre', chiffre: cle }
  if (cle === 'Backspace') return { type: 'effacer' }
  if (cle === 'Enter') return { type: 'valider' }
  return null
}

export function saisieComplete(saisie: string, longueur = LONGUEUR_PIN): boolean {
  return saisie.length === longueur
}
