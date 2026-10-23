import { useServeur } from '../contextes/serveur'
import { libelles } from '../libelles'

/** Bandeau global affiché dès que le serveur ne répond plus. */
export function BandeauServeur() {
  const { disponible } = useServeur()
  if (disponible) return null
  return <div className="bandeau-serveur" role="alert">{libelles.bandeau.serveurIndisponible}</div>
}
