import { Link } from 'react-router-dom'
import { useSessionOuverte } from '../contextes/session'
import { libelles } from '../libelles'
import { useEcransMasques } from '../laboratoire/useEcransMasques'
import { entreesVisibles, regrouper, sansEcrans } from '../navigation'
import { EnTeteEcran } from '../composants/EnTeteEcran'

export function PageAccueil() {
  const { utilisateur, poste, permissions } = useSessionOuverte()
  const masques = useEcransMasques()
  const blocs = regrouper(sansEcrans(entreesVisibles(permissions, utilisateur.role, poste.type_poste), masques))
  return (
    <section>
      <EnTeteEcran code="ACC-01" titre={`${libelles.accueil.titre} ${utilisateur.nom}`} />
      <div className="mes-page">
      <p className="aide">{blocs.length === 0 ? libelles.accueil.aucunEcran : libelles.accueil.aide}</p>
      {blocs.map((bloc) => (
        <div key={bloc.groupe} className="bloc-accueil">
          <h2>{libelles.groupes[bloc.groupe]}</h2>
          <div className="grille-cartes">
            {bloc.entrees.map((entree) => (
              <Link key={entree.chemin} to={entree.chemin} className="carte-ecran"><span className="carte-ecran-code">{entree.code}</span>{entree.libelle}</Link>
            ))}
          </div>
        </div>
      ))}
    </div>
    </section>
  )
}
