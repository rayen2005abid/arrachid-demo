import { EnTeteEcran } from '../composants/EnTeteEcran'
import { RapportManquants } from '../composants/RapportManquants'
import { libelles } from '../libelles'

/** Données de mise en service manquantes, module par module (responsable et propriétaire). */
export function PageDonneesManquantes() {
  return (
    <>
      <EnTeteEcran titre={libelles.manquants.titre} />
      <div className="mes-page"><RapportManquants /></div>
    </>
  )
}
