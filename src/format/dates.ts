// Affichage des horodatages UTC du serveur à l'heure de Tunis (PROMPT §6.11) : « 25/10/2026 08:14 ».

const FORMAT = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Africa/Tunis',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

export function formaterHorodatage(horodatage: string): string {
  const parties = Object.fromEntries(FORMAT.formatToParts(new Date(horodatage)).map((p) => [p.type, p.value]))
  return `${parties.day}/${parties.month}/${parties.year} ${parties.hour}:${parties.minute}`
}

/** Jour courant à Tunis, « AAAA-MM-JJ » : simple pré-remplissage, le serveur reste juge de la date. */
export function aujourdHuiTunis(instant: Date = new Date()): string {
  const parties = Object.fromEntries(FORMAT.formatToParts(instant).map((p) => [p.type, p.value]))
  return `${parties.year}-${parties.month}-${parties.day}`
}

/** Date « AAAA-MM-JJ » affichée « JJ/MM/AAAA ». */
export function formaterDate(date: string): string {
  const [annee, mois, jour] = date.split('-')
  return `${jour}/${mois}/${annee}`
}
