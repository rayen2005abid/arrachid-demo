import { Link } from 'react-router-dom'
import { IconePosteVide } from '../composants/IconesAcces'
import { libelles } from '../libelles'

export function PagePosteNonAppaire() {
  return (
    <section className="page-centree ecran-acces acces-vide">
      <div className="acces-vide-pictogramme" aria-hidden="true">
        <IconePosteVide />
        <span className="acces-vide-alerte">!</span>
      </div>
      <h1>{libelles.posteNonAppaire.message}</h1>
      <Link to="/appairage" className="lien-discret acces-appairer">{libelles.posteNonAppaire.entreeDiscrete}</Link>
    </section>
  )
}
