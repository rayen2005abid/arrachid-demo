import { useEffect, useState } from 'react'

/** Valeur stabilisée après une courte pause de frappe : une requête par pause, pas par touche. */
export function useDiffere<T>(valeur: T, delaiMs: number): T {
  const [stable, definirStable] = useState(valeur)
  useEffect(() => {
    const minuteur = setTimeout(() => definirStable(valeur), delaiMs)
    return () => clearTimeout(minuteur)
  }, [valeur, delaiMs])
  return stable
}
