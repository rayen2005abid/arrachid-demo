// Apporteurs (CONTEXTE §6, PROMPT §6.20.4 ; APP-01), refait en Session 4 sur prototype/arrachid-mes.html : recherche
// et apporteurs trouvés à gauche, fiche à droite ; création (F8) et modification dans un tiroir, avec les doublons.
import { useState } from 'react'
import { useDiffere } from '../api/useDiffere'
import { Chronologie } from '../administration/composants'
import { useLecture } from '../api/useLecture'
import { useSoumission } from '../api/useSoumission'
import { Champ, ChampChoix } from '../composants/Champ'
import { Chiffres } from '../composants/Chiffres'
import { EnTeteEcran } from '../composants/EnTeteEcran'
import { EtatVide } from '../composants/EtatVide'
import { Icone } from '../composants/Icone'
import { ListeDetail } from '../composants/ListeDetail'
import { Note } from '../composants/Note'
import { Panneau } from '../composants/Panneau'
import { TableauDonnees, type Colonne } from '../composants/TableauDonnees'
import { Tiroir } from '../composants/Tiroir'
import { useSessionOuverte } from '../contextes/session'
import { afficherMillimes } from '../format/montants'
import { texteSolde, type CompteResume, type ListeComptes } from '../comptes/comptes'
import { formaterHorodatage } from '../format/dates'
import { libelles } from '../libelles'
import { useConfirmationDoublons } from './useConfirmationDoublons'
import {
  cheminDoublons,
  filtrerApporteurs,
  corpsCreation,
  corpsModification,
  formulaireDe,
  FORMULAIRE_VIDE,
  identite,
  texteRaisons,
  type Apporteur,
  type Erreurs,
  type Formulaire,
  type Suggestion,
} from './logique'
import '../styles/pont.css'

const t = libelles.apporteurs
const DELAI_FRAPPE_MS = 250

type Mode = { type: 'creation' } | { type: 'modification'; apporteur: Apporteur } | null

function colonnes(soldes: ReadonlyMap<number, CompteResume> | null): Colonne<Apporteur>[] {
  const base: Colonne<Apporteur>[] = [
  { cle: 'nom', titre: t.nom, rendu: (a) => a.nom },
  { cle: 'type', titre: t.type, rendu: (a) => t.types[a.type_apporteur] },
  { cle: 'identite', titre: t.colonneIdentite, rendu: (a) => <span className="chiffres">{identite(a)}</span> },
  { cle: 'telephone', titre: t.telephone, rendu: (a) => <span className="chiffres">{a.telephone}</span> },
  { cle: 'localite', titre: t.localite, rendu: (a) => a.localite ?? '—' },
  ]
  if (soldes === null) return base
  return [
    ...base,
    {
      cle: 'solde',
      titre: t.solde,
      nombre: true,
      rendu: (a) => {
        const c = soldes.get(a.id)
        return c === undefined || c.solde_millimes === 0 ? '—' : `${c.solde_millimes > 0 ? '+' : '−'}${afficherMillimes(Math.abs(c.solde_millimes))}`
      },
    },
  ]
}

/** Apporteurs (CONTEXTE §6, PROMPT §6.20.4) : recherche, création avec doublons, modification. */
export function PageApporteurs() {
  const [saisie, definirSaisie] = useState('')
  const { permissions } = useSessionOuverte()
  const voirFinances = permissions.includes('voir_finances')
  const voirHistorique = permissions.includes('voir_cin_complete')
  const tous = useLecture<Apporteur[]>('/api/apporteurs')
  const comptes = useLecture<ListeComptes>(voirFinances ? '/api/comptes/apporteurs' : null)
  const soldes = voirFinances && comptes.donnees !== null ? new Map(comptes.donnees.comptes.map((c) => [c.apporteur_id, c])) : null
  const s = useSoumission()
  const [mode, definirMode] = useState<Mode>(null)
  const [choisi, definirChoisi] = useState<number | null>(null)
  const [formulaire, definirFormulaire] = useState<Formulaire>(FORMULAIRE_VIDE)
  const [motif, definirMotif] = useState('')
  const [confirmerTelephone, definirConfirmerTelephone] = useState(false)
  const [erreurs, definirErreurs] = useState<Erreurs>({})
  const confirmationDoublons = useConfirmationDoublons(formulaire)
  const pourDoublons = useDiffere(formulaire, DELAI_FRAPPE_MS)
  const saufId = mode?.type === 'modification' ? mode.apporteur.id : undefined
  const doublons = useLecture<Suggestion[]>(mode === null ? null : cheminDoublons(pourDoublons, saufId))

  const ouvrir = (suivant: Mode) => {
    s.reinitialiser()
    confirmationDoublons.reinitialiser()
    definirFormulaire(suivant?.type === 'modification' ? formulaireDe(suivant.apporteur) : FORMULAIRE_VIDE)
    definirMotif('')
    definirConfirmerTelephone(false)
    definirErreurs({})
    definirMode(suivant)
  }

  const changer = (cle: keyof Formulaire) => (valeur: string) => {
    confirmationDoublons.reinitialiser()
    s.reinitialiser()
    if (cle === 'telephone') definirConfirmerTelephone(false)
    definirFormulaire((f) => ({ ...f, [cle]: valeur }))
  }

  const valider = async () => {
    if (mode === null || s.enCours || confirmationDoublons.enCours) return
    const r = mode.type === 'creation' ? corpsCreation(formulaire) : corpsModification(mode.apporteur, formulaire, motif)
    definirErreurs(r.erreurs)
    if (r.corps === null) return
    if (mode.type === 'creation' && !await confirmationDoublons.verifier()) return
    const chemin = mode.type === 'creation' ? '/api/apporteurs' : `/api/apporteurs/${mode.apporteur.id}/modification`
    const reponse = await s.soumettre<{ apporteur: Apporteur }>(chemin, { ...r.corps, confirmer_telephone: confirmerTelephone })
    if (reponse === null) return
    ouvrir(null)
    definirSaisie(reponse.apporteur.nom)
    definirChoisi(reponse.apporteur.id)
    await tous.recharger()
    if (voirFinances) await comptes.recharger()
  }

  const cinMasque = mode?.type === 'modification' && mode.apporteur.cin === undefined ? mode.apporteur.cin_masquee : null
  // useLecture garde sa dernière réponse quand il n'y a plus rien à chercher : ne pas l'afficher.
  const suggestions = confirmationDoublons.suggestions.length > 0 ? confirmationDoublons.suggestions : mode !== null && cheminDoublons(pourDoublons, saufId) !== null ? (doublons.donnees ?? []) : []
  const liste = tous.donnees === null ? null : filtrerApporteurs(tous.donnees, saisie)
  const apporteur = liste?.find((a) => a.id === choisi) ?? null
  const compte = apporteur === null ? undefined : soldes?.get(apporteur.id)
  const colonnesTable = colonnes(soldes)

  return (
    <section>
      <EnTeteEcran titre={libelles.ecrans.apporteurs} sousTitre={t.sousTitre} principal={{ etiquette: t.nouveau, surClic: () => ouvrir({ type: 'creation' }) }} />
      <div className="mes-page">
        <ListeDetail
          liste={
            <Panneau titre={libelles.ecrans.apporteurs} icone="contact" compte={liste?.length} serre>
              <div className="reception-recherche">
                <Champ id="recherche" libelle={t.recherche} aide={t.rechercheAide} valeur={saisie} surChangement={definirSaisie} autoFocus={mode === null} />
              </div>
              <TableauDonnees
                legende={t.liste}
                colonnes={colonnesTable}
                lignes={liste}
                cleLigne={(a) => a.id}
                vide={t.aucunResultat}
                erreur={tous.erreur}
                surChoisir={(a) => definirChoisi(a.id)}
                choisie={choisi}
              />
            </Panneau>
          }
          detail={
            apporteur === null ? (
              <Panneau titre={t.fiche} icone="contact">
                <EtatVide message={t.choisir} />
              </Panneau>
            ) : (
              <Panneau
                titre={apporteur.nom}
                icone="contact"
                actions={
                  apporteur.actions_possibles.includes('modifier') ? (
                    <button type="button" className="bouton-secondaire bouton-petit" onClick={() => ouvrir({ type: 'modification', apporteur })}>
                      <Icone nom="file-pen" />
                      {t.actionModifier}
                    </button>
                  ) : undefined
                }
              >
                <Chiffres
                  valeurs={[
                    { etiquette: t.type, valeur: t.types[apporteur.type_apporteur], texte: true },
                    { etiquette: t.colonneIdentite, valeur: identite(apporteur) },
                    { etiquette: t.telephone, valeur: apporteur.telephone },
                  ]}
                />
                <Chiffres
                  valeurs={[
                    { etiquette: t.localite, valeur: apporteur.localite ?? '—', texte: true },
                    { etiquette: t.adresse, valeur: apporteur.adresse ?? '—', texte: true },
                    { etiquette: t.creeLe, valeur: formaterHorodatage(apporteur.cree_le) },
                  ]}
                />
                {soldes !== null && (
                  <Chiffres
                    valeurs={[
                      { etiquette: t.solde, valeur: compte === undefined ? t.sansEcriture : texteSolde(compte.solde_millimes, afficherMillimes), texte: true },
                      { etiquette: t.debit, valeur: compte === undefined ? '—' : afficherMillimes(compte.debit_millimes) },
                      { etiquette: t.credit, valeur: compte === undefined ? '—' : afficherMillimes(compte.credit_millimes) },
                    ]}
                  />
                )}
                {voirHistorique && (
                  <details className="mes-historique">
                    <summary>{t.historique}</summary>
                    <Chronologie key={apporteur.id} table="apporteur" ligneId={apporteur.id} />
                  </details>
                )}
              </Panneau>
            )
          }
        />
      </div>

      {mode !== null && (
        <Tiroir
          key={mode.type === 'creation' ? 'creation' : `modification-${mode.apporteur.id}`}
          titre={mode.type === 'creation' ? t.nouveau : `${t.titreModification} — ${mode.apporteur.nom}`}
          icone="contact"
          etiquette={mode.type === 'creation' ? t.creer : t.modifier}
          surValider={() => void valider()}
          surFermer={() => ouvrir(null)}
          enCours={s.enCours || confirmationDoublons.enCours}
          erreur={confirmationDoublons.erreur ?? s.erreur}
          consequence={mode.type === 'creation' ? t.consequenceCreation : t.consequenceModification}
        >
          <ChampChoix
            id="type_apporteur"
            libelle={t.type}
            valeur={formulaire.type_apporteur}
            surChangement={(v) => changer('type_apporteur')(v === 'societe' ? 'societe' : 'personne')}
            options={(['personne', 'societe'] as const).map((v) => ({ valeur: v, libelle: t.types[v] }))}
          />
          <Champ id="nom" libelle={t.nom} valeur={formulaire.nom} surChangement={changer('nom')} erreur={erreurs.nom} requis autoFocus />
          {formulaire.type_apporteur === 'societe' && (
            <Champ id="matricule_fiscal" libelle={t.matricule} valeur={formulaire.matricule_fiscal} surChangement={changer('matricule_fiscal')} erreur={erreurs.matricule_fiscal} requis chiffres />
          )}
          <Champ
            id="cin"
            libelle={formulaire.type_apporteur === 'societe' ? t.cinRepresentant : t.cin}
            valeur={formulaire.cin}
            surChangement={changer('cin')}
            erreur={erreurs.cin}
            inputMode="numeric"
            chiffres
            aide={cinMasque !== null ? t.cinMasque.replace('{cin}', cinMasque) : undefined}
          />
          <Champ id="telephone" libelle={t.telephone} aide={t.telephoneAide} valeur={formulaire.telephone} surChangement={changer('telephone')} erreur={erreurs.telephone} requis inputMode="tel" chiffres />
          {s.code === 'telephone_deja_utilise' && (
            <label className="mes-case">
              <input type="checkbox" checked={confirmerTelephone} onChange={(e) => definirConfirmerTelephone(e.target.checked)} />
              {t.confirmerTelephone}
            </label>
          )}
          <Champ id="localite" libelle={t.localite} valeur={formulaire.localite} surChangement={changer('localite')} />
          <Champ id="adresse" libelle={t.adresse} valeur={formulaire.adresse} surChangement={changer('adresse')} />
          {mode.type === 'modification' && <Champ id="motif" libelle={t.motif} valeur={motif} surChangement={definirMotif} erreur={erreurs.motif} requis />}
          {suggestions.length > 0 && (
            <Note ton="alerte" vivante>
              <p><strong>{t.suggestions}</strong> {mode.type === 'creation' && t.suggestionsAide}</p>
              <ul className="reception-suggestions">
                {suggestions.map((sug) => (
                  <li key={sug.id}>
                    {sug.nom} — {sug.telephone} — {sug.cin ?? sug.cin_masquee ?? sug.matricule_fiscal} ({texteRaisons(sug)})
                  </li>
                ))}
              </ul>
            </Note>
          )}
          {mode.type === 'creation' && confirmationDoublons.suggestions.length > 0 && (
            <label className="mes-case">
              <input type="checkbox" checked={confirmationDoublons.confirme} onChange={(e) => confirmationDoublons.confirmer(e.target.checked)} />
              {t.autreApporteur}
            </label>
          )}
        </Tiroir>
      )}
    </section>
  )
}
