// Étiquette d'état (maquette MES : « jeton ») : le texte d'abord, la couleur en plus. Remplace `.pastille` et `.rec-etat`.
// Le texte et le ton viennent d'un état renvoyé par le serveur, jamais d'un état calculé par le client.
import type { ReactNode } from 'react'
import { Icone } from './Icone'
import type { NomIcone } from './icones'

export type TonPastille = 'neutre' | 'action' | 'alerte' | 'ok' | 'erreur' | 'violet' | 'sombre'

interface Props {
  ton?: TonPastille
  icone?: NomIcone
  children: ReactNode
}

export function Pastille({ ton = 'neutre', icone, children }: Props) {
  return (
    <span className={`mes-pastille mes-pastille-${ton}`}>
      {icone !== undefined && <Icone nom={icone} />}
      {children}
    </span>
  )
}
