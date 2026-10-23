import { useState } from 'react'
import { useDiffere } from '../api/useDiffere'
import { useLecture } from '../api/useLecture'
import { useSoumission } from '../api/useSoumission'
import { Champ, Choix } from '../administration/composants'
import { type MessageEcran } from '../composants/EnTeteEcran'
import { Note } from '../composants/Note'
import { Pastille } from '../composants/Pastille'
import { ValidationPin } from '../composants/ValidationPin'
import { grouperMilliers } from '../format/saisie'
import { CHAMPS_ANALYSE } from '../laboratoire/analyse'
import { libelles } from '../libelles'
import type { Role, Validation } from '../types'
import { CadreFiche, Case, FichesRecentes, Heure, PageFichePapier, PartieFiche } from './composantsFiche'
import { CHEMIN_LABO, construireCorpsLabo, partiesOuvertes, saisieVide, type Decision, type ReceptionFiche, type SaisieLabo } from './logiqueLabo'

const t = libelles.saisieLabo
const FORMULAIRE = 'formulaire-fiche-labo'
const DECISIONS: Exclude<Decision, ''>[] = ['accepte', 'refus_facon', 'refus_retour']

interface Preparation {
  utilisateurs: { id: number; nom: string; role: Role }[]
  varietes: { id: number; libelle: string }[]
}
interface Fiche { id: number; numero_papier: string; horodatage_metier: string; reception_numero: number | null }
interface Resultat { reception: { numero: number }; echantillon: { reference: string } | null }

/** Reprise de la fiche LAB : prélèvement, analyse, décision de prix et destruction, à leur heure d'origine. */
export function PageSaisieLabo() {
  const [saisie, definirSaisie] = useState<SaisieLabo>(saisieVide)
  const [reference, definirReference] = useState('')
  const [validation, definirValidation] = useState<Validation | null>(null)
  const [confirmer, definirConfirmer] = useState(false)
  const [erreurLocale, definirErreurLocale] = useState<string | null>(null)
  const [message, definirMessage] = useState<MessageEcran | null>(null)
  const soumission = useSoumission()
  const preparation = useLecture<Preparation>(`${CHEMIN_LABO}/preparation`)
  const fiches = useLecture<Fiche[]>(CHEMIN_LABO)
  const cherchee = useDiffere(reference.trim(), 300)
  const recherche = useLecture<ReceptionFiche>(cherchee === '' ? null : `${CHEMIN_LABO}/reception?reference=${encodeURIComponent(cherchee)}`)
  // Une recherche en échec garde l'ancienne réponse : elle ne désigne plus la réception tapée.
  const reception = cherchee !== '' && recherche.erreur === null && !recherche.chargement ? recherche.donnees : null
  const ouvertes = reception === null ? null : partiesOuvertes(reception)

  const changer = <K extends keyof SaisieLabo>(cle: K, valeur: SaisieLabo[K]) => {
    definirSaisie((avant) => ({ ...avant, [cle]: valeur }))
    definirErreurLocale(null)
    definirConfirmer(false)
    soumission.reinitialiser()
  }
  const utilisateurs = preparation.donnees?.utilisateurs ?? []
  const auteurs = utilisateurs.map((u) => ({ valeur: String(u.id), libelle: u.nom }))
  const decideurs = utilisateurs.filter((u) => u.role === 'responsable' || u.role === 'proprietaire').map((u) => ({ valeur: String(u.id), libelle: u.nom }))
  const varietes = (preparation.donnees?.varietes ?? []).map((v) => ({ valeur: String(v.id), libelle: v.libelle }))

  const enregistrer = async () => {
    const resultat = construireCorpsLabo(saisie, reception, validation, confirmer)
    definirErreurLocale(resultat.erreur)
    if (resultat.corps === null) return
    const reponse = await soumission.soumettre<Resultat>(CHEMIN_LABO, resultat.corps)
    await fiches.recharger()
    if (reponse === null) return
    const texte = t.succes.replace('{numero}', String(reponse.reception.numero))
    definirMessage({ texte: reponse.echantillon === null ? texte : texte + t.succesReference.replace('{reference}', reponse.echantillon.reference), type: 'ok' })
    definirSaisie(saisieVide())
    definirReference('')
    definirValidation(null)
    definirConfirmer(false)
    soumission.reinitialiser()
  }

  const resultat = (fiche: Fiche) => fiche.reception_numero === null
    ? <Pastille ton="alerte">{t.enAttente}</Pastille>
    : <Pastille ton="ok">{t.reception.replace('{numero}', String(fiche.reception_numero))}</Pastille>

  return (
    <PageFichePapier
      titre={libelles.ecrans.saisieLabo}
      message={message}
      principal={{ etiquette: t.enregistrer, formulaire: FORMULAIRE, enCours: soumission.enCours }}
      aide={t.aide}
      erreur={preparation.erreur}
      recentes={<FichesRecentes fiches={fiches.donnees} erreur={fiches.erreur} resultat={resultat} vide={t.aucun} />}
    >
      <form id={FORMULAIRE} onSubmit={(e) => { e.preventDefault(); void enregistrer() }}>
        <CadreFiche titre={t.titreFiche} icone="flask-conical">
          <PartieFiche>
            <Champ id="numero-fiche-labo" libelle={t.numero} valeur={saisie.numeroPapier} surChangement={(v) => changer('numeroPapier', v)} autoFocus />
            <Heure id="heure-fiche-labo" libelle={t.heure} valeur={saisie.heure} surChangement={(v) => changer('heure', v)} />
            <Champ id="reference-reception" libelle={t.reference} aide={t.referenceAide} valeur={reference} surChangement={(v) => { definirReference(v); definirErreurLocale(null); soumission.reinitialiser() }} />
          </PartieFiche>
          {cherchee !== '' && recherche.erreur !== null && <Note ton="erreur">{t.receptionInconnue}</Note>}
          {reception !== null && <Note ton="ok">{t.receptionTrouvee.replace('{numero}', String(reception.numero)).replace('{apporteur}', reception.apporteur).replace('{regime}', t.regimes[reception.regime]).replace('{net}', reception.net_kg === null ? '—' : grouperMilliers(reception.net_kg))}</Note>}

          {reception !== null && ouvertes !== null && <>
            <p className="mes-champ-aide">{t.auteurAide}</p>
            <PartieFiche titre={t.titreEchantillon}>
              {ouvertes.echantillon ? <>
                <Champ id="emplacement-papier" libelle={t.emplacement} valeur={saisie.emplacement} surChangement={(v) => changer('emplacement', v)} />
                <Choix id="preleve-par-papier" libelle={t.prelevePar} valeur={saisie.prelevePar} surChangement={(v) => changer('prelevePar', v)} options={auteurs} />
              </> : <p className="mes-champ-aide">{t.echantillonDeja.replace('{reference}', reception.echantillon?.reference ?? '')}</p>}
            </PartieFiche>

            <PartieFiche titre={t.titreAnalyse}>
              {ouvertes.analyse ? <>
                <Case libelle={t.avecAnalyse} coche={saisie.avecAnalyse} surChangement={(v) => changer('avecAnalyse', v)} />
                {saisie.avecAnalyse && <>
                  {CHAMPS_ANALYSE.map((champ) => <Champ key={champ} id={`papier-${champ}`} libelle={libelles.labo.analyse.champs[champ]} valeur={saisie.analyse[champ]} surChangement={(v) => changer('analyse', { ...saisie.analyse, [champ]: v })} inputMode="decimal" decimales={2} />)}
                  <Choix id="variete-papier" libelle={libelles.labo.analyse.variete} valeur={saisie.varieteId} surChangement={(v) => changer('varieteId', v)} options={varietes} />
                  <Choix id="operateur-analyse-papier" libelle={t.operateurAnalyse} valeur={saisie.operateurAnalyse} surChangement={(v) => changer('operateurAnalyse', v)} options={auteurs} />
                  {(soumission.code === 'analyse_suspecte' || confirmer) && <Case libelle={t.confirmerValeurs} coche={confirmer} surChangement={(v) => { soumission.reinitialiser(); definirConfirmer(v) }} />}
                </>}
              </> : <p className="mes-champ-aide">{t.analyseDeja}</p>}
            </PartieFiche>

            <PartieFiche titre={t.titrePrix}>
              {ouvertes.prix ? <>
                <Choix id="decision-papier" libelle={t.decision} valeur={saisie.decision} surChangement={(v) => { definirValidation(null); changer('decision', v as Decision) }} options={DECISIONS.map((d) => ({ valeur: d, libelle: t.decisions[d] }))} />
                {saisie.decision === 'accepte' && <Champ id="prix-papier" libelle={t.prix} aide={t.prixAide} valeur={saisie.prix} surChangement={(v) => changer('prix', v)} inputMode="decimal" />}
                {saisie.decision === 'refus_retour' && <Champ id="poids-retour-papier" libelle={t.poidsRetour} valeur={saisie.poidsRetour} surChangement={(v) => changer('poidsRetour', v)} inputMode="numeric" />}
                {(saisie.decision === 'refus_facon' || saisie.decision === 'refus_retour') && <Champ id="motif-papier" libelle={libelles.prix.motif} valeur={saisie.motif} surChangement={(v) => changer('motif', v)} />}
                {saisie.decision !== '' && <>
                  <Heure id="heure-prix-papier" libelle={t.heurePrix} valeur={saisie.heurePrix} surChangement={(v) => changer('heurePrix', v)} />
                  <Choix id="decide-par-papier" libelle={t.decidePar} valeur={saisie.decidePar} surChangement={(v) => changer('decidePar', v)} options={decideurs} />
                  <ValidationPin key={reception.id} surValidation={definirValidation} />
                </>}
              </> : <p className="mes-champ-aide">{t.prixDeja}</p>}
            </PartieFiche>

            <PartieFiche titre={t.titreDestruction}>
              <Case libelle={t.avecDestruction} coche={saisie.avecDestruction} surChangement={(v) => changer('avecDestruction', v)} />
              {saisie.avecDestruction && <>
                <Heure id="heure-destruction-papier" libelle={t.heureDestruction} valeur={saisie.heureDestruction} surChangement={(v) => changer('heureDestruction', v)} />
                <Choix id="detruit-par-papier" libelle={t.detruitPar} valeur={saisie.detruitPar} surChangement={(v) => changer('detruitPar', v)} options={auteurs} />
              </>}
            </PartieFiche>
            <PartieFiche>
              <Champ id="observations-fiche-labo" libelle={t.observations} valeur={saisie.observations} surChangement={(v) => changer('observations', v)} />
            </PartieFiche>
          </>}
          {(erreurLocale ?? soumission.erreur) !== null && <Note ton="erreur">{erreurLocale ?? soumission.erreur}</Note>}
        </CadreFiche>
      </form>
    </PageFichePapier>
  )
}
