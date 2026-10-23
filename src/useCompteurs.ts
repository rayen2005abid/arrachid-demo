// Rafraîchissement unique des compteurs du module affiché (T-164, A11) : une lecture groupée toutes les 15 s,
// jamais une par onglet. Une réponse que l'écran ouvert vient de lire (moins de 10 s) est reprise telle quelle ;
// chaque nouvelle lecture de l'écran met aussi le compteur à jour tout de suite (api/memoire.ts).
import { useEffect, useMemo, useState } from 'react'
import { lire } from './api/client'
import { lectureEnCours, lectureRecente, oublierLectures, retenirLectures, surLecture } from './api/memoire'
import { calculerIndicateurs, cheminsACompter, SOURCES, type Indicateur } from './compteurs'
import type { EntreeMenu } from './navigation'

export const PERIODE_COMPTEURS_MS = 15_000
/**
 * Âge maximal d'une réponse reprise au lieu d'une lecture. Les files d'attente des écrans sont relues toutes les 5 s :
 * leur réponse a toujours moins de 10 s. La lecture du compteur lui-même, faite au passage précédent, en a près de 15 :
 * elle n'est pas reprise, et le compteur relit bien toutes les 15 s quand l'écran ouvert ne lit pas cette donnée.
 */
export const AGE_REPRISE_MS = 10_000

retenirLectures(Object.values(SOURCES).map((source) => source.chemin))

/** Indicateurs par code d'écran pour les écrans donnés (ceux du module affiché). */
export function useCompteurs(entrees: readonly EntreeMenu[], etat: unknown): Map<string, Indicateur> {
  const chemins = cheminsACompter(entrees)
  const cle = chemins.join('|')
  const [reponses, definirReponses] = useState<ReadonlyMap<string, unknown>>(() => new Map())

  useEffect(() => {
    const suivis = cle === '' ? [] : cle.split('|')
    let actif = true
    const ranger = (chemin: string, donnees: unknown) => {
      if (!actif || !suivis.includes(chemin)) return
      definirReponses((avant) => new Map(avant).set(chemin, donnees))
    }
    const oublier = (chemin: string) => {
      if (actif) definirReponses((avant) => { const apres = new Map(avant); apres.delete(chemin); return apres })
    }
    const rafraichir = () => {
      for (const chemin of suivis) {
        const recente = lectureRecente(chemin, AGE_REPRISE_MS)
        // `lire` range la réponse en mémoire, et l'écouteur ci-dessous la reprend. Une lecture de l'écran encore en
        // route est attendue, pas doublée.
        if (recente !== undefined) ranger(chemin, recente)
        else (lectureEnCours(chemin) ?? lire(chemin)).catch(() => oublier(chemin))
      }
    }
    definirReponses(new Map())
    const desabonner = surLecture(ranger)
    rafraichir()
    const minuteur = suivis.length === 0 ? undefined : setInterval(rafraichir, PERIODE_COMPTEURS_MS)
    return () => {
      actif = false
      desabonner()
      clearInterval(minuteur)
    }
  }, [cle])

  // Les réponses gardées ne survivent pas à la session : la coquille disparaît au verrouillage et à la déconnexion.
  useEffect(() => () => oublierLectures(), [])

  return useMemo(() => calculerIndicateurs(entrees, reponses, etat), [entrees, reponses, etat])
}
