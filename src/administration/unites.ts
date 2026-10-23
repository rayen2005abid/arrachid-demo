// Conversions kg <-> g sans virgule flottante (PROMPT §6.8) : même règle que `lire_decimal` du
// serveur — chiffres, une virgule ou un point, au plus 3 décimales, jamais d'arrondi caché.

const NOMBRE = /^(\d+)(?:[.,](\d+))?$/

/** « 1 200,5 » kg -> 1200500 g. `null` si la saisie n'est pas un poids exact en grammes. */
export function kgVersGrammes(texte: string): number | null {
  // \s couvre aussi les espaces insécables des séparateurs de milliers.
  const propre = texte.replace(/\s/g, '')
  const morceaux = NOMBRE.exec(propre)
  if (morceaux === null) return null
  const fraction = morceaux[2] ?? ''
  if (fraction.length > 3) return null
  const grammes = Number(morceaux[1] + fraction.padEnd(3, '0'))
  return Number.isSafeInteger(grammes) ? grammes : null
}

/** 1200500 g -> « 1 200,5 » (kg, séparateur de milliers, zéros inutiles retirés). */
export function grammesVersKg(grammes: number): string {
  const signe = grammes < 0 ? '-' : ''
  // Découpage de la chaîne des chiffres : aucune division.
  const chiffres = String(Math.abs(grammes)).padStart(4, '0')
  const milliers = chiffres.slice(0, -3).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  const fraction = chiffres.slice(-3).replace(/0+$/, '')
  return signe + milliers + (fraction === '' ? '' : `,${fraction}`)
}

/** Entier positif tapé au clavier (« 2000 ») ; `null` sinon. */
export function lireEntier(texte: string): number | null {
  const propre = texte.replace(/\s/g, '')
  if (!/^\d+$/.test(propre)) return null
  const valeur = Number(propre)
  return Number.isSafeInteger(valeur) ? valeur : null
}
