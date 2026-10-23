import { useState } from 'react'
import { useLecture } from '../api/useLecture'
import { useSoumission } from '../api/useSoumission'
import { Champ } from '../composants/Champ'
import { Chiffres } from '../composants/Chiffres'
import { Note } from '../composants/Note'
import { Tiroir } from '../composants/Tiroir'
import { ValidationPin } from '../composants/ValidationPin'
import type { DocumentEdite } from '../documents/documents'
import { afficherMillimes } from '../format/montants'
import { uniteExacte } from '../format/saisie'
import { libelles } from '../libelles'
import type { Validation } from '../types'
import { CHEMIN_JOURNAL, chiffresResume, raisonCloture, remisAuProprietaire, texteEcart, type ResumeCaisse, type SessionFermee } from './sessions'

const t = libelles.caisse
const SECTION_CHEQUES = 'Chèques et virements (hors tiroir)'

interface Props {
  /** Résumé de caisse/resume : l'attendu n'y est que pour le propriétaire (E-28). */
  resume: ResumeCaisse | null
  surCloture: (session: SessionFermee) => void
  surFermer: () => void
}

/** Chèques et virements reçus pendant la session, à retrouver dans le tiroir : « Chèque n° 0012345 (BIAT) ». */
function chequesRecus(journal: DocumentEdite | null): { cle: string; libelle: string }[] {
  const section = journal?.sections.find((s) => s.titre === SECTION_CHEQUES)
  return (section?.lignes ?? [])
    .filter((ligne) => ligne[6] === 'Reçu')
    .map((ligne, rang) => ({ cle: `${rang}-${ligne[3]}`, libelle: `${ligne[2]} n° ${ligne[3]} (${ligne[4]}) — ${ligne[5]}` }))
}

/**
 * Clôture par le responsable ou le propriétaire (CONTEXTE §25.4 ; E-28, E-29). Le responsable compte sans voir l'attendu ;
 * un compte faux se recompte, puis l'écart s'explique ; au-delà du seuil du propriétaire, son PIN le valide. La personne
 * dit ce qu'elle laisse dans le tiroir pour la prochaine ouverture ; le reste est remis au propriétaire.
 */
export function ClotureCaisse({ resume, surCloture, surFermer }: Props) {
  const soumission = useSoumission()
  const journal = useLecture<DocumentEdite>(CHEMIN_JOURNAL)
  const [compte, definirCompte] = useState('')
  const [laisse, definirLaisse] = useState<string | null>(null)
  const [raison, definirRaison] = useState('')
  const [recompte, definirRecompte] = useState(false)
  const [pinDemande, definirPinDemande] = useState(false)
  const [validation, definirValidation] = useState<Validation | null>(null)
  const [presents, definirPresents] = useState<string[] | null>(null)
  const [invalide, definirInvalide] = useState(false)
  const cheques = chequesRecus(journal.donnees)
  const coches = presents ?? cheques.map((c) => c.cle)
  const absents = cheques.filter((c) => !coches.includes(c.cle)).map((c) => c.libelle)
  const millimes = uniteExacte(compte, 3)
  const laisseMillimes = laisse === null ? millimes : uniteExacte(laisse, 3)
  const laisseFaux = laisseMillimes === null || (millimes !== null && laisseMillimes > millimes)
  const attendu = resume?.attendu_millimes

  const changer = () => {
    definirInvalide(false)
    soumission.reinitialiser()
  }

  const cloturer = async () => {
    if (millimes === null || laisseFaux || laisseMillimes === null || soumission.enCours) {
      definirInvalide(true)
      return
    }
    const resultat = await soumission.soumettre<{ session_caisse: SessionFermee }>('/api/caisse/cloture', {
      compte_fermeture_millimes: millimes,
      fonds_laisse_millimes: laisseMillimes,
      ecart_confirme: recompte,
      motif: raisonCloture(raison, absents),
      ...(validation !== null ? { validation } : {}),
    })
    if (resultat !== null) surCloture(resultat.session_caisse)
  }

  // Réactions aux refus du serveur, par leur code (jamais montré) : recompter, demander le PIN du propriétaire.
  if (soumission.code === 'recomptage_caisse' && !recompte) {
    definirRecompte(true)
    definirCompte('')
    definirLaisse(null)
  }
  if (soumission.code === 'validation_proprietaire_ecart' && !pinDemande) definirPinDemande(true)

  return (
    <Tiroir
      titre={t.titreCloture}
      icone="wallet"
      etiquette={t.cloturer}
      surValider={() => void cloturer()}
      surFermer={surFermer}
      enCours={soumission.enCours}
      erreur={soumission.code === 'recomptage_caisse' ? null : soumission.erreur}
      consequence={t.consequenceCloture}
    >
      {recompte ? <Note ton="alerte">{t.recompter}</Note> : resume?.comptage_aveugle === true && <Note>{t.aveugle}</Note>}
      <Champ
        id="compte-caisse"
        libelle={t.compte}
        valeur={compte}
        surChangement={(valeur) => { definirCompte(valeur); changer() }}
        erreur={invalide && millimes === null ? t.compteInvalide : undefined}
        inputMode="decimal"
        placeholder="0,000"
        chiffres
        grand
      />
      {attendu !== undefined && millimes !== null && (
        <p className="bureau-discret">{t.ecartAPrevoir.replace('{ecart}', texteEcart(millimes - attendu, afficherMillimes))}</p>
      )}
      {recompte && (
        <Champ
          id="raison-ecart"
          libelle={t.raisonEcart}
          valeur={raison}
          surChangement={(valeur) => { definirRaison(valeur); changer() }}
          erreur={soumission.code === 'motif_ecart_obligatoire' ? libelles.caisse.raisonObligatoire : undefined}
          maxLength={200}
        />
      )}
      <Champ
        id="laisse-caisse"
        libelle={t.laisse}
        valeur={laisse ?? compte}
        surChangement={(valeur) => { definirLaisse(valeur); changer() }}
        erreur={invalide && laisseFaux ? t.laisseInvalide : undefined}
        inputMode="decimal"
        placeholder="0,000"
        chiffres
      />
      {millimes !== null && laisseMillimes !== null && !laisseFaux && (
        <p className="bureau-discret">{t.remis.replace('{montant}', afficherMillimes(remisAuProprietaire(millimes, laisseMillimes)))}</p>
      )}
      {cheques.length > 0 && (
        <fieldset className="bureau-cheques">
          <legend className="mes-etiquette">{t.chequesPresents}</legend>
          {cheques.map((cheque) => (
            <label key={cheque.cle} className="mes-case">
              <input
                type="checkbox"
                checked={coches.includes(cheque.cle)}
                onChange={() => { definirPresents(coches.includes(cheque.cle) ? coches.filter((c) => c !== cheque.cle) : [...coches, cheque.cle]); changer() }}
              />
              {cheque.libelle}
            </label>
          ))}
          {absents.length > 0 && <Note ton="alerte">{t.chequesAbsents.replace('{liste}', absents.join(', '))}</Note>}
        </fieldset>
      )}
      {pinDemande && (
        <>
          <Note ton="alerte">{t.pinProprietaireEcart}</Note>
          <ValidationPin seulProprietaire surValidation={(v) => { definirValidation(v); changer() }} />
        </>
      )}
      {resume !== null && <div className="bureau-resume"><Chiffres libelle={t.titreSession} valeurs={chiffresResume(resume, afficherMillimes)} /></div>}
    </Tiroir>
  )
}
