// Dernière réponse des lectures que la coquille compte (compteurs des onglets, T-164 A11).
// `lire` y range chaque réponse d'un chemin retenu : les compteurs réutilisent ainsi les données de l'écran ouvert
// au lieu de relire le serveur. Seuls les chemins retenus sont gardés (pas les recherches), et une seule réponse
// par chemin, la plus récente.

type Ecouteur = (chemin: string, donnees: unknown) => void

const retenus = new Set<string>()
const memoire = new Map<string, { donnees: unknown; instant: number }>()
const ecouteurs = new Set<Ecouteur>()

/** Chemins dont la dernière réponse est gardée. */
export function retenirLectures(chemins: Iterable<string>): void {
  for (const chemin of chemins) retenus.add(chemin)
}

/** Appelé par `lire` après chaque réponse réussie. */
export function memoriserLecture(chemin: string, donnees: unknown, instant = Date.now()): void {
  if (!retenus.has(chemin)) return
  memoire.set(chemin, { donnees, instant })
  for (const ecouteur of ecouteurs) ecouteur(chemin, donnees)
}

const enCours = new Map<string, Promise<unknown>>()

/** Appelé par `lire` au départ de chaque lecture : un compteur attend la réponse au lieu de relire. */
export function noterLectureEnCours(chemin: string, promesse: Promise<unknown>): void {
  if (!retenus.has(chemin)) return
  enCours.set(chemin, promesse)
  const finir = () => {
    if (enCours.get(chemin) === promesse) enCours.delete(chemin)
  }
  promesse.then(finir, finir)
}

/** Lecture de ce chemin partie et pas encore revenue, ou undefined. */
export function lectureEnCours(chemin: string): Promise<unknown> | undefined {
  return enCours.get(chemin)
}

/** Dernière réponse de ce chemin si elle a moins de `ageMaxMs`, sinon undefined. */
export function lectureRecente(chemin: string, ageMaxMs: number, maintenant = Date.now()): unknown {
  const lue = memoire.get(chemin)
  return lue !== undefined && maintenant - lue.instant < ageMaxMs ? lue.donnees : undefined
}

/** Prévenu à chaque nouvelle réponse d'un chemin retenu. */
export function surLecture(ecouteur: Ecouteur): () => void {
  ecouteurs.add(ecouteur)
  return () => {
    ecouteurs.delete(ecouteur)
  }
}

/** Oublie tout (tests ; changement d'utilisateur). */
export function oublierLectures(): void {
  memoire.clear()
}
