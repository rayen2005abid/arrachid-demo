// Sous-onglets d'un onglet (maquette MES) : chacun mène à une route existante (T-164 : un sous-onglet est une route).
// Avec un seul sous-onglet permis, la barre n'est pas affichée : l'onglet prend son libellé (règle A5).
import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { Icone } from './Icone'
import type { NomIcone } from './icones'

export interface SousOnglet {
  chemin: string
  libelle: string
  icone?: NomIcone
  /** Code de l'écran (« PRD-01 »). */
  code?: string
  /** Compteur ou voyant de l'écran (composants Compteur, Lampe). */
  indicateur?: ReactNode
}

export function SousOnglets({ libelle, onglets }: { libelle: string; onglets: readonly SousOnglet[] }) {
  if (onglets.length < 2) return null
  return (
    <nav className="mes-sous-onglets" aria-label={libelle}>
      {onglets.map((onglet) => (
        <NavLink key={onglet.chemin} to={onglet.chemin} end className="mes-sous">
          {onglet.icone !== undefined && <Icone nom={onglet.icone} />}
          {onglet.libelle}
          {onglet.indicateur}
          {onglet.code !== undefined && <span className="mes-sous-code">{onglet.code}</span>}
        </NavLink>
      ))}
    </nav>
  )
}
