// Panneau gris à bandeau en capitales (maquette MES) : remplace `.panneau` et `.rec-panneau` au fil de la refonte.
import { useId, type ReactNode } from 'react'
import { Icone } from './Icone'
import type { NomIcone } from './icones'
import { classes } from './logique'

interface Props {
  titre: string
  icone?: NomIcone
  /** Nombre ou court texte à droite du titre (« 3 », « depuis 07:42 »). */
  compte?: ReactNode
  /** Boutons secondaires ou étiquette d'état, au bout du bandeau. */
  actions?: ReactNode
  /** Contenu collé aux bords (un tableau) : pas de marge intérieure. */
  serre?: boolean
  /** Niveau du titre : 3 pour un panneau dans un autre. */
  niveau?: 2 | 3
  /** Classe en plus (par exemple une classe que des tests sélectionnent). */
  className?: string
  children?: ReactNode
}

export function Panneau({ titre, icone, compte, actions, serre = false, niveau = 2, className, children }: Props) {
  const id = useId()
  const Titre = niveau === 3 ? 'h3' : 'h2'
  return (
    <section className={classes('mes-panneau', className)} aria-labelledby={id}>
      <header className="mes-bandeau">
        <Titre id={id}>
          {icone !== undefined && <Icone nom={icone} />}
          {titre}
        </Titre>
        {compte !== undefined && <span className="mes-bandeau-compte">{compte}</span>}
        {actions !== undefined && <div className="mes-bandeau-actions">{actions}</div>}
      </header>
      <div className={serre ? 'mes-corps mes-corps-serre' : 'mes-corps'}>{children}</div>
    </section>
  )
}
