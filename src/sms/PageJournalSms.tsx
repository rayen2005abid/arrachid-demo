import { useState } from 'react'
import { useLecture } from '../api/useLecture'
import { useSoumission } from '../api/useSoumission'
import { Champ, Panneau as TiroirConfirmation } from '../administration/composants'
import { ChampChoix } from '../composants/Champ'
import { EnTeteEcran, type MessageEcran } from '../composants/EnTeteEcran'
import { Note } from '../composants/Note'
import { Panneau } from '../composants/Panneau'
import { Pastille, type TonPastille } from '../composants/Pastille'
import { TableauDonnees, type Colonne } from '../composants/TableauDonnees'
import { formaterHorodatage } from '../format/dates'
import { libelles } from '../libelles'
import '../styles/bureau.css'
import {
  cheminJournal,
  FILTRE_VIDE,
  pageSuivante,
  peutRenvoyer,
  suite,
  type EtatEnvoi,
  type Filtre,
  type MessageSms,
  type StatutSms,
} from './logique'

const t = libelles.sms
const STATUTS = Object.keys(t.statuts) as StatutSms[]
const RAFRAICHIR_MS = 5000
const TONS: Record<StatutSms, TonPastille> = { en_file: 'neutre', en_envoi: 'neutre', envoye: 'ok', remis: 'ok', echec: 'erreur' }

/** Journal SMS (bureau, responsable et propriétaire) : état, essais, dernière erreur, renvoi. */
export function PageJournalSms() {
  const [filtre, definirFiltre] = useState<Filtre>(FILTRE_VIDE)
  const journal = useLecture<MessageSms[]>(cheminJournal(filtre), RAFRAICHIR_MS)
  const envoi = useLecture<EtatEnvoi>('/api/messages-sms/envoi', RAFRAICHIR_MS)
  const s = useSoumission()
  const [aRenvoyer, definirARenvoyer] = useState<MessageSms | null>(null)
  const [message, definirMessage] = useState<MessageEcran | null>(null)

  const changerFiltre = (changement: Partial<Filtre>) => definirFiltre((f) => ({ ...f, ...changement, avantId: null }))

  const ouvrir = (sms: MessageSms | null) => {
    s.reinitialiser()
    definirARenvoyer(sms)
  }

  const renvoyer = async () => {
    if (aRenvoyer === null) return
    const reponse = await s.soumettre<{ message_sms: MessageSms }>(`/api/messages-sms/${aRenvoyer.id}/renvoi`, {})
    if (reponse === null) return
    definirMessage({ texte: t.renvoiFait.replace('{numero}', String(reponse.message_sms.ticket.numero)), type: 'ok' })
    ouvrir(null)
    await journal.recharger()
  }

  const messages = journal.donnees ?? []
  const suivante = pageSuivante(messages)

  const colonnes: Colonne<MessageSms>[] = [
    { cle: 'cree', titre: t.colonnes.cree, rendu: (sms) => <span className="chiffres">{formaterHorodatage(sms.cree_le)}</span> },
    { cle: 'ticket', titre: t.colonnes.ticket, rendu: (sms) => <><span className="chiffres">{sms.ticket.numero}</span> <span className="bureau-discret">{t.types[sms.type]}</span></> },
    { cle: 'apporteur', titre: t.colonnes.apporteur, rendu: (sms) => sms.apporteur.nom },
    { cle: 'telephone', titre: t.colonnes.telephone, rendu: (sms) => <span className="chiffres">{sms.telephone}</span> },
    { cle: 'message', titre: t.colonnes.message, rendu: (sms) => <span lang="ar" dir="rtl" className="texte-arabe">{sms.corps}</span> },
    {
      cle: 'etat', titre: t.colonnes.etat, rendu: (sms) => (
        <>
          <Pastille ton={TONS[sms.statut]}>{t.statuts[sms.statut]}</Pastille>
          <div className="bureau-discret">{suite(sms)}</div>
        </>
      ),
    },
    { cle: 'essais', titre: t.colonnes.essais, rendu: (sms) => sms.essais, nombre: true },
    { cle: 'renvois', titre: t.colonnes.renvois, rendu: (sms) => sms.renvois, nombre: true },
    { cle: 'erreur', titre: t.colonnes.erreur, rendu: (sms) => sms.derniere_erreur ?? '' },
    {
      cle: 'actions', titre: t.colonnes.actions, rendu: (sms) => peutRenvoyer(sms) && aRenvoyer === null && (
        <button type="button" className="bouton-secondaire" onClick={() => ouvrir(sms)}>{t.renvoyer}</button>
      ),
    },
  ]

  return (
    <section>
      <EnTeteEcran titre={libelles.ecrans.journalSms} message={message} />
      <div className="mes-page bureau-page">
        {envoi.donnees?.attente && <Note ton="alerte">{t.attente.replace('{raison}', envoi.donnees.attente)}</Note>}

        <Panneau titre={t.titre} icone="message-square" compte={journal.donnees?.length} serre>
          <div className="bureau-outils">
            <ChampChoix
              id="filtre-statut"
              libelle={t.filtreStatut}
              valeur={filtre.statut}
              surChangement={(v) => changerFiltre({ statut: v as Filtre['statut'] })}
              options={STATUTS.map((statut) => ({ valeur: statut, libelle: t.statuts[statut] }))}
              choixVide={t.tous}
            />
            <Champ id="filtre-reception" libelle={t.filtreReception} valeur={filtre.reception} surChangement={(v) => changerFiltre({ reception: v })} inputMode="numeric" />
          </div>
          <TableauDonnees
            legende={t.legende}
            colonnes={colonnes}
            lignes={journal.donnees ?? (journal.erreur === null ? null : [])}
            cleLigne={(sms) => sms.id}
            vide={t.aucun}
            erreur={journal.erreur}
            classeLigne={(sms) => (sms.statut === 'echec' ? 'bureau-ligne-echec' : undefined)}
          />
          {(filtre.avantId !== null || suivante !== null) && (
            <div className="bureau-actions bureau-pages">
              {filtre.avantId !== null && (
                <button type="button" className="bouton-secondaire" onClick={() => changerFiltre({})}>{t.plusRecents}</button>
              )}
              {suivante !== null && (
                <button type="button" className="bouton-secondaire" onClick={() => definirFiltre((f) => ({ ...f, avantId: suivante }))}>{t.plusAnciens}</button>
              )}
            </div>
          )}
        </Panneau>
      </div>

      {aRenvoyer !== null && (
        <TiroirConfirmation
          titre={t.titreRenvoi.replace('{numero}', String(aRenvoyer.ticket.numero))}
          consequence={t.consequenceRenvoi.replace('{telephone}', aRenvoyer.telephone)}
          etiquette={t.confirmerRenvoi}
          enCours={s.enCours}
          erreur={s.erreur}
          surValider={() => void renvoyer()}
          surAnnuler={() => ouvrir(null)}
        />
      )}
    </section>
  )
}
