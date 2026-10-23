// Rattrapage (PAP-00, T-164 A2 et A7) : page de liens, sans donnée ni nombre. Une carte par fiche papier, dans l'ordre
// du parcours de l'olive, puis « Corriger une erreur » pour qui a le droit de corriger. Chaque fiche garde sa route.
import { Link } from 'react-router-dom'
import { EnTeteEcran } from '../composants/EnTeteEcran'
import { Icone } from '../composants/Icone'
import { Note } from '../composants/Note'
import { Panneau } from '../composants/Panneau'
import { useSessionOuverte } from '../contextes/session'
import { libelles } from '../libelles'
import { entreesVisibles, type EntreeMenu } from '../navigation'
import '../styles/rattrapage.css'

/** Fiches papier dans l'ordre du parcours de l'olive : réception, laboratoire, trituration, remise, cuve, règlement, vente. */
const ORDRE_FICHES = ['PAP-01', 'PAP-02', 'PAP-03', 'PAP-04', 'PAP-05', 'PAP-06', 'PAP-07'] as const
const CODE_CORRECTIONS = 'COR-01'

function Carte({ entree, rang }: { entree: EntreeMenu; rang?: number }) {
  const fiche = libelles.rattrapage.fiches[entree.code]
  return (
    <Link to={entree.chemin} className="rattrapage-fiche">
      <span className="rattrapage-icone">
        {rang !== undefined && <span className="rattrapage-ordre" aria-hidden="true">{rang}</span>}
        <Icone nom={entree.icone} />
      </span>
      <span className="rattrapage-titre">{fiche?.titre ?? entree.libelle}</span>
      {fiche !== undefined && <span className="rattrapage-description">{fiche.description}</span>}
      <span className="rattrapage-code chiffres">{entree.code}</span>
    </Link>
  )
}

export function PageRattrapage() {
  const { utilisateur, poste, permissions } = useSessionOuverte()
  const t = libelles.rattrapage
  // Seulement les écrans que la session voit : la carte des corrections demande `corriger_avant_reglement`.
  const visibles = entreesVisibles(permissions, utilisateur.role, poste.type_poste)
  const trouver = (code: string) => visibles.find((entree) => entree.code === code)
  const fiches = ORDRE_FICHES.flatMap((code) => trouver(code) ?? [])
  const corrections = trouver(CODE_CORRECTIONS)
  return (
    <section>
      <EnTeteEcran titre={libelles.ecrans.rattrapage} sousTitre={t.sousTitre} />
      <div className="mes-page rattrapage">
        <Note ton="alerte">{t.consigne}</Note>
        {fiches.length > 0 && (
          <Panneau titre={t.fichesPapier} icone="notebook-pen">
            <ol className="rattrapage-fiches">
              {fiches.map((entree, i) => <li key={entree.code}><Carte entree={entree} rang={i + 1} /></li>)}
            </ol>
          </Panneau>
        )}
        {corrections !== undefined && (
          <Panneau titre={t.corriger} icone="file-pen">
            <ul className="rattrapage-fiches">
              <li><Carte entree={corrections} /></li>
            </ul>
          </Panneau>
        )}
      </div>
    </section>
  )
}
