import { useState } from 'react'
import { useLecture } from '../api/useLecture'
import { useSoumission } from '../api/useSoumission'
import { ChampApporteur } from '../apporteurs/ChampApporteur'
import type { Apporteur } from '../apporteurs/logique'
import { Champ, Choix } from '../administration/composants'
import { type MessageEcran } from '../composants/EnTeteEcran'
import { Note } from '../composants/Note'
import { Pastille } from '../composants/Pastille'
import { libelles } from '../libelles'
import { CadreFiche, Case, FichesRecentes, Heure, PageFichePapier, PartieFiche } from './composantsFiche'
import { construireCorpsReception, type SaisieReception } from './logique'

const t = libelles.saisieDifferee
const FORMULAIRE = 'formulaire-fiche-rec'

interface Preparation {
  utilisateurs: { id: number; nom: string }[]
  bacs: { numero: number; libelle: string }[]
}
interface Fiche { id: number; numero_papier: string; horodatage_metier: string; reception_numero: number | null }
interface Resultat { reception: { id: number; numero: number }; fiche_papier: { id: number } }

function vide(): SaisieReception {
  return {
    numeroPapier: '', heure: '', apporteurId: '', nouvelApporteur: false,
    nouveauType: 'personne', nouveauNom: '', nouveauCin: '', nouveauMatricule: '',
    nouveauTelephone: '', nouveauLocalite: '', confirmerTelephone: false,
    cinDe: 'apporteur', cinPresentee: '',
    immatriculation: '', regime: 'achat', modePartage: 'huile_kg', valeurPartage: '',
    brut: '', tare: '', bacs: '', brutLe: '', dechargementLe: '', tareLe: '',
    operateurBrut: '', operateurDechargement: '', operateurTare: '', observations: '', vidages: {},
  }
}

/** Reprise de la fiche REC : ses faits sont enregistrés à l'heure d'origine sans envoi externe. */
export function PageSaisieDifferee() {
  const [saisie, definirSaisie] = useState<SaisieReception>(vide)
  const [erreurLocale, definirErreurLocale] = useState<string | null>(null)
  const [message, definirMessage] = useState<MessageEcran | null>(null)
  const soumission = useSoumission()
  const preparation = useLecture<Preparation>('/api/saisie-differee/receptions/preparation')
  const fiches = useLecture<Fiche[]>('/api/saisie-differee/receptions')
  const [choisi, definirChoisi] = useState<Apporteur | null>(null)

  const changer = <K extends keyof SaisieReception>(cle: K, valeur: SaisieReception[K]) => {
    definirSaisie((avant) => ({ ...avant, [cle]: valeur }))
    definirErreurLocale(null)
    soumission.reinitialiser()
  }
  const changerVidage = (numero: number, cle: 'heure' | 'operateur', valeur: string) => {
    definirSaisie((avant) => ({ ...avant, vidages: { ...avant.vidages, [numero]: { heure: avant.vidages[numero]?.heure ?? '', operateur: avant.vidages[numero]?.operateur ?? '', [cle]: valeur } } }))
    soumission.reinitialiser()
  }
  const optionsOperateurs = (preparation.donnees?.utilisateurs ?? []).map((u) => ({ valeur: String(u.id), libelle: u.nom }))
  const bacsSaisis = [...new Set(saisie.bacs.split(/[\s,;]+/).map(Number).filter((n) => Number.isSafeInteger(n) && n > 0))]

  const enregistrer = async () => {
    const resultat = construireCorpsReception(saisie)
    definirErreurLocale(resultat.erreur)
    if (resultat.corps === null) return
    const reponse = await soumission.soumettre<Resultat>('/api/saisie-differee/receptions', resultat.corps)
    if (reponse === null) {
      await fiches.recharger()
      return
    }
    definirMessage({ texte: t.succes.replace('{numero}', String(reponse.reception.numero)), type: 'ok' })
    definirSaisie(vide())
    definirChoisi(null)
    soumission.reinitialiser()
    await fiches.recharger()
  }

  const resultat = (fiche: Fiche) => fiche.reception_numero === null
    ? <Pastille ton="alerte">{t.enAttente}</Pastille>
    : <Pastille ton="ok">{t.reception.replace('{numero}', String(fiche.reception_numero))}</Pastille>

  return (
    <PageFichePapier
      titre={t.titre}
      message={message}
      principal={{ etiquette: t.enregistrer, formulaire: FORMULAIRE, enCours: soumission.enCours }}
      aide={<><p>{t.aide}</p><p>{t.retour}</p></>}
      erreur={preparation.erreur}
      recentes={<FichesRecentes fiches={fiches.donnees} erreur={fiches.erreur} resultat={resultat} vide={t.aucun} />}
    >
      <form id={FORMULAIRE} onSubmit={(e) => { e.preventDefault(); void enregistrer() }}>
        <CadreFiche titre={t.titreFiche} icone="scale">
          <PartieFiche>
            <Champ id="numero-papier" libelle={t.numero} valeur={saisie.numeroPapier} surChangement={(v) => changer('numeroPapier', v)} autoFocus />
            <Heure id="heure-papier" libelle={t.heure} valeur={saisie.heure} surChangement={(v) => changer('heure', v)} />
          </PartieFiche>
          <PartieFiche titre={t.titreApporteur}>
            <Case libelle={t.nouveau} coche={saisie.nouvelApporteur} surChangement={(v) => changer('nouvelApporteur', v)} />
            {saisie.nouvelApporteur ? <>
              <Choix id="nouveau-type-papier" libelle={t.nouveauType} valeur={saisie.nouveauType} surChangement={(v) => changer('nouveauType', v as SaisieReception['nouveauType'])} options={[{ valeur: 'personne', libelle: t.apporteurChoix }, { valeur: 'societe', libelle: t.societeChoix }]} />
              <Champ id="nouveau-nom-papier" libelle={t.nouveauNom} valeur={saisie.nouveauNom} surChangement={(v) => changer('nouveauNom', v)} />
              {saisie.nouveauType === 'personne'
                ? <Champ id="nouveau-cin-papier" libelle={t.nouveauCin} valeur={saisie.nouveauCin} surChangement={(v) => changer('nouveauCin', v)} />
                : <Champ id="nouveau-mf-papier" libelle={t.nouveauMatricule} valeur={saisie.nouveauMatricule} surChangement={(v) => changer('nouveauMatricule', v)} />}
              <Champ id="nouveau-tel-papier" libelle={t.nouveauTelephone} valeur={saisie.nouveauTelephone} surChangement={(v) => changer('nouveauTelephone', v)} inputMode="tel" />
              <Champ id="nouveau-localite-papier" libelle={t.nouveauLocalite} valeur={saisie.nouveauLocalite} surChangement={(v) => changer('nouveauLocalite', v)} />
              {soumission.code === 'telephone_deja_utilise' && <Case libelle={t.confirmerTelephone} coche={saisie.confirmerTelephone} surChangement={(v) => changer('confirmerTelephone', v)} />}
            </> : (
              <ChampApporteur id="apporteur-papier" libelle={t.apporteur} aide={t.rechercher} valeur={choisi} surChoix={(a) => { definirChoisi(a); changer('apporteurId', a === null ? '' : String(a.id)) }} />
            )}
            <Choix id="cin-de-papier" libelle={t.cinDe} valeur={saisie.cinDe} surChangement={(v) => changer('cinDe', v as SaisieReception['cinDe'])} options={[{ valeur: 'apporteur', libelle: t.apporteurChoix }, { valeur: 'conducteur', libelle: t.conducteurChoix }]} />
            <Champ id="cin-papier" libelle={t.cinPresentee} valeur={saisie.cinPresentee} surChangement={(v) => changer('cinPresentee', v)} />
            <Champ id="plaque-papier" libelle={t.plaque} valeur={saisie.immatriculation} surChangement={(v) => changer('immatriculation', v)} />
            <Choix id="regime-papier" libelle={t.regime} valeur={saisie.regime} surChangement={(v) => changer('regime', v as SaisieReception['regime'])} options={[{ valeur: 'achat', libelle: t.achat }, { valeur: 'facon', libelle: t.facon }, { valeur: 'mixte', libelle: t.mixte }]} />
            {saisie.regime === 'mixte' && <>
              <Choix id="mode-papier" libelle={t.mixteMode} valeur={saisie.modePartage} surChangement={(v) => changer('modePartage', v as SaisieReception['modePartage'])} options={[{ valeur: 'huile_kg', libelle: t.huileFixe }, { valeur: 'pourcentage', libelle: t.pourcentage }]} />
              <Champ id="valeur-papier" libelle={t.mixteValeur} valeur={saisie.valeurPartage} surChangement={(v) => changer('valeurPartage', v)} inputMode="decimal" />
            </>}
          </PartieFiche>
          <PartieFiche titre={t.titrePesees}>
            <Champ id="brut-papier" libelle={t.brut} valeur={saisie.brut} surChangement={(v) => changer('brut', v)} inputMode="numeric" />
            <Champ id="bacs-papier" libelle={t.bacs} valeur={saisie.bacs} surChangement={(v) => changer('bacs', v)} />
            <Champ id="tare-papier" libelle={t.tare} valeur={saisie.tare} surChangement={(v) => changer('tare', v)} inputMode="numeric" />
          </PartieFiche>
          <PartieFiche titre={t.titreHeures}>
            <Heure id="brut-le-papier" libelle={t.heureBrut} valeur={saisie.brutLe} surChangement={(v) => changer('brutLe', v)} />
            <Heure id="dechargement-le-papier" libelle={t.heureDechargement} valeur={saisie.dechargementLe} surChangement={(v) => changer('dechargementLe', v)} />
            <Heure id="tare-le-papier" libelle={t.heureTare} valeur={saisie.tareLe} surChangement={(v) => changer('tareLe', v)} />
            <Choix id="operateur-brut-papier" libelle={t.operateurBrut} valeur={saisie.operateurBrut} surChangement={(v) => changer('operateurBrut', v)} options={optionsOperateurs} />
            <Choix id="operateur-dechargement-papier" libelle={t.operateurDechargement} valeur={saisie.operateurDechargement} surChangement={(v) => changer('operateurDechargement', v)} options={optionsOperateurs} />
            <Choix id="operateur-tare-papier" libelle={t.operateurTare} valeur={saisie.operateurTare} surChangement={(v) => changer('operateurTare', v)} options={optionsOperateurs} />
          </PartieFiche>
          <p className="mes-champ-aide">{t.dateAide} {t.operateurAide}</p>
          {bacsSaisis.map((numero) => (
            <PartieFiche key={numero} titre={`${t.bac} ${numero}`}>
              <Heure id={`vidage-${numero}`} libelle={t.heureVidage} valeur={saisie.vidages[numero]?.heure ?? ''} surChangement={(v) => changerVidage(numero, 'heure', v)} />
              <Choix id={`operateur-vidage-${numero}`} libelle={t.operateurVidage} valeur={saisie.vidages[numero]?.operateur ?? ''} surChangement={(v) => changerVidage(numero, 'operateur', v)} options={optionsOperateurs} />
            </PartieFiche>
          ))}
          <PartieFiche>
            <Champ id="observations-papier" libelle={t.observations} valeur={saisie.observations} surChangement={(v) => changer('observations', v)} />
          </PartieFiche>
          {(erreurLocale ?? soumission.erreur) !== null && <Note ton="erreur">{erreurLocale ?? soumission.erreur}</Note>}
        </CadreFiche>
      </form>
    </PageFichePapier>
  )
}
