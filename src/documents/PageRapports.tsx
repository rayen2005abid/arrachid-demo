import { useState } from 'react'
import { useLecture } from '../api/useLecture'
import { Champ } from '../composants/Champ'
import { EnTeteEcran } from '../composants/EnTeteEcran'
import { EtatVide } from '../composants/EtatVide'
import { ListeDetail } from '../composants/ListeDetail'
import { Note } from '../composants/Note'
import { Panneau } from '../composants/Panneau'
import { useSessionOuverte } from '../contextes/session'
import { aujourdHuiTunis } from '../format/dates'
import { libelles } from '../libelles'
import '../styles/bureau.css'
import { cheminDocument, type DocumentEdite } from './documents'
import { VueDocument } from './VueDocument'

const t = libelles.documents
const CORRECTIONS = '/api/rapports/corrections'

/** RAP-01 : rapport quotidien des corrections, réservé au propriétaire (CONTEXTE §5.3). */
export function PageRapports() {
  const { permissions } = useSessionOuverte()
  const autorise = permissions.includes('voir_rapport_corrections')
  const [journee, definirJournee] = useState(aujourdHuiTunis())
  const [demandee, definirDemandee] = useState<string | null>(autorise ? journee : null)
  const lecture = useLecture<DocumentEdite>(demandee === null ? null : cheminDocument(CORRECTIONS, 'date', demandee))
  const afficher = () => { if (demandee === journee) void lecture.recharger(); else definirDemandee(journee) }

  const choix = (
    <Panneau titre={t.rapport} icone="chart-column">
      <Champ id="journee-rapport" type="date" libelle={t.journee} valeur={journee} surChangement={definirJournee} />
    </Panneau>
  )
  const apercu = (
    <>
      {lecture.erreur !== null && <Note ton="erreur">{lecture.erreur}</Note>}
      {lecture.erreur === null && lecture.donnees !== null && demandee !== null
        ? <VueDocument document={lecture.donnees} pdf={cheminDocument(CORRECTIONS, 'date', demandee, true)} />
        : lecture.erreur === null && <Panneau titre={libelles.ecrans.rapports} icone="chart-column"><EtatVide message={libelles.commun.chargement} /></Panneau>}
    </>
  )

  return (
    <section>
      <EnTeteEcran titre={libelles.ecrans.rapports} sousTitre={t.rapportsSousTitre}
        principal={autorise ? { etiquette: t.afficherRapport, surClic: afficher, enCours: lecture.chargement } : null} />
      <div className="mes-page bureau-page">
        {!autorise ? <Note ton="alerte">{t.rapportReserve}</Note> : <ListeDetail liste={choix} detail={apercu} listeEtroite />}
      </div>
    </section>
  )
}
