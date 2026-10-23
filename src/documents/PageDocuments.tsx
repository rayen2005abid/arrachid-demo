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
import { ReceptionsTrouvees } from '../recherche/ReceptionsTrouvees'
import type { ReceptionTrouvee } from '../recherche/receptions'
import { useRechercheReception } from '../recherche/useRechercheReception'
import { cheminDocument, type DocumentEdite } from './documents'
import { VueDocument } from './VueDocument'

const t = libelles.documents
const FICHE = '/api/documents/fiche-lot'
const REGISTRE = '/api/documents/registre'
const RECHERCHE = '/api/documents/fiche-lot/recherche'

/** DOC-01 : fiche lot à la demande (litige) ; registre journalier pour le responsable et le propriétaire. */
export function PageDocuments() {
  const { permissions } = useSessionOuverte()
  const voitRegistre = permissions.includes('voir_finances')
  const [numero, definirNumero] = useState('')
  // Numéro du ticket, numéro de réception (= lot) ou nom (EM-07).
  const trouvees = useRechercheReception(RECHERCHE, t.numeroInvalide)
  const [journee, definirJournee] = useState(aujourdHuiTunis())
  const [demande, definirDemande] = useState<{ base: string; cle: 'numero' | 'date'; valeur: string } | null>(null)
  const lecture = useLecture<DocumentEdite>(demande === null ? null : cheminDocument(demande.base, demande.cle, demande.valeur))
  const pdf = demande === null ? null : cheminDocument(demande.base, demande.cle, demande.valeur, true)

  // Redemander le même document le réédite : l'heure d'édition et le contenu sont ceux de cet instant.
  const demander = (base: string, cle: 'numero' | 'date', valeur: string) => {
    if (demande?.base === base && demande.valeur === valeur) void lecture.recharger()
    else definirDemande({ base, cle, valeur })
  }
  const ouvrirFiche = (trouvee: ReceptionTrouvee | null) => { if (trouvee !== null) demander(FICHE, 'numero', String(trouvee.numero)) }
  const afficherFiche = async () => ouvrirFiche(await trouvees.chercher(numero))

  const demandes = (
    <>
      <Panneau titre={t.ficheLot} icone="package">
        <Champ
          id="numero-lot"
          libelle={t.numero}
          valeur={numero}
          aide={t.numeroAide}
          surChangement={(valeur) => { definirNumero(valeur); trouvees.effacerErreur() }}
          erreur={trouvees.erreur}
          onKeyDown={(e) => { if (e.key === 'Enter') void afficherFiche() }}
          autoFocus
        />
      </Panneau>
      {trouvees.resultat !== null && (
        <ReceptionsTrouvees resultat={trouvees.resultat} surChoisir={ouvrirFiche}
          choisie={trouvees.resultat.resultats.find((r) => demande?.base === FICHE && String(r.numero) === demande.valeur)?.reception_id ?? null} />
      )}
      {voitRegistre && (
        <Panneau titre={t.registre} icone="calendar-clock">
          <div className="bureau-formulaire">
            <Champ id="journee-registre" type="date" libelle={t.journee} valeur={journee} surChangement={definirJournee} />
            <div className="bureau-actions">
              <button type="button" className="bouton-secondaire" onClick={() => demander(REGISTRE, 'date', journee)}>{t.afficherRegistre}</button>
            </div>
          </div>
        </Panneau>
      )}
    </>
  )

  const document = demande !== null && lecture.erreur === null ? lecture.donnees : null
  const apercu = (
    <>
      {lecture.erreur !== null && <Note ton="erreur">{lecture.erreur}</Note>}
      {document !== null ? <VueDocument document={document} pdf={pdf} /> : lecture.erreur === null && (
        <Panneau titre={libelles.ecrans.documents} icone="folder-open"><EtatVide message={demande === null ? t.choisir : libelles.commun.chargement} /></Panneau>
      )}
    </>
  )

  return (
    <section>
      <EnTeteEcran titre={libelles.ecrans.documents} sousTitre={t.sousTitre}
        principal={{ etiquette: t.afficherFiche, surClic: () => void afficherFiche(), enCours: lecture.chargement || trouvees.enCours }} />
      <div className="mes-page bureau-page">
        <ListeDetail liste={demandes} detail={apercu} listeEtroite />
      </div>
    </section>
  )
}
