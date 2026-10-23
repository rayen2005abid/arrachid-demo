import { useState } from 'react'
import { useLecture } from '../api/useLecture'
import { useSoumission } from '../api/useSoumission'
import { Champ, Choix } from '../administration/composants'
import { grammesVersKg } from '../administration/unites'
import { type MessageEcran } from '../composants/EnTeteEcran'
import { Note } from '../composants/Note'
import { ValidationPin } from '../composants/ValidationPin'
import { grouperMilliers } from '../format/saisie'
import { libelles } from '../libelles'
import type { Validation } from '../types'
import { CadreFiche, Case, Cellule, CelluleChoix, EnTeteDeFiche, FichesRecentes, Heure, PageFichePapier, PartieFiche, TableauLignes } from './composantsFiche'
import { CHEMIN_TRI, LOT_VIDE, PESEE_VIDE, construireCorpsTri, saisieTriVide, type Auteur, type FicheReprise, type SaisieTri } from './logiqueProduction'

const c = libelles.saisieProduction
const t = c.tri
const FORMULAIRE = 'formulaire-fiche-tri'
type Regime = 'achat' | 'facon' | 'mixte'

interface LotATriturer { id: number; numero: number; apporteur: string; regime?: Regime; reste_kg: number }
interface Preparation {
  utilisateurs: Auteur[]
  passages: { id: number; numero: number; statut: string; regime: Regime | null }[]
  lignes: { id: number; code: string; libelle: string }[]
  lots_entiers: LotATriturer[]
  lots_achat: LotATriturer[]
  cuves: { id: number; code: string }[]
  tampons: { id: number; code: string }[]
}
interface Resultat { passage: { numero: number }; pesees_huile: { huile_totale_g: number } }

/** Reprise de la fiche TRI : passage, pesées d'huile et fin de production, à leur heure d'origine. */
export function PageSaisieTrituration() {
  const [saisie, definirSaisie] = useState<SaisieTri>(saisieTriVide)
  const [validation, definirValidation] = useState<Validation | null>(null)
  const [erreurLocale, definirErreurLocale] = useState<string | null>(null)
  const [message, definirMessage] = useState<MessageEcran | null>(null)
  const soumission = useSoumission()
  const preparation = useLecture<Preparation>(`${CHEMIN_TRI}/preparation`)
  const fiches = useLecture<FicheReprise[]>(CHEMIN_TRI)
  const donnees = preparation.donnees

  const changer = <K extends keyof SaisieTri>(cle: K, valeur: SaisieTri[K]) => {
    definirSaisie((avant) => ({ ...avant, [cle]: valeur }))
    definirErreurLocale(null)
    soumission.reinitialiser()
  }
  const ligne = <K extends 'lots' | 'pesees'>(cle: K, rang: number, valeurs: Partial<SaisieTri[K][number]>) =>
    changer(cle, saisie[cle].map((ancienne, i) => (i === rang ? { ...ancienne, ...valeurs } : ancienne)) as SaisieTri[K])

  const lots = [...(donnees?.lots_entiers ?? []), ...(donnees?.lots_achat ?? []).map((lot) => ({ ...lot, regime: 'achat' as const }))]
  const passages = (donnees?.passages ?? []).filter((p) => p.statut === 'planifiee' || p.statut === 'en_cours')
  const passage = passages.find((p) => String(p.id) === saisie.passageId) ?? null
  const choisis = saisie.lots.map((l) => lots.find((lot) => String(lot.id) === l.lotId)).filter((lot) => lot !== undefined)
  // L'huile d'un passage d'achat va en cuve, celle d'une façon ou d'un mixte dans un tampon.
  const versCuve = passage !== null ? passage.regime === 'achat' : choisis.length > 0 && choisis.every((lot) => lot.regime === 'achat')
  const destinations = (versCuve ? donnees?.cuves : donnees?.tampons)?.map((d) => ({ valeur: String(d.id), libelle: d.code })) ?? []
  const libelleDestination = versCuve ? t.cuve : t.tampon

  const enregistrer = async () => {
    const resultat = construireCorpsTri(saisie, versCuve, passage?.statut === 'en_cours', validation)
    definirErreurLocale(resultat.erreur)
    if (resultat.corps === null) return
    const reponse = await soumission.soumettre<Resultat>(CHEMIN_TRI, resultat.corps)
    await Promise.all([fiches.recharger(), preparation.recharger()])
    if (reponse === null) return
    definirMessage({ texte: t.succes.replace('{numero}', String(reponse.passage.numero)).replace('{kg}', grammesVersKg(reponse.pesees_huile.huile_totale_g)), type: 'ok' })
    definirSaisie(saisieTriVide())
    definirValidation(null)
    soumission.reinitialiser()
  }

  return (
    <PageFichePapier
      titre={libelles.ecrans.saisieTrituration}
      message={message}
      principal={{ etiquette: c.enregistrer, formulaire: FORMULAIRE, enCours: soumission.enCours }}
      aide={t.aide}
      erreur={preparation.erreur}
      recentes={<FichesRecentes fiches={fiches.donnees} erreur={fiches.erreur} />}
    >
      <form id={FORMULAIRE} onSubmit={(e) => { e.preventDefault(); void enregistrer() }}>
        <CadreFiche titre={t.titreFiche} icone="factory">
          <PartieFiche>
            <EnTeteDeFiche prefixe="tri" libelleHeure={t.heure} saisie={saisie} auteurs={donnees?.utilisateurs ?? []} changer={changer} />
            <Choix id="passage-tri" libelle={t.passage} valeur={saisie.passageId} surChangement={(v) => changer('passageId', v)}
              options={passages.map((p) => ({ valeur: String(p.id), libelle: t.passageOption.replace('{numero}', String(p.numero)).replace('{etat}', t.etats[p.statut as keyof typeof t.etats]) }))} />
            {saisie.passageId === '' && (
              <Choix id="ligne-tri" libelle={t.ligne} valeur={saisie.ligneId} surChangement={(v) => changer('ligneId', v)} options={(donnees?.lignes ?? []).map((l) => ({ valeur: String(l.id), libelle: `${l.code} — ${l.libelle}` }))} />
            )}
          </PartieFiche>
          <p className="mes-champ-aide">{c.auteurAide}</p>
          {saisie.passageId === '' && (
            <TableauLignes titre={t.titreLots} colonnes={[t.lot, t.kg]} surAjout={() => changer('lots', [...saisie.lots, { ...LOT_VIDE }])}>
              {saisie.lots.map((lot, rang) => <tr key={rang}>
                <CelluleChoix libelle={t.lot} rang={rang} valeur={lot.lotId} surChangement={(v) => ligne('lots', rang, { lotId: v })}
                  options={lots.map((l) => ({ valeur: String(l.id), libelle: t.lotOption.replace('{numero}', String(l.numero)).replace('{apporteur}', l.apporteur).replace('{regime}', t.regimes[l.regime ?? 'achat']).replace('{kg}', grouperMilliers(l.reste_kg)) }))} />
                <Cellule libelle={t.kg} rang={rang} valeur={lot.kg} surChangement={(v) => ligne('lots', rang, { kg: v })} />
              </tr>)}
            </TableauLignes>
          )}

          <TableauLignes titre={t.titrePesees} colonnes={[t.poids, libelleDestination, c.heureLigne]} surAjout={() => changer('pesees', [...saisie.pesees, { ...PESEE_VIDE }])}>
            {saisie.pesees.map((pesee, rang) => <tr key={rang}>
              <Cellule libelle={t.poids} rang={rang} valeur={pesee.poids} surChangement={(v) => ligne('pesees', rang, { poids: v })} />
              <CelluleChoix libelle={libelleDestination} rang={rang} valeur={pesee.destination} options={destinations} surChangement={(v) => ligne('pesees', rang, { destination: v })} />
              <Cellule libelle={c.heureLigne} rang={rang} type="datetime-local" valeur={pesee.heure} surChangement={(v) => ligne('pesees', rang, { heure: v })} />
            </tr>)}
          </TableauLignes>
          {versCuve && <Case libelle={t.derogation} coche={saisie.derogation} surChangement={(v) => { definirValidation(null); changer('derogation', v) }} />}
          {versCuve && saisie.derogation && (
            <PartieFiche>
              <Champ id="motif-tri" libelle={c.motif} valeur={saisie.motif} surChangement={(v) => changer('motif', v)} />
              <ValidationPin surValidation={definirValidation} />
            </PartieFiche>
          )}

          <PartieFiche titre={c.finProduction}>
            <Case libelle={t.avecFin} coche={saisie.avecFin} surChangement={(v) => changer('avecFin', v)} />
            {saisie.avecFin && <>
              <Heure id="heure-fin-tri" libelle={t.heureFin} valeur={saisie.heureFin} surChangement={(v) => changer('heureFin', v)} />
              <Champ id="temperature-tri" libelle={t.temperature} valeur={saisie.temperature} surChangement={(v) => changer('temperature', v)} inputMode="decimal" decimales={2} />
              <Champ id="duree-tri" libelle={t.duree} valeur={saisie.duree} surChangement={(v) => changer('duree', v)} inputMode="numeric" />
            </>}
          </PartieFiche>
          <PartieFiche>
            <Champ id="observations-tri" libelle={c.observations} valeur={saisie.observations} surChangement={(v) => changer('observations', v)} />
          </PartieFiche>
          {(erreurLocale ?? soumission.erreur) !== null && <Note ton="erreur">{erreurLocale ?? soumission.erreur}</Note>}
        </CadreFiche>
      </form>
    </PageFichePapier>
  )
}
