import { useState } from 'react'
import { useLecture } from '../api/useLecture'
import { useSoumission } from '../api/useSoumission'
import { Champ, Choix } from '../administration/composants'
import { grammesVersKg } from '../administration/unites'
import { type MessageEcran } from '../composants/EnTeteEcran'
import { Note } from '../composants/Note'
import { ValidationPin } from '../composants/ValidationPin'
import { libelles } from '../libelles'
import type { Validation } from '../types'
import { CadreFiche, Case, EnTeteDeFiche, FichesRecentes, PageFichePapier, PartieFiche } from './composantsFiche'
import { CHEMIN_CUV, OPERATIONS_CUVE, approbationRequise, construireCorpsCuve, optionsAuteurs, saisieCuveVide, type Auteur, type FicheReprise, type OperationCuve, type SaisieCuve } from './logiqueProduction'

const c = libelles.saisieProduction
const t = c.cuv
const FORMULAIRE = 'formulaire-fiche-cuv'

interface Preparation {
  utilisateurs: Auteur[]
  cuves: { id: number; code: string; stock_calcule_g: number }[]
  campagnes_precedentes: { id: number; libelle: string }[]
  transferts_ouverts: boolean
}
interface Resultat { operation: OperationCuve; cuve: { code: string; stock_calcule_g: number }; echantillon_huile?: { reference: string } }

/** Reprise de la fiche CUV : une opération de cuve par fiche, à son heure d'origine. */
export function PageSaisieCuve() {
  const [saisie, definirSaisie] = useState<SaisieCuve>(saisieCuveVide)
  const [validation, definirValidation] = useState<Validation | null>(null)
  const [confirmer, definirConfirmer] = useState(false)
  const [erreurLocale, definirErreurLocale] = useState<string | null>(null)
  const [message, definirMessage] = useState<MessageEcran | null>(null)
  const soumission = useSoumission()
  const preparation = useLecture<Preparation>(`${CHEMIN_CUV}/preparation`)
  const fiches = useLecture<FicheReprise[]>(CHEMIN_CUV)
  const donnees = preparation.donnees

  const changer = <K extends keyof SaisieCuve>(cle: K, valeur: SaisieCuve[K]) => {
    definirSaisie((avant) => ({ ...avant, [cle]: valeur }))
    definirErreurLocale(null)
    definirConfirmer(false)
    soumission.reinitialiser()
  }
  const auteurs = donnees?.utilisateurs ?? []
  const cuves = (donnees?.cuves ?? []).map((cuve) => ({ valeur: String(cuve.id), libelle: t.cuveOption.replace('{code}', cuve.code).replace('{kg}', grammesVersKg(cuve.stock_calcule_g)) }))
  const approuvee = approbationRequise(saisie)

  const enregistrer = async () => {
    const resultat = construireCorpsCuve(saisie, validation, confirmer)
    definirErreurLocale(resultat.erreur)
    if (resultat.corps === null) return
    const reponse = await soumission.soumettre<Resultat>(CHEMIN_CUV, resultat.corps)
    await Promise.all([fiches.recharger(), preparation.recharger()])
    if (reponse === null) return
    const texte = t.succes.replace('{operation}', t.operations[reponse.operation]).replace('{code}', reponse.cuve.code).replace('{kg}', grammesVersKg(reponse.cuve.stock_calcule_g))
    definirMessage({ texte: reponse.echantillon_huile === undefined ? texte : texte + t.succesReference.replace('{reference}', reponse.echantillon_huile.reference), type: 'ok' })
    definirSaisie(saisieCuveVide())
    definirValidation(null)
    definirConfirmer(false)
    soumission.reinitialiser()
  }

  return (
    <PageFichePapier
      titre={libelles.ecrans.saisieCuve}
      message={message}
      principal={{ etiquette: c.enregistrer, formulaire: FORMULAIRE, enCours: soumission.enCours }}
      aide={t.aide}
      erreur={preparation.erreur}
      recentes={<FichesRecentes fiches={fiches.donnees} erreur={fiches.erreur} />}
    >
      <form id={FORMULAIRE} onSubmit={(e) => { e.preventDefault(); void enregistrer() }}>
        <CadreFiche titre={t.titreFiche} icone="cylinder">
          <PartieFiche>
            <EnTeteDeFiche prefixe="cuv" libelleHeure={t.heure} saisie={saisie} auteurs={auteurs} changer={changer} />
            <Choix id="cuve-cuv" libelle={t.cuve} valeur={saisie.cuveId} surChangement={(v) => changer('cuveId', v)} options={cuves} />
            <Choix id="operation-cuv" libelle={t.operation} valeur={saisie.operation} surChangement={(v) => { definirValidation(null); changer('operation', v as SaisieCuve['operation']) }}
              options={OPERATIONS_CUVE.map((operation) => ({ valeur: operation, libelle: t.operations[operation] }))} />
          </PartieFiche>
          <p className="mes-champ-aide">{c.auteurAide}</p>

          {saisie.operation !== '' && (
            <PartieFiche titre={t.operations[saisie.operation]}>
              {saisie.operation === 'purge' && <Champ id="poids-purge-cuv" libelle={t.poidsPurge} valeur={saisie.poids} surChangement={(v) => changer('poids', v)} inputMode="decimal" />}
              {saisie.operation === 'inventaire' && <>
                <Champ id="mesure-cuv" libelle={t.mesure} valeur={saisie.mesure} surChangement={(v) => changer('mesure', v)} inputMode="decimal" />
                <Case libelle={t.ajuster} coche={saisie.ajuster} surChangement={(v) => { definirValidation(null); changer('ajuster', v) }} />
              </>}
              {saisie.operation === 'transfert' && <>
                {donnees?.transferts_ouverts === false && <Note ton="erreur">{t.transfertsFermes}</Note>}
                <Choix id="destination-cuv" libelle={t.destination} valeur={saisie.destinationId} surChangement={(v) => changer('destinationId', v)} options={cuves.filter((cuve) => cuve.valeur !== saisie.cuveId)} />
                <Champ id="poids-transfert-cuv" libelle={t.poidsTransfert} valeur={saisie.poids} surChangement={(v) => changer('poids', v)} inputMode="decimal" />
              </>}
              {saisie.operation === 'echantillon' && <>
                <Champ id="acidite-cuv" libelle={t.acidite} valeur={saisie.acidite} surChangement={(v) => changer('acidite', v)} inputMode="decimal" decimales={2} />
                <Choix id="analyse-par-cuv" libelle={t.analysePar} valeur={saisie.analysePar} surChangement={(v) => changer('analysePar', v)} options={optionsAuteurs(auteurs)} />
                {(soumission.code === 'analyse_suspecte' || confirmer) && <Case libelle={t.confirmerValeurs} coche={confirmer} surChangement={(v) => { soumission.reinitialiser(); definirConfirmer(v) }} />}
              </>}
              {saisie.operation === 'melange' && <Choix id="campagne-cuv" libelle={t.campagne} valeur={saisie.campagneId} surChangement={(v) => changer('campagneId', v)} options={(donnees?.campagnes_precedentes ?? []).map((campagne) => ({ valeur: String(campagne.id), libelle: campagne.libelle }))} />}
            </PartieFiche>
          )}

          {approuvee && (
            <PartieFiche>
              <Champ id="motif-cuv" libelle={c.motif} valeur={saisie.motif} surChangement={(v) => changer('motif', v)} />
              <Choix id="approuve-par-cuv" libelle={t.approuvePar} valeur={saisie.approuvePar} surChangement={(v) => changer('approuvePar', v)} options={optionsAuteurs(auteurs, true)} />
              <ValidationPin key={`${saisie.operation}-${String(saisie.ajuster)}`} surValidation={definirValidation} />
            </PartieFiche>
          )}
          <PartieFiche>
            <Champ id="observations-cuv" libelle={c.observations} valeur={saisie.observations} surChangement={(v) => changer('observations', v)} />
          </PartieFiche>
          {(erreurLocale ?? soumission.erreur) !== null && <Note ton="erreur">{erreurLocale ?? soumission.erreur}</Note>}
        </CadreFiche>
      </form>
    </PageFichePapier>
  )
}
