// Jauge de niveau (maquette MES : « mini-jauge », cuve dessinée) : un simple repère visuel du contenu d'une cuve ou
// d'un tampon. Elle est cachée aux lecteurs d'écran : les chiffres du serveur, écrits à côté, font foi.
import { classes } from './logique'

interface Props {
  /** Niveau en pourcentage CSS (`largeurNiveau` ou le remplissage donné par le serveur), borné entre 0 et 100 %. */
  niveau: string
  /** `verticale` : cuve dessinée, remplie par le bas. */
  sens?: 'horizontale' | 'verticale'
  /** Couleur de la qualité de l'huile (`extra_vierge`, `vierge`, `lampante`) ; sinon la couleur d'action. */
  qualite?: string
}

export function Jauge({ niveau, sens = 'horizontale', qualite }: Props) {
  return (
    <span className={classes('mes-jauge', sens === 'verticale' && 'mes-jauge-verticale', qualite !== undefined && `mes-jauge-${qualite}`)} aria-hidden="true">
      <span className="mes-jauge-niveau" style={sens === 'verticale' ? { height: niveau } : { width: niveau }} />
    </span>
  )
}
