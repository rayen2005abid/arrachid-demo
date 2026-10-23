import { useCallback, useState, useSyncExternalStore, type SetStateAction } from 'react'
import { useSession } from './session'

const sansAbonnement = () => () => {}

/** Opt-in : saisie et suivi de commande sans PIN. Une réponse tardive met aussi à jour le formulaire remonté. */
export function useBrouillon<T>(cle: string, initiale: T) {
  const { brouillons } = useSession()
  const [locale, definirLocale] = useState(initiale)
  const lire = () => brouillons === undefined ? locale : brouillons.lire(cle, initiale)
  const valeur = useSyncExternalStore(brouillons?.abonner ?? sansAbonnement, lire, lire)
  const definirValeur = useCallback((suivante: SetStateAction<T>) => {
    if (brouillons === undefined) {
      definirLocale(suivante)
      return
    }
    const avant = brouillons.lire(cle, initiale)
    brouillons.ecrire(cle, typeof suivante === 'function' ? (suivante as (avant: T) => T)(avant) : suivante)
  }, [brouillons, cle, initiale])
  return [valeur, definirValeur] as const
}
