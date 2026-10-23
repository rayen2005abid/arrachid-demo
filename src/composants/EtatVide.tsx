// Message d'une liste ou d'un panneau sans contenu (maquette MES : « vide-etat ») ; remplace `.rec-vide`.
import type { ReactNode } from 'react'

interface Props {
  message: string
  /** Action utile à cet endroit (un bouton), le cas échéant. */
  children?: ReactNode
}

export function EtatVide({ message, children }: Props) {
  return (
    <div className="mes-vide">
      <p>{message}</p>
      {children}
    </div>
  )
}
