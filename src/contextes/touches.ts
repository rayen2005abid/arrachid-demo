// Touches de fonction F1–F12 de la coquille (maquette MES, T-86).
// Chaque écran déclare ses touches avec `useTouches` ; la coquille les affiche en bas et les déclenche.
// Les actions sont lues au moment de l'appui (référence), seuls libellés et états redessinent la barre.
import { createContext, useContext, useEffect, useId } from 'react'

export const NOMS_TOUCHES = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'] as const
export type NomTouche = (typeof NOMS_TOUCHES)[number]

export interface Touche {
  libelle: string
  action: () => void
  inactif?: boolean
}
export type Touches = Partial<Record<NomTouche, Touche>>

export interface ValeurTouches {
  enregistrer: (source: string, touches: Touches) => void
  retirer: (source: string) => void
  /** Touches visibles : la dernière source enregistrée l'emporte pour une même touche. */
  touches: Touches
}

export const ContexteTouches = createContext<ValeurTouches | null>(null)

/** Déclare les touches de l'écran tant qu'il est affiché. */
export function useTouches(touches: Touches): void {
  const contexte = useContext(ContexteTouches)
  const enregistrer = contexte?.enregistrer
  const retirer = contexte?.retirer
  const source = useId()
  useEffect(() => {
    enregistrer?.(source, touches)
  })
  useEffect(() => () => retirer?.(source), [retirer, source])
}

export function useBarreTouches(): Touches {
  return useContext(ContexteTouches)?.touches ?? {}
}
