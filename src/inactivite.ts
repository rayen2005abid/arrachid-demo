// Verrouillage après inactivité (PROMPT §6.10 : 10 minutes par défaut ; le serveur expire aussi la session).

export const DELAI_INACTIVITE_MS = 10 * 60 * 1000
/** Intervalle minimal entre deux battements qui prolongent la session côté serveur. */
export const INTERVALLE_BATTEMENT_MS = 60 * 1000

export interface MinuteurInactivite {
  /** À appeler à chaque interaction de l'utilisateur. */
  activite(): void
  arreter(): void
}

export function creerMinuteurInactivite(
  delaiMs: number,
  surVerrou: () => void,
  surBattement?: () => void,
  intervalleBattementMs = INTERVALLE_BATTEMENT_MS,
  maintenant: () => number = () => Date.now(),
): MinuteurInactivite {
  let minuteur: ReturnType<typeof setTimeout> | null = null
  let dernierBattement = maintenant()

  const armer = () => {
    if (minuteur !== null) clearTimeout(minuteur)
    minuteur = setTimeout(() => {
      minuteur = null
      surVerrou()
    }, delaiMs)
  }
  armer()

  return {
    activite() {
      armer()
      if (surBattement && maintenant() - dernierBattement >= intervalleBattementMs) {
        dernierBattement = maintenant()
        surBattement()
      }
    },
    arreter() {
      if (minuteur !== null) clearTimeout(minuteur)
      minuteur = null
    },
  }
}
