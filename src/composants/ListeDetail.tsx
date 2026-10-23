// Liste à gauche, détail à droite (maquette MES : « maître ») ; l'un sous l'autre sous 1024 px de large.
// Chaque côté empile ses panneaux. Remplace `.rec-corps`, `.rec-file`, `.rec-centre` et `.colonnes` au fil de la refonte.
import type { ReactNode } from 'react'

interface Props {
  liste: ReactNode
  detail: ReactNode
  /** Liste étroite (une file, une recherche) : le détail prend le reste de la largeur. */
  listeEtroite?: boolean
}

export function ListeDetail({ liste, detail, listeEtroite = false }: Props) {
  return (
    <div className={listeEtroite ? 'mes-liste-detail mes-liste-detail-etroite' : 'mes-liste-detail'}>
      <div className="mes-pile">{liste}</div>
      <div className="mes-pile">{detail}</div>
    </div>
  )
}
