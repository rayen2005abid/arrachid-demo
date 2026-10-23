// Fournisseur des touches de fonction de la coquille (voir `touches.ts`).
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ContexteTouches, NOMS_TOUCHES, type NomTouche, type Touches } from './touches'

const signature = (touches: Touches) =>
  NOMS_TOUCHES.map((nom) => `${nom}:${touches[nom]?.libelle ?? ''}:${touches[nom]?.inactif ? 1 : 0}`).join('|')

export function FournisseurTouches({ children }: { children: ReactNode }) {
  const sources = useRef(new Map<string, Touches>())
  const [, definirVersion] = useState('')

  const fusion = useCallback((): Touches => {
    const resultat: Touches = {}
    for (const touches of sources.current.values()) Object.assign(resultat, touches)
    return resultat
  }, [])

  const rafraichir = useCallback(() => definirVersion(signature(fusion())), [fusion])
  const enregistrer = useCallback((source: string, touches: Touches) => {
    sources.current.set(source, touches)
    rafraichir()
  }, [rafraichir])
  const retirer = useCallback((source: string) => {
    sources.current.delete(source)
    rafraichir()
  }, [rafraichir])

  // La barre n'est redessinée que si un libellé ou un état change (la signature), jamais à chaque frappe.
  const touches = fusion()
  const valeur = useMemo(() => ({ enregistrer, retirer, touches }), [enregistrer, retirer, signature(touches)]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const clavier = (e: KeyboardEvent) => {
      if (!(NOMS_TOUCHES as readonly string[]).includes(e.key)) return
      e.preventDefault()
      const touche = fusion()[e.key as NomTouche]
      if (touche !== undefined && !touche.inactif) touche.action()
    }
    window.addEventListener('keydown', clavier)
    return () => window.removeEventListener('keydown', clavier)
  }, [fusion])

  return <ContexteTouches.Provider value={valeur}>{children}</ContexteTouches.Provider>
}

