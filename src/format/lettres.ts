// Montant en toutes lettres, pour le récapitulatif avant de payer (EM-05, BH3) : relire « neuf mille deux cents
// dinars » évite de verser 92 000 DT au lieu de 9 200 DT. Orthographe traditionnelle (traits d'union sous cent).

const UNITES = [
  'zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
  'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
]
const DIZAINES = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante']

/** 0 à 99 ; « quatre-vingts » prend un s seulement s'il termine le nombre (`final`). */
function moinsDeCent(n: number, final: boolean): string {
  if (n <= 16) return UNITES[n]
  if (n < 20) return `dix-${UNITES[n - 10]}`
  const dizaine = Math.floor(n / 10)
  const unite = n % 10
  if (dizaine === 7 || dizaine === 9) {
    const base = dizaine === 7 ? 'soixante' : 'quatre-vingt'
    const reste = 10 + unite
    if (dizaine === 7 && unite === 1) return 'soixante et onze'
    return `${base}-${moinsDeCent(reste, false)}`
  }
  if (dizaine === 8) return unite === 0 ? (final ? 'quatre-vingts' : 'quatre-vingt') : `quatre-vingt-${UNITES[unite]}`
  if (unite === 0) return DIZAINES[dizaine]
  if (unite === 1) return `${DIZAINES[dizaine]} et un`
  return `${DIZAINES[dizaine]}-${UNITES[unite]}`
}

/** 0 à 999 ; « cents » et « quatre-vingts » s'accordent seulement en fin de nombre (`final`). */
function moinsDeMille(n: number, final: boolean): string {
  const centaine = Math.floor(n / 100)
  const reste = n % 100
  if (centaine === 0) return moinsDeCent(reste, final)
  const cent = centaine === 1 ? 'cent' : `${UNITES[centaine]} ${reste === 0 && final ? 'cents' : 'cent'}`
  return reste === 0 ? cent : `${cent} ${moinsDeCent(reste, final)}`
}

/** Entier positif ou nul en lettres (jusqu'à 999 999 999). */
export function nombreEnLettres(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 999_999_999) throw new RangeError('nombre_hors_bornes')
  if (n === 0) return 'zéro'
  const millions = Math.floor(n / 1_000_000)
  const milliers = Math.floor((n % 1_000_000) / 1000)
  const reste = n % 1000
  const parties: string[] = []
  // « million » est un nom : « deux cents millions », « quatre-vingts millions ».
  if (millions > 0) parties.push(`${moinsDeMille(millions, true)} ${millions > 1 ? 'millions' : 'million'}`)
  // « mille » est invariable et ne fait pas accorder ce qui le précède : « deux cent mille ».
  if (milliers > 0) parties.push(milliers === 1 ? 'mille' : `${moinsDeMille(milliers, false)} mille`)
  if (reste > 0) parties.push(moinsDeMille(reste, true))
  return parties.join(' ')
}

/** Millimes entiers en lettres : « mille dinars et cinq cents millimes ». */
export function montantEnLettres(millimes: number): string {
  const dinars = Math.trunc(millimes / 1000)
  const reste = millimes % 1000
  const mots = nombreEnLettres(dinars)
  const deDinars = dinars >= 1_000_000 && dinars % 1_000_000 === 0 ? 'de dinars' : dinars > 1 ? 'dinars' : 'dinar'
  const texteDinars = `${mots} ${deDinars}`
  if (reste === 0) return texteDinars
  const texteMillimes = `${nombreEnLettres(reste)} ${reste > 1 ? 'millimes' : 'millime'}`
  return dinars === 0 ? texteMillimes : `${texteDinars} et ${texteMillimes}`
}
