import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { lire, surServeurIndisponible } from '../api/client'
import type { EtatServeur } from '../types'
import { ContexteServeur } from './serveur'

const PERIODE_SONDAGE_MS = 5000

/** Sonde `/api/etat` toutes les 5 s (PROMPT §6.20.1) et lit l'état de la mise en service (T1.6). */
export function FournisseurServeur({ children }: { children: ReactNode }) {
  const [etat, definirEtat] = useState<EtatServeur | null>(null)
  const [disponible, definirDisponible] = useState(true)
  const [miseEnServiceRequise, definirMiseEnService] = useState<boolean | null>(null)
  const etaitDisponible = useRef(true)

  const reverifierMiseEnService = useCallback(async () => {
    try {
      // Contrat T1.6 ; absent (404, page HTML) = pas de mise en service à faire.
      const reponse = await lire<{ requise?: boolean } | null>('/api/mise-en-service/etat')
      definirMiseEnService(reponse?.requise === true)
    } catch {
      definirMiseEnService(false)
    }
  }, [])

  useEffect(() => {
    let actif = true
    const sonder = async () => {
      try {
        const lu = await lire<EtatServeur>('/api/etat')
        if (!actif) return
        definirEtat(lu)
        definirDisponible(true)
        if (!etaitDisponible.current) void reverifierMiseEnService()
        etaitDisponible.current = true
      } catch {
        if (!actif) return
        definirDisponible(false)
        etaitDisponible.current = false
      }
    }
    void sonder()
    void reverifierMiseEnService()
    const minuteur = setInterval(() => void sonder(), PERIODE_SONDAGE_MS)
    const desabonner = surServeurIndisponible(() => {
      etaitDisponible.current = false
      definirDisponible(false)
    })
    return () => {
      actif = false
      clearInterval(minuteur)
      desabonner()
    }
  }, [reverifierMiseEnService])

  const valeur = useMemo(
    () => ({ etat, disponible, miseEnServiceRequise, reverifierMiseEnService }),
    [etat, disponible, miseEnServiceRequise, reverifierMiseEnService],
  )
  return <ContexteServeur.Provider value={valeur}>{children}</ContexteServeur.Provider>
}
