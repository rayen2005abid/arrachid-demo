import { useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useLecture } from '../api/useLecture'
import { useSoumission } from '../api/useSoumission'
import { basculer, cheminAvances, type LectureAvances, type ModePaiement } from '../caisse/avances'
import { corpsReferences, referencesCompletes, REFERENCES_VIDES, type References } from '../caisse/references'
import { Champ } from '../composants/Champ'
import { ChampsReferences } from '../composants/ChampsReferences'
import { Chiffres } from '../composants/Chiffres'
import { ChoixBoutons } from '../composants/ChoixBoutons'
import { EnTeteEcran, type MessageEcran } from '../composants/EnTeteEcran'
import { EtatVide } from '../composants/EtatVide'
import { Etapes } from '../composants/Etapes'
import { ListeDetail } from '../composants/ListeDetail'
import { Note } from '../composants/Note'
import { Panneau } from '../composants/Panneau'
import { Pastille, type TonPastille } from '../composants/Pastille'
import { Puces } from '../composants/Puces'
import { Recapitulatif } from '../composants/Recapitulatif'
import { TableauDonnees, type Colonne } from '../composants/TableauDonnees'
import { Tiroir } from '../composants/Tiroir'
import { ReleveCompte } from '../comptes/ReleveCompte'
import { VueComptes } from '../comptes/VueComptes'
import { useSessionOuverte } from '../contextes/session'
import { useTouches } from '../contextes/touches'
import { formaterHorodatage } from '../format/dates'
import { afficherMillimes } from '../format/montants'
import { libelles } from '../libelles'
import {
  CHEMIN_DECOMPTES,
  cheminDecompte,
  cheminPdfDecompte,
  cheminPdfRecu,
  compterReceptions,
  emissionReservee,
  etatReception,
  FILTRES_DECOMPTES,
  filtrerReceptions,
  modesPermis,
  rangParcours,
  reglementPossible,
  type Decompte,
  type EtatDecompte,
  type FiltreDecomptes,
  type LigneDecompte,
  type ReceptionDecompte,
} from './logique'
import '../styles/bureau.css'

const t = libelles.decomptes
const PERIODE_MS = 5000
const ADRESSE_RECEPTIONS = '/bureau/decomptes'
const ADRESSE_COMPTES = '/bureau/comptes-apporteurs'
const TONS: Record<EtatDecompte, TonPastille> = { en_attente: 'neutre', a_emettre: 'action', a_regler: 'alerte', soldee: 'ok' }
type Vue = 'receptions' | 'comptes'

/**
 * Décomptes (T-164, A3 et A9) : les décomptes et paiements (DEC-01) et les comptes des apporteurs (CPT-01) sur un seul
 * écran. `/bureau/decomptes` ouvre les réceptions de la campagne ; `/bureau/comptes-apporteurs` ouvre les soldes, avec le
 * choix de la campagne. Les comptes et le relevé n'existent qu'avec `voir_finances` : l'opérateur du bureau ne les voit
 * jamais, et l'écran ne les lit pas pour lui.
 */
export function PageDecomptes() {
  const { pathname } = useLocation()
  const naviguer = useNavigate()
  const { permissions } = useSessionOuverte()
  const voitComptes = permissions.includes('voir_finances')
  const vue: Vue = voitComptes && pathname === ADRESSE_COMPTES ? 'comptes' : 'receptions'
  const liste = useLecture<ReceptionDecompte[]>(CHEMIN_DECOMPTES, PERIODE_MS)
  const nombres = compterReceptions(liste.donnees ?? [])
  const [message, definirMessage] = useState<MessageEcran | null>(null)
  const changerVue = (cible: Vue) => {
    definirMessage(null)
    naviguer(cible === 'comptes' ? ADRESSE_COMPTES : ADRESSE_RECEPTIONS)
  }
  useTouches(voitComptes ? { F6: { libelle: vue === 'comptes' ? t.vues.receptions : t.vues.comptes, action: () => changerVue(vue === 'comptes' ? 'receptions' : 'comptes') } } : {})

  const sousTitre = liste.donnees === null ? undefined : t.sousTitre.replace('{aEmettre}', String(nombres.a_emettre)).replace('{aRegler}', String(nombres.a_regler))
  const choixVue = voitComptes && (
    <Puces
      libelle={t.vues.nom}
      puces={[{ valeur: 'receptions', libelle: t.vues.receptions }, { valeur: 'comptes', libelle: t.vues.comptes }]}
      valeur={vue}
      surChoisir={changerVue}
    />
  )

  if (vue === 'comptes') {
    return (
      <section>
        <EnTeteEcran titre={libelles.onglets.decomptes} sousTitre={sousTitre} message={message} />
        <div className="mes-page bureau-page">
          {choixVue}
          <VueComptes />
        </div>
      </section>
    )
  }
  return <VueReceptions liste={liste} sousTitre={sousTitre} message={message} definirMessage={definirMessage} choixVue={choixVue} voitComptes={voitComptes} />
}

interface PropsReceptions {
  liste: ReturnType<typeof useLecture<ReceptionDecompte[]>>
  sousTitre: string | undefined
  message: MessageEcran | null
  definirMessage: (message: MessageEcran | null) => void
  choixVue: ReactNode
  voitComptes: boolean
}

/** Réceptions de la campagne à gauche ; à droite, la réception choisie, son décompte, son règlement et le relevé. */
function VueReceptions({ liste, sousTitre, message, definirMessage, choixVue, voitComptes }: PropsReceptions) {
  const [filtre, definirFiltre] = useState<FiltreDecomptes>('a_faire')
  const [recherche, definirRecherche] = useState('')
  const [choisi, definirChoisi] = useState<number | null>(null)
  const [deduites, definirDeduites] = useState<number[]>([])
  const [mode, definirMode] = useState<ModePaiement>('especes')
  const [references, definirReferences] = useState<References>(REFERENCES_VIDES)
  const [referencesVerifiees, definirReferencesVerifiees] = useState(false)
  // EM-05 (BH3) : le récapitulatif en lettres s'ouvre avant le F8 qui engage l'argent.
  const [recapitulatif, definirRecapitulatif] = useState(false)
  const [versionReleve, definirVersionReleve] = useState(0)
  // Après une commande réussie, jusqu'à la relecture : F8 ne relance pas la même action sur des données périmées.
  const [actualisation, definirActualisation] = useState(false)
  const emission = useSoumission()
  const paiement = useSoumission()

  const toutes = liste.donnees ?? []
  const nombres = compterReceptions(toutes)
  const lignes = liste.donnees === null ? null : filtrerReceptions(toutes, filtre, recherche)
  // La réception choisie reste affichée même quand elle sort du filtre (réglée, par exemple).
  const reception = toutes.find((l) => l.reception_id === choisi) ?? null
  const etat = reception === null ? null : etatReception(reception)

  const caisse = useLecture<{ session_caisse: { id: number; ouverte_le: string } | null; ouverte_avant_aujourdhui?: boolean }>('/api/caisse/session', PERIODE_MS)
  const cheminLecture = reception?.decompte_id == null ? null : cheminDecompte(reception.decompte_id)
  const lecture = useLecture<{ decompte: Decompte }>(cheminLecture)
  const decompte = cheminLecture !== null && lecture.cheminLu === cheminLecture ? (lecture.donnees?.decompte ?? null) : null
  // CONTEXTE §25.3 : le décompte montre les avances en cours ; le responsable ou le propriétaire décide de les déduire.
  const cheminAvancesApporteur = etat === 'a_emettre' && reception !== null ? cheminAvances(reception.apporteur_id) : null
  const avances = useLecture<LectureAvances>(cheminAvancesApporteur)
  const enCours = cheminAvancesApporteur !== null && avances.cheminLu === cheminAvancesApporteur ? (avances.donnees?.avances ?? []) : []
  const peutImputer = avances.donnees?.actions_possibles.includes('imputer') ?? false
  const reservee = emissionReservee(enCours.length, peutImputer)

  const caisseOuverte = caisse.donnees?.session_caisse != null
  const reglement = decompte === null ? null : reglementPossible(decompte, caisseOuverte)
  const modes = reception === null ? [] : modesPermis(reception.regime)

  const choisir = (ligne: ReceptionDecompte) => {
    if (ligne.reception_id === choisi) return
    definirChoisi(ligne.reception_id)
    definirDeduites([])
    definirMode('especes')
    definirReferences(REFERENCES_VIDES)
    definirReferencesVerifiees(false)
    definirRecapitulatif(false)
    emission.reinitialiser()
    paiement.reinitialiser()
    definirMessage(null)
  }

  const actualiser = async (lectures: Promise<void>[]) => {
    definirActualisation(true)
    try {
      await Promise.all(lectures)
    } finally {
      definirActualisation(false)
    }
  }

  const emettre = async () => {
    if (reception === null || etat !== 'a_emettre' || reservee || emission.enCours || actualisation) return
    const resultat = await emission.soumettre<{ decompte: Decompte }>(CHEMIN_DECOMPTES, { reception_id: reception.reception_id, avances_ids: deduites })
    if (resultat === null) return
    definirMessage({ texte: t.emis.replace('{numero}', String(resultat.decompte.numero)), type: 'ok' })
    definirDeduites([])
    definirVersionReleve((v) => v + 1)
    await actualiser([liste.recharger()])
  }

  const regler = async () => {
    if (decompte === null || reglement !== 'possible' || paiement.enCours || actualisation) return
    const resultat = await paiement.soumettre<{ recu: { id: number; numero: number } | null }>('/api/reglements', {
      decompte_id: decompte.id, mode, ...(decompte.sens_net === 'nul' ? {} : corpsReferences(mode, references)),
    })
    if (resultat === null) return
    definirRecapitulatif(false)
    definirMessage({ texte: resultat.recu === null ? t.solde : t.reglementEnregistre.replace('{numero}', String(resultat.recu.numero)), type: 'ok' })
    definirVersionReleve((v) => v + 1)
    await actualiser([lecture.recharger(), liste.recharger()])
  }

  /** Un solde nul ne déplace aucun argent : il se solde tout de suite ; sinon le récapitulatif s'ouvre d'abord. */
  const demanderReglement = () => {
    if (decompte === null || reglement !== 'possible' || paiement.enCours || actualisation) return
    if (decompte.sens_net === 'nul') {
      void regler()
      return
    }
    if (!referencesCompletes(mode, references)) {
      definirReferencesVerifiees(true)
      return
    }
    paiement.reinitialiser()
    definirRecapitulatif(true)
  }

  // T-202 : avance en cours et opérateur → aucun « Émettre » ; la note du panneau des avances dit pourquoi.
  const principal = recapitulatif ? null
    : etat === 'a_emettre'
      ? (reservee ? null : { etiquette: t.emettre, surClic: () => void emettre(), enCours: emission.enCours || actualisation })
      : decompte !== null && reglement === 'possible'
        ? { etiquette: t.confirmer[decompte.sens_net], surClic: demanderReglement, enCours: paiement.enCours || actualisation }
        : null

  const colonnes: Colonne<ReceptionDecompte>[] = [
    { cle: 'numero', titre: t.colonnes.numero, rendu: (l) => l.reception_numero, nombre: true },
    { cle: 'apporteur', titre: t.colonnes.apporteur, rendu: (l) => l.apporteur },
    { cle: 'regime', titre: t.colonnes.regime, rendu: (l) => t.regimes[l.regime] },
    { cle: 'etat', titre: t.colonnes.etat, rendu: (l) => <Pastille ton={TONS[etatReception(l)]}>{t.etats[etatReception(l)]}</Pastille> },
  ]
  const colonnesLignes: Colonne<LigneDecompte & { rang: number }>[] = [
    { cle: 'libelle', titre: t.colonnesLignes.libelle, rendu: (l) => l.libelle },
    { cle: 'montant', titre: t.colonnesLignes.montant, rendu: (l) => afficherMillimes(l.montant_millimes), nombre: true },
  ]

  const listeReceptions = (
    <Panneau titre={t.titreListe} icone="file-text" compte={lignes?.length} serre>
      <div className="bureau-outils">
        <Champ id="decomptes-recherche" libelle={t.recherche} valeur={recherche} surChangement={definirRecherche} type="search" />
        <Puces
          libelle={t.filtres.nom}
          puces={FILTRES_DECOMPTES.map((valeur) => ({ valeur, libelle: t.filtres[valeur], nombre: liste.donnees === null ? undefined : nombres[valeur] }))}
          valeur={filtre}
          surChoisir={definirFiltre}
        />
      </div>
      <TableauDonnees
        legende={t.legendeListe}
        colonnes={colonnes}
        lignes={lignes}
        cleLigne={(l) => l.reception_id}
        vide={toutes.length === 0 ? t.aucune : t.aucunePourFiltre}
        erreur={liste.erreur}
        surChoisir={choisir}
        choisie={choisi}
      />
    </Panneau>
  )

  const detail = reception === null || etat === null ? (
    <Panneau titre={t.titreDetail} icone="file-text"><EtatVide message={t.choisir} /></Panneau>
  ) : (
    <>
      <Panneau
        titre={t.titreReception.replace('{numero}', String(reception.reception_numero)).replace('{apporteur}', reception.apporteur)}
        icone="file-text"
        actions={<><Pastille>{t.regimes[reception.regime]}</Pastille><Pastille ton={TONS[etat]}>{t.etats[etat]}</Pastille></>}
      >
        <Etapes
          libelle={t.parcours}
          etapes={[
            { cle: 'reception', libelle: t.etapes.reception },
            { cle: 'pret', libelle: reception.regime === 'achat' ? t.etapes.pret_achat : t.etapes.pret_huile },
            { cle: 'decompte', libelle: t.etapes.decompte },
            { cle: 'reglement', libelle: t.etapes.reglement },
          ]}
          rangActuel={rangParcours(reception)}
          bloquee={reglement === 'lot_non_produit'}
        />
        {etat === 'en_attente' && reception.decompte_id === null && <Note>{reception.regime === 'achat' ? t.attente.achat : t.attente.huile}</Note>}
        {etat === 'a_emettre' && <Note>{t.consequenceEmission}</Note>}
        {emission.erreur !== null && <Note ton="erreur">{emission.erreur}</Note>}
      </Panneau>

      {enCours.length > 0 && (
        <Panneau titre={t.avancesTitre.replace('{apporteur}', reception.apporteur)} icone="hand-coins" compte={enCours.length}>
          {!peutImputer && <Note ton="alerte">{t.avancesReservees}</Note>}
          <div className="bureau-cases">
            {enCours.map((a) => (
              <label key={a.id} className="mes-case">
                <input type="checkbox" disabled={!peutImputer} checked={deduites.includes(a.id)}
                  onChange={() => { definirDeduites((d) => basculer(d, a.id)); emission.reinitialiser() }} />
                {t.avanceDeduire.replace('{montant}', afficherMillimes(a.montant_millimes)).replace('{recu}', String(a.recu_numero))}
              </label>
            ))}
          </div>
        </Panneau>
      )}

      {lecture.erreur !== null && cheminLecture !== null && <Note ton="erreur">{lecture.erreur}</Note>}
      {decompte !== null && (
        <Panneau
          titre={t.titreDecompte.replace('{numero}', String(decompte.numero))}
          icone="file-text"
          actions={<a className="bouton-secondaire bouton-petit" href={cheminPdfDecompte(decompte.id)} target="_blank" rel="noreferrer">{t.pdf}</a>}
        >
          <TableauDonnees
            legende={t.legendeLignes.replace('{numero}', String(decompte.numero))}
            colonnes={colonnesLignes}
            lignes={decompte.lignes.map((l, rang) => ({ ...l, rang }))}
            cleLigne={(l) => `${l.type}-${l.rang}`}
            vide=""
          />
          <Chiffres valeurs={[{ etiquette: t.sens[decompte.sens_net], valeur: `${afficherMillimes(decompte.net_millimes)} DT`, ton: 'afficheur' }]} />
          {reglement === 'regle' && (
            <Note ton="ok">
              <p>
                {t.regle}{' '}
                {decompte.recu_id !== null && <a href={cheminPdfRecu(decompte.recu_id)} target="_blank" rel="noreferrer">{t.recuPdf}</a>}
              </p>
            </Note>
          )}
          {reglement === 'lot_non_produit' && <Note ton="alerte">{decompte.attente_reglement ?? t.lotNonProduit}</Note>}
          {reglement === 'caisse_fermee' && (
            <Note ton="alerte">
              <p>{caisse.erreur ?? <>{t.caisseAvant} <Link to="/bureau/caisse">{t.caisseLien}</Link>.</>}</p>
            </Note>
          )}
          {reglement === 'possible' && (
            <>
              {decompte.sens_net !== 'nul' && (
                <ChoixBoutons
                  libelle={t.mode}
                  options={modes.map((valeur) => ({ valeur, libelle: t.modes[valeur] }))}
                  valeur={mode}
                  surChoisir={(valeur) => { definirMode(valeur); definirReferencesVerifiees(false); paiement.reinitialiser() }}
                  aide={reception.regime === 'facon' ? t.seulEspeces : undefined}
                />
              )}
              {decompte.sens_net !== 'nul' && (
                <ChampsReferences
                  id="reglement"
                  mode={mode}
                  valeur={references}
                  surChangement={(v) => { definirReferences(v); paiement.reinitialiser() }}
                  verifier={referencesVerifiees}
                />
              )}
              <Note>{decompte.sens_net === 'nul' ? t.consequenceSoldeNul : t.consequenceReglement}</Note>
            </>
          )}
          {paiement.erreur !== null && !recapitulatif && <Note ton="erreur">{paiement.erreur}</Note>}
        </Panneau>
      )}
      {recapitulatif && decompte !== null && decompte.sens_net !== 'nul' && (
        <Tiroir
          titre={t.titreDecompte.replace('{numero}', String(decompte.numero))}
          icone="wallet"
          etiquette={t.executer[decompte.sens_net]}
          surValider={() => void regler()}
          surFermer={() => { definirRecapitulatif(false); paiement.reinitialiser() }}
          enCours={paiement.enCours || actualisation}
          erreur={paiement.erreur}
          consequence={libelles.recapitulatif.verifiez}
        >
          <Recapitulatif
            libelleMontant={decompte.sens_net === 'a_payer' ? libelles.recapitulatif.sommePayee : libelles.recapitulatif.sommeEncaissee}
            montantMillimes={decompte.net_millimes}
            lignes={[
              { etiquette: libelles.recapitulatif.apporteur, valeur: reception.apporteur },
              { etiquette: libelles.recapitulatif.piece, valeur: t.pieceRecap.replace('{reception}', String(reception.reception_numero)).replace('{decompte}', String(decompte.numero)) },
              { etiquette: libelles.recapitulatif.mode, valeur: t.modes[mode] },
              ...(mode !== 'especes' ? [{ etiquette: libelles.recapitulatif.reference, valeur: `${references.reference.trim()} — ${references.banque.trim()}` }] : []),
            ]}
          />
        </Tiroir>
      )}

      {voitComptes && (
        <ReleveCompte key={`${reception.apporteur_id}-${versionReleve}`} apporteurId={reception.apporteur_id} campagneId={null} nom={reception.apporteur} />
      )}
    </>
  )

  return (
    <section>
      <EnTeteEcran titre={libelles.onglets.decomptes} sousTitre={sousTitre} message={message} principal={principal} />
      <div className="mes-page bureau-page">
        {caisse.donnees?.ouverte_avant_aujourdhui === true && caisse.donnees.session_caisse !== null && (
          <Note ton="alerte">{libelles.caisse.depuisVeille.replace('{date}', formaterHorodatage(caisse.donnees.session_caisse.ouverte_le))}</Note>
        )}
        {choixVue}
        <ListeDetail liste={listeReceptions} detail={detail} listeEtroite />
      </div>
    </section>
  )
}
