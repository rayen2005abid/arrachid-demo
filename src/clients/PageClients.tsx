// Clients (CONTEXTE §21.1 ; CLI-01), sur le modèle de l'écran des apporteurs : table complète filtrée
// en tapant à gauche, fiche à droite ; création, modification et activation dans un tiroir.
import { useState } from 'react'
import { useDiffere } from '../api/useDiffere'
import { useLecture } from '../api/useLecture'
import { useSoumission } from '../api/useSoumission'
import { Chronologie, EtatActif } from '../administration/composants'
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
import { formaterHorodatage } from '../format/dates'
import { libelles } from '../libelles'
import '../styles/pont.css'
import {
  cheminDoublons, cheminListe, corpsActivation, corpsCreation, corpsModification, filtrerClients, formulaireDe, FORMULAIRE_VIDE, texteRaisons,
  type Client, type Erreurs, type Formulaire, type RegimeTva, type Suggestion,
} from './logique'

const t = libelles.clients
const a = libelles.administration
const DELAI_FRAPPE_MS = 250
const REGIMES: readonly RegimeTva[] = ['normal', 'suspension', 'export']

type Mode =
  | { type: 'creation' }
  | { type: 'modification'; client: Client }
  | { type: 'activation'; client: Client }
  | null

const identifiant = (c: Client) => c.matricule_fiscal ?? c.cin ?? c.cin_masquee ?? '—'

const COLONNES: Colonne<Client>[] = [
  { cle: 'nom', titre: t.nom, rendu: (c) => c.nom },
  { cle: 'type', titre: t.type, rendu: (c) => t.types[c.type_client] },
  { cle: 'identifiant', titre: t.identifiant, rendu: (c) => <span className="chiffres">{identifiant(c)}</span> },
  { cle: 'telephone', titre: t.telephone, rendu: (c) => <span className="chiffres">{c.telephone ?? '—'}</span> },
  { cle: 'regime', titre: t.regime, rendu: (c) => t.regimes[c.regime_tva] },
  { cle: 'etat', titre: a.etat, rendu: (c) => <EtatActif actif={c.actif} /> },
]

/** Clients (CONTEXTE §21.1) : table complète, création avec doublons, modification, régime de TVA. */
export function PageClients() {
  const { utilisateur, permissions } = useSessionOuverte()
  const choisitRegime = utilisateur.role === 'responsable' || utilisateur.role === 'proprietaire'
  const voirHistorique = permissions.includes('voir_cin_complete')
  const [saisie, definirSaisie] = useState('')
  const [inactifs, definirInactifs] = useState(false)
  const tous = useLecture<Client[]>(cheminListe(inactifs))
  const s = useSoumission()
  const [mode, definirMode] = useState<Mode>(null)
  const [choisi, definirChoisi] = useState<number | null>(null)
  const [formulaire, definirFormulaire] = useState<Formulaire>(FORMULAIRE_VIDE)
  const [motif, definirMotif] = useState('')
  const [erreurs, definirErreurs] = useState<Erreurs>({})
  const pourDoublons = useDiffere(formulaire, DELAI_FRAPPE_MS)
  const saufId = mode !== null && mode.type !== 'creation' ? mode.client.id : undefined
  const cheminSuggestions = mode === null || mode.type === 'activation' ? null : cheminDoublons(pourDoublons, saufId)
  const doublons = useLecture<Suggestion[]>(cheminSuggestions)

  const ouvrir = (suivant: Mode) => {
    s.reinitialiser()
    definirFormulaire(suivant !== null && suivant.type !== 'creation' ? formulaireDe(suivant.client) : FORMULAIRE_VIDE)
    definirMotif('')
    definirErreurs({})
    definirMode(suivant)
  }
  const changer = (cle: keyof Formulaire) => (valeur: string) => {
    s.reinitialiser()
    definirFormulaire((f) => ({ ...f, [cle]: valeur }))
  }

  const valider = async () => {
    if (mode === null || s.enCours) return
    const r = mode.type === 'creation' ? corpsCreation(formulaire)
      : mode.type === 'modification' ? corpsModification(mode.client, formulaire, motif)
        : corpsActivation(!mode.client.actif, motif)
    definirErreurs(r.erreurs)
    if (r.corps === null) return
    const chemin = mode.type === 'creation' ? '/api/clients' : `/api/clients/${mode.client.id}/modification`
    const reponse = await s.soumettre<{ client: Client }>(chemin, r.corps)
    if (reponse === null) return
    ouvrir(null)
    // Un client désactivé quitte la table : la case le garde visible pour pouvoir le réactiver.
    if (!reponse.client.actif) definirInactifs(true)
    definirSaisie(reponse.client.nom)
    definirChoisi(reponse.client.id)
    await tous.recharger()
  }

  const regimeModifiable = mode?.type === 'creation' ? choisitRegime : mode?.type === 'modification' && mode.client.actions_possibles.includes('changer_regime_tva')
  const cinMasque = mode?.type === 'modification' && mode.client.cin === undefined ? mode.client.cin_masquee : null
  // useLecture garde sa dernière réponse quand il n'y a plus rien à chercher : ne pas l'afficher.
  const suggestions = cheminSuggestions !== null ? (doublons.donnees ?? []) : []
  const liste = tous.donnees === null ? null : filtrerClients(tous.donnees, saisie)
  const client = liste?.find((c) => c.id === choisi) ?? null
  const titre = mode === null ? '' : mode.type === 'creation' ? t.nouveau
    : `${mode.type === 'modification' ? t.titreModification : mode.client.actif ? t.titreDesactivation : t.titreReactivation} — ${mode.client.nom}`
  const actions = client === null ? [] : client.actions_possibles.filter((x) => x === 'modifier' || x === 'desactiver' || x === 'reactiver')

  return (
    <section>
      <EnTeteEcran titre={libelles.ecrans.clients} sousTitre={t.sousTitre} principal={{ etiquette: t.nouveau, surClic: () => ouvrir({ type: 'creation' }) }} />
      <div className="mes-page">
        <ListeDetail
          liste={
            <Panneau titre={libelles.ecrans.clients} icone="contact" compte={liste?.length} serre>
              <div className="reception-recherche">
                <Champ id="recherche" libelle={t.recherche} aide={t.rechercheAide} valeur={saisie} surChangement={definirSaisie} autoFocus={mode === null} />
                <label className="mes-case">
                  <input type="checkbox" checked={inactifs} onChange={(e) => definirInactifs(e.target.checked)} />
                  {t.inactifs}
                </label>
              </div>
              <TableauDonnees
                legende={t.legende}
                colonnes={COLONNES}
                lignes={liste}
                cleLigne={(c) => c.id}
                vide={t.aucunResultat}
                erreur={tous.erreur}
                surChoisir={(c) => definirChoisi(c.id)}
                choisie={choisi}
              />
            </Panneau>
          }
          detail={
            client === null ? (
              <Panneau titre={t.fiche} icone="contact">
                <EtatVide message={t.choisir} />
              </Panneau>
            ) : (
              <Panneau
                titre={client.nom}
                icone="contact"
                actions={
                  actions.length > 0 ? (
                    <>
                      {actions.map((action) => (
                        <button
                          key={action}
                          type="button"
                          className="bouton-secondaire bouton-petit"
                          onClick={() => ouvrir(action === 'modifier' ? { type: 'modification', client } : { type: 'activation', client })}
                        >
                          <Icone nom={action === 'modifier' ? 'file-pen' : action === 'reactiver' ? 'check' : 'x'} />
                          {a.actionsLibelles[action]}
                        </button>
                      ))}
                    </>
                  ) : undefined
                }
              >
                <Chiffres
                  valeurs={[
                    { etiquette: t.type, valeur: t.types[client.type_client], texte: true },
                    { etiquette: t.identifiant, valeur: identifiant(client) },
                    { etiquette: t.telephone, valeur: client.telephone ?? '—' },
                  ]}
                />
                <Chiffres
                  valeurs={[
                    { etiquette: t.regime, valeur: t.regimes[client.regime_tva], texte: true },
                    { etiquette: t.adresse, valeur: client.adresse ?? '—', texte: true },
                    { etiquette: t.creeLe, valeur: formaterHorodatage(client.cree_le) },
                  ]}
                />
                <p><EtatActif actif={client.actif} /></p>
                {voirHistorique && (
                  <details className="mes-historique">
                    <summary>{t.historique}</summary>
                    <Chronologie key={client.id} table="client" ligneId={client.id} />
                  </details>
                )}
              </Panneau>
            )
          }
        />
      </div>

      {mode !== null && (
        <Tiroir
          key={mode.type === 'creation' ? 'creation' : `${mode.type}-${mode.client.id}`}
          titre={titre}
          icone="contact"
          etiquette={mode.type === 'creation' ? t.creer : mode.type === 'modification' ? t.modifier : mode.client.actif ? t.desactiver : t.reactiver}
          surValider={() => void valider()}
          surFermer={() => ouvrir(null)}
          enCours={s.enCours}
          erreur={s.erreur}
          consequence={mode.type === 'creation' ? t.consequenceCreation : mode.type === 'modification' ? t.consequenceModification : mode.client.actif ? t.consequenceDesactivation : t.consequenceReactivation}
        >
          {mode.type !== 'activation' && <>
            <ChampChoix
              id="type_client"
              libelle={t.type}
              valeur={formulaire.type_client}
              surChangement={(v) => changer('type_client')(v === 'personne' ? 'personne' : 'societe')}
              options={(['societe', 'personne'] as const).map((v) => ({ valeur: v, libelle: t.types[v] }))}
            />
            <Champ id="nom" libelle={t.nom} valeur={formulaire.nom} surChangement={changer('nom')} erreur={erreurs.nom} requis autoFocus />
            <Champ id="matricule_fiscal" libelle={t.matricule} valeur={formulaire.matricule_fiscal} surChangement={changer('matricule_fiscal')} erreur={erreurs.matricule_fiscal} chiffres />
            <Champ id="cin" libelle={t.cin} valeur={formulaire.cin} surChangement={changer('cin')} erreur={erreurs.cin} inputMode="numeric" chiffres
              aide={cinMasque !== null ? t.cinMasque.replace('{cin}', cinMasque) : t.identifiantAide} />
            <Champ id="telephone" libelle={t.telephone} aide={t.telephoneAide} valeur={formulaire.telephone} surChangement={changer('telephone')} inputMode="tel" chiffres />
            <Champ id="adresse" libelle={t.adresse} valeur={formulaire.adresse} surChangement={changer('adresse')} />
            {regimeModifiable
              ? <ChampChoix id="regime_tva" libelle={t.regime} valeur={formulaire.regime_tva} surChangement={(v) => changer('regime_tva')(v || 'normal')}
                options={REGIMES.map((r) => ({ valeur: r, libelle: t.regimes[r] }))} />
              : <Note>{t.regimeReserve.replace('{regime}', t.regimes[formulaire.regime_tva])}</Note>}
          </>}
          {mode.type !== 'creation' && <Champ id="motif" libelle={t.motif} valeur={motif} surChangement={definirMotif} erreur={erreurs.motif} requis autoFocus={mode.type === 'activation'} />}
          {suggestions.length > 0 && (
            <Note ton="alerte" vivante>
              <p><strong>{t.suggestions}</strong> {mode.type === 'creation' && t.suggestionsAide}</p>
              <ul className="reception-suggestions">
                {suggestions.map((sug) => <li key={sug.id}>{sug.nom} — {sug.matricule_fiscal ?? sug.cin ?? sug.cin_masquee} ({texteRaisons(sug)})</li>)}
              </ul>
            </Note>
          )}
        </Tiroir>
      )}
    </section>
  )
}
