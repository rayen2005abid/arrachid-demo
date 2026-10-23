import { useState, type FormEvent } from 'react'
import { useLecture } from '../api/useLecture'
import { useSoumission } from '../api/useSoumission'
import { Champ } from '../composants/Champ'
import { Chiffres } from '../composants/Chiffres'
import { EnTeteEcran, type MessageEcran } from '../composants/EnTeteEcran'
import { Icone } from '../composants/Icone'
import { Lampe } from '../composants/Lampe'
import { Note } from '../composants/Note'
import { Panneau } from '../composants/Panneau'
import { Pastille } from '../composants/Pastille'
import { TableauDonnees, type Colonne } from '../composants/TableauDonnees'
import { useSessionOuverte } from '../contextes/session'
import { useTouches } from '../contextes/touches'
import type { DocumentEdite } from '../documents/documents'
import { VueDocument } from '../documents/VueDocument'
import { formaterHorodatage } from '../format/dates'
import { afficherMillimes } from '../format/montants'
import { uniteExacte } from '../format/saisie'
import { libelles } from '../libelles'
import { cheminAvances, type Avance, type LectureAvances } from './avances'
import { ClotureCaisse } from './ClotureCaisse'
import { DonnerAvance } from './DonnerAvance'
import { MouvementFonds, type SensFonds } from './MouvementFonds'
import {
  CHEMIN_JOURNAL,
  CHEMIN_RESUME,
  CHEMIN_SESSIONS,
  cheminJournalPdf,
  chiffresResume,
  remisAuProprietaire,
  sessionsFermees,
  texteEcart,
  tonEcart,
  type LectureSession,
  type ResumeCaisse,
  type SessionFermee,
} from './sessions'
import '../styles/bureau.css'

const t = libelles.caisse
const PERIODE_MS = 5000
const FORMULAIRE = 'formulaire-caisse'
type Tiroir = 'cloture' | 'avance' | SensFonds | null

/**
 * Caisse commune de l'huilerie (CONTEXTE §25.4, E-20 ; EM-05) : ouverture avec le fonds laissé à la clôture précédente,
 * apports et sorties de fonds, avances (si P1 les a ouvertes), journal des mouvements et clôture à l'aveugle. Le tiroir,
 * le journal et la clôture sont au responsable et au propriétaire (`cloturer_caisse`) ; seul le propriétaire lit
 * l'attendu pendant la session (E-28).
 */
export function PageCaisse() {
  const { permissions } = useSessionOuverte()
  const voitTiroir = permissions.includes('cloturer_caisse')
  const lecture = useLecture<LectureSession>('/api/caisse/session', PERIODE_MS)
  const ouverte = lecture.donnees?.session_caisse != null
  const resume = useLecture<{ resume: ResumeCaisse | null }>(voitTiroir && ouverte ? CHEMIN_RESUME : null, PERIODE_MS)
  const historique = useLecture<SessionFermee[]>(voitTiroir ? CHEMIN_SESSIONS : null)
  const journal = useLecture<DocumentEdite & { session_caisse_id: number }>(voitTiroir ? CHEMIN_JOURNAL : null, PERIODE_MS)
  const avances = useLecture<LectureAvances>(cheminAvances(), PERIODE_MS)
  const soumission = useSoumission()
  const [fonds, definirFonds] = useState<string | null>(null)
  const [raisonFonds, definirRaisonFonds] = useState('')
  const [invalide, definirInvalide] = useState(false)
  const [message, definirMessage] = useState<MessageEcran | null>(null)
  const [tiroir, definirTiroir] = useState<Tiroir>(null)
  // Après l'ouverture réussie, jusqu'à la relecture : F8 ne relance pas l'ouverture.
  const [actualisation, definirActualisation] = useState(false)

  const session = lecture.donnees?.session_caisse ?? null
  const connue = lecture.donnees !== null
  const actions = lecture.donnees?.actions_possibles ?? []
  const peutCloturer = session !== null && actions.includes('cloturer')
  const peutFonds = session !== null && actions.includes('apporter')
  const peutDonner = session !== null && (avances.donnees?.actions_possibles.includes('donner') ?? false)
  const enCours = avances.donnees?.avances ?? []
  const fermees = sessionsFermees(historique.donnees ?? [])
  const resumeCaisse = session === null ? null : (resume.donnees?.resume ?? null)
  const propose = lecture.donnees?.fonds_propose_millimes ?? null
  // Le fonds proposé est l'argent laissé à la dernière clôture (E-29) ; un autre fonds dit pourquoi.
  const texteFonds = fonds ?? (propose === null ? '0,000' : afficherMillimes(propose))
  const montantFonds = uniteExacte(texteFonds, 3)
  const fondsDifferent = propose !== null && montantFonds !== null && montantFonds !== propose

  useTouches(tiroir !== null ? {} : {
    ...(peutDonner ? { F2: { libelle: t.donner, action: () => definirTiroir('avance') } } : {}),
    ...(peutFonds ? {
      F3: { libelle: t.apport, action: () => definirTiroir('apport') },
      F4: { libelle: t.sortie, action: () => definirTiroir('sortie') },
    } : {}),
  })

  const recharger = () => {
    void lecture.recharger()
    void historique.recharger()
    void journal.recharger()
    void resume.recharger()
  }

  const ouvrir = async (e: FormEvent) => {
    e.preventDefault()
    if (soumission.enCours || actualisation) return
    if (montantFonds === null || (fondsDifferent && raisonFonds.trim() === '')) {
      definirInvalide(true)
      return
    }
    definirInvalide(false)
    const resultat = await soumission.soumettre<{ session_caisse: unknown }>('/api/caisse/ouverture', {
      fonds_ouverture_millimes: montantFonds,
      ...(fondsDifferent ? { motif: raisonFonds.trim() } : {}),
    })
    if (resultat === null) return
    definirMessage({ texte: t.ouverte, type: 'ok' })
    definirFonds(null)
    definirRaisonFonds('')
    definirActualisation(true)
    try {
      await lecture.recharger()
    } finally {
      definirActualisation(false)
    }
    void journal.recharger()
  }

  const principal = !connue ? null
    : session === null ? { etiquette: t.ouvrir, formulaire: FORMULAIRE, enCours: soumission.enCours || actualisation }
      : peutCloturer ? { etiquette: t.cloturer, surClic: () => definirTiroir('cloture') } : null

  const sousTitre = session === null
    ? <Lampe etat={connue ? 'alerte' : 'eteinte'} libelle={connue ? t.etats.fermee : libelles.commun.chargement} />
    : <Lampe etat={lecture.donnees?.ouverte_avant_aujourdhui === true ? 'alerte' : 'ok'} libelle={`${t.etats.ouverte} · ${formaterHorodatage(session.ouverte_le)}`} />

  const colonnesSessions: Colonne<SessionFermee>[] = [
    { cle: 'ouverte', titre: t.colonnes.ouverte, rendu: (s) => formaterHorodatage(s.ouverte_le), nombre: true },
    { cle: 'fermee', titre: t.colonnes.fermee, rendu: (s) => (s.fermee_le === null ? '' : formaterHorodatage(s.fermee_le)), nombre: true },
    { cle: 'par', titre: t.colonnes.par, rendu: (s) => s.fermee_par ?? '' },
    { cle: 'fonds', titre: t.colonnes.fonds, rendu: (s) => afficherMillimes(s.fonds_ouverture_millimes), nombre: true },
    { cle: 'attendu', titre: t.colonnes.attendu, rendu: (s) => afficherMillimes(s.attendu_fermeture_millimes ?? 0), nombre: true },
    { cle: 'compte', titre: t.colonnes.compte, rendu: (s) => afficherMillimes(s.compte_fermeture_millimes ?? 0), nombre: true },
    { cle: 'ecart', titre: t.colonnes.ecart, rendu: (s) => <Pastille ton={tonEcart(s.ecart_millimes ?? 0)}>{texteEcart(s.ecart_millimes ?? 0, afficherMillimes)}</Pastille> },
    { cle: 'raison', titre: t.colonnes.raison, rendu: (s) => s.motif_ecart ?? '' },
    { cle: 'pv', titre: t.colonnes.pv, rendu: (s) => <a href={cheminJournalPdf(s.id)} target="_blank" rel="noreferrer">{t.imprimer}</a> },
  ]

  const colonnesAvances: Colonne<Avance>[] = [
    { cle: 'apporteur', titre: t.colonnesAvances.apporteur, rendu: (a) => a.apporteur },
    { cle: 'versee', titre: t.colonnesAvances.versee, rendu: (a) => formaterHorodatage(a.horodatage), nombre: true },
    { cle: 'montant', titre: t.colonnesAvances.montant, rendu: (a) => afficherMillimes(a.montant_millimes), nombre: true },
    {
      cle: 'recu',
      titre: t.colonnesAvances.recu,
      rendu: (a) => <a href={`/api/reglements/${a.recu_id}/pdf`} target="_blank" rel="noreferrer">{t.recu.replace('{numero}', String(a.recu_numero))}</a>,
    },
  ]

  const documentJournal = journal.donnees
  return (
    <section>
      <EnTeteEcran titre={libelles.ecrans.caisse} sousTitre={sousTitre} message={message} principal={principal}>
        {peutFonds && (
          <>
            <button type="button" className="bouton-secondaire" onClick={() => definirTiroir('apport')} aria-keyshortcuts="F3">
              <Icone nom="arrow-down" />{t.apport}
            </button>
            <button type="button" className="bouton-secondaire" onClick={() => definirTiroir('sortie')} aria-keyshortcuts="F4">
              <Icone nom="arrow-up" />{t.sortie}
            </button>
          </>
        )}
        {peutDonner && (
          <button type="button" className="bouton-secondaire" onClick={() => definirTiroir('avance')} aria-keyshortcuts="F2">
            <Icone nom="hand-coins" />{t.donner}
          </button>
        )}
      </EnTeteEcran>
      <div className="mes-page bureau-page">
        {lecture.erreur !== null && <Note ton="erreur">{lecture.erreur}</Note>}
        {soumission.erreur !== null && <Note ton="erreur">{soumission.erreur}</Note>}
        {session !== null && lecture.donnees?.ouverte_avant_aujourdhui === true && (
          <Note ton="alerte">{t.depuisVeille.replace('{date}', formaterHorodatage(session.ouverte_le))}</Note>
        )}
        <Panneau titre={t.titreSession} icone="wallet" actions={connue ? <Pastille ton={session === null ? 'alerte' : 'ok'}>{session === null ? t.etats.fermee : t.etats.ouverte}</Pastille> : undefined}>
          {connue && session === null && (
            <form id={FORMULAIRE} className="bureau-formulaire bureau-ouverture" onSubmit={(e) => void ouvrir(e)} noValidate>
              <Note ton="alerte">{t.aucune}</Note>
              {propose !== null && <Note>{t.fondsPropose.replace('{montant}', afficherMillimes(propose))}</Note>}
              <Champ
                id="fonds-caisse"
                libelle={t.fonds}
                valeur={texteFonds}
                surChangement={(valeur) => { definirFonds(valeur); definirInvalide(false); soumission.reinitialiser() }}
                erreur={invalide && montantFonds === null ? t.fondsInvalide : undefined}
                inputMode="decimal"
                chiffres
                grand
              />
              {fondsDifferent && (
                <Champ
                  id="raison-fonds"
                  libelle={t.raisonFonds}
                  valeur={raisonFonds}
                  surChangement={(valeur) => { definirRaisonFonds(valeur); definirInvalide(false); soumission.reinitialiser() }}
                  erreur={invalide && raisonFonds.trim() === '' ? t.raisonObligatoire : undefined}
                  maxLength={200}
                  requis
                />
              )}
            </form>
          )}
          {session !== null && (
            resumeCaisse !== null ? (
              <div className="bureau-resume"><Chiffres libelle={t.titreSession} valeurs={chiffresResume(resumeCaisse, afficherMillimes)} /></div>
            ) : (
              <Chiffres
                libelle={t.titreSession}
                valeurs={[
                  { etiquette: t.ouverteLe, valeur: formaterHorodatage(session.ouverte_le) },
                  { etiquette: t.fondsDepart, valeur: `${afficherMillimes(session.fonds_ouverture_millimes)} DT`, ton: 'fort' },
                ]}
              />
            )
          )}
          {resumeCaisse?.comptage_aveugle === true && <Note>{t.aveugle}</Note>}
          {resume.erreur !== null && session !== null && <Note ton="erreur">{resume.erreur}</Note>}
        </Panneau>
        {voitTiroir && documentJournal !== null && (
          <VueDocument document={documentJournal} pdf={cheminJournalPdf(documentJournal.session_caisse_id)} />
        )}
        {voitTiroir && journal.erreur !== null && <Note ton="erreur">{journal.erreur}</Note>}
        <div className="bureau-colonnes">
          {(enCours.length > 0 || peutDonner) && (
            <Panneau titre={t.enCours} icone="hand-coins" compte={enCours.length} serre>
              <TableauDonnees legende={t.legendeEnCours} colonnes={colonnesAvances} lignes={avances.donnees === null ? null : enCours} cleLigne={(a) => a.id} vide={t.aucuneAvance} erreur={avances.erreur} />
            </Panneau>
          )}
          {voitTiroir && (
            <Panneau titre={t.precedentes} icone="history" compte={historique.donnees === null ? undefined : fermees.length} serre>
              <TableauDonnees
                legende={t.legendePrecedentes}
                colonnes={colonnesSessions}
                lignes={historique.donnees === null ? null : fermees}
                cleLigne={(s) => s.id}
                vide={t.aucunePrecedente}
                erreur={historique.erreur}
              />
            </Panneau>
          )}
        </div>
      </div>

      {tiroir === 'cloture' && session !== null && (
        <ClotureCaisse
          resume={resumeCaisse}
          surFermer={() => definirTiroir(null)}
          surCloture={(fermee) => {
            const ecart = fermee.ecart_millimes ?? 0
            const remis = remisAuProprietaire(fermee.compte_fermeture_millimes ?? 0, fermee.fonds_laisse_millimes ?? fermee.compte_fermeture_millimes ?? 0)
            definirTiroir(null)
            definirMessage({
              texte: t.clotureeRemis.replace('{ecart}', texteEcart(ecart, afficherMillimes)).replace('{remis}', afficherMillimes(remis)),
              type: ecart === 0 ? 'ok' : 'alerte',
            })
            recharger()
          }}
        />
      )}
      {(tiroir === 'apport' || tiroir === 'sortie') && peutFonds && (
        <MouvementFonds
          sens={tiroir}
          surFermer={() => definirTiroir(null)}
          surEnregistrement={(mouvement) => {
            definirTiroir(null)
            const texte = mouvement.sens === 'apport' ? t.apportEnregistre : t.sortieEnregistree
            definirMessage({ texte: texte.replace('{montant}', afficherMillimes(mouvement.montant_millimes)), type: 'ok' })
            recharger()
          }}
        />
      )}
      {tiroir === 'avance' && peutDonner && (
        <DonnerAvance
          surFermer={() => definirTiroir(null)}
          surVersement={(avance) => {
            definirTiroir(null)
            definirMessage({
              texte: t.versee.replace('{montant}', afficherMillimes(avance.montant_millimes)).replace('{apporteur}', avance.apporteur).replace('{recu}', String(avance.recu_numero)),
              type: 'ok',
            })
            void avances.recharger()
            recharger()
          }}
        />
      )}
    </section>
  )
}
