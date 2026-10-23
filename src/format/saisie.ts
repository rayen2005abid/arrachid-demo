// Lecture des nombres tapés au clavier, sans virgule flottante (PROMPT §2 règle 3, §6.8).
// Le serveur reste juge : ces fonctions évitent seulement un aller-retour pour une saisie illisible.

/** Entier strictement positif écrit en chiffres (espaces de milliers tolérés), sinon null. */
export function entierPositif(texte: string): number | null {
  const propre = texte.replace(/\s/g, '')
  if (!/^[0-9]+$/.test(propre)) return null
  const valeur = Number(propre)
  return Number.isSafeInteger(valeur) && valeur > 0 ? valeur : null
}

/**
 * Valeur décimale (« 12,5 ») convertie en unités entières : `decimales` = 3 pour des kg en grammes,
 * 2 pour un pourcentage en centièmes. Plus de décimales que l'unité ne permet → null (jamais arrondi).
 */
export function uniteExacte(texte: string, decimales: number): number | null {
  const propre = texte.trim().replace(',', '.')
  const morceaux = propre.split('.')
  if (morceaux.length > 2 || !/^[0-9]+$/.test(morceaux[0] ?? '')) return null
  const fraction = morceaux[1] ?? ''
  if (fraction.length > decimales || (fraction !== '' && !/^[0-9]+$/.test(fraction))) return null
  const valeur = Number(morceaux[0]) * 10 ** decimales + Number(fraction.padEnd(decimales, '0'))
  return Number.isSafeInteger(valeur) && valeur >= 0 ? valeur : null
}

/** « 12340 » → « 12 340 » (chiffres groupés, sans arrondi). */
export function grouperMilliers(valeur: number): string {
  return String(valeur).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}
