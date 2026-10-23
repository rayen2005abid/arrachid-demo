// Note encadrée (maquette MES) : information, alerte, erreur ou réussite, avec son icône.
// Remplace au fil de la refonte `.erreur`, `.succes`, `.suggestions` et `.consequence`.
import type { ReactNode } from 'react'
import { Icone } from './Icone'
import type { NomIcone } from './icones'

export type TonNote = 'info' | 'alerte' | 'erreur' | 'ok'

const ICONES_NOTE: Record<TonNote, NomIcone> = { info: 'info', alerte: 'triangle-alert', erreur: 'octagon-alert', ok: 'circle-check' }

interface Props {
  ton?: TonNote
  /**
   * Annonce le contenu quand il change (résultat d'une action). Une erreur est toujours annoncée ;
   * une note d'explication fixe ne l'est pas.
   */
  vivante?: boolean
  /** Texte simple, ou paragraphes et boutons d'action. */
  children: ReactNode
}

export function Note({ ton = 'info', vivante = false, children }: Props) {
  const role = ton === 'erreur' ? 'alert' : vivante ? 'status' : undefined
  return (
    <div className={ton === 'info' ? 'mes-note' : `mes-note mes-note-${ton}`} role={role}>
      <Icone nom={ICONES_NOTE[ton]} />
      <div className="mes-note-texte">{typeof children === 'string' ? <p>{children}</p> : children}</div>
    </div>
  )
}
