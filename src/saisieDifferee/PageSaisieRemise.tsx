import { useState } from 'react'
import { useLecture } from '../api/useLecture'
import { useSoumission } from '../api/useSoumission'
import { Champ, Choix } from '../administration/composants'
import { grammesVersKg } from '../administration/unites'
import { type MessageEcran } from '../composants/EnTeteEcran'
import { Note } from '../composants/Note'
import { ValidationPin } from '../composants/ValidationPin'
import { libelles } from '../libelles'
import type { FileRemise, VueRemise } from '../partages/remise'
import type { Validation } from '../types'
import { CadreFiche, Case, Cellule, CelluleChoix, EnTeteDeFiche, FichesRecentes, Heure, PageFichePapier, PartieFiche, TableauLignes } from './composantsFiche'
import { CHEMIN_REM, CONTENANT_VIDE, construireCorpsRem, optionsAuteurs, saisieRemVide, type Auteur, type FicheReprise, type SaisieRem } from './logiqueProduction'

const c = libelles.saisieProduction
const t = c.rem
const FORMULAIRE = 'formulaire-fiche-rem'

interface Preparation extends FileRemise { utilisateurs: Auteur[]; cuves: { id: number; code: string }[] }
interface Resultat { remise_huile: VueRemise }

/** Reprise de la fiche REM : contenants de l'apporteur et clôture, à leur heure d'origine. */
export function PageSaisieRemise() {
  const [saisie, definirSaisie] = useState<SaisieRem>(saisieRemVide)
  const [validation, definirValidation] = useState<Validation | null>(null)
  const [erreurLocale, definirErreurLocale] = useState<string | null>(null)
  const [message, definirMessage] = useState<MessageEcran | null>(null)
  const soumission = useSoumission()
  const preparation = useLecture<Preparation>(`${CHEMIN_REM}/preparation`)
  const fiches = useLecture<FicheReprise[]>(CHEMIN_REM)
  const lecture = useLecture<Resultat>(saisie.passageId === '' ? null : `${CHEMIN_REM}/passages/${saisie.passageId}`)
  const donnees = preparation.donnees
  // Une lecture en échec garde l'ancienne réponse : elle ne décrit plus le passage choisi.
  const vue = saisie.passageId !== '' && lecture.erreur === null && String(lecture.donnees?.remise_huile.passage.id) === saisie.passageId ? lecture.donnees?.remise_huile ?? null : null

  const changer = <K extends keyof SaisieRem>(cle: K, valeur: SaisieRem[K]) => {
    definirSaisie((avant) => ({ ...avant, [cle]: valeur }))
    definirErreurLocale(null)
    soumission.reinitialiser()
  }
  const ligne = (rang: number, valeurs: Partial<SaisieRem['contenants'][number]>) =>
    changer('contenants', saisie.contenants.map((ancien, i) => (i === rang ? { ...ancien, ...valeurs } : ancien)))
  const tampons = (vue?.tampons ?? []).map((tampon) => ({ valeur: String(tampon.id), libelle: tampon.code }))

  const enregistrer = async () => {
    const resultat = construireCorpsRem(saisie, vue?.partage != null, validation)
    definirErreurLocale(resultat.erreur)
    if (resultat.corps === null) return
    const reponse = await soumission.soumettre<Resultat>(CHEMIN_REM, resultat.corps)
    await Promise.all([fiches.recharger(), preparation.recharger()])
    if (reponse === null) return
    const remise = reponse.remise_huile
    const texte = t.succes.replace('{numero}', String(remise.passage.numero)).replace('{kg}', grammesVersKg(remise.huile_remise_g))
    const bon = remise.cloture?.bon_sortie ?? null
    definirMessage({ texte: bon === null ? texte : texte + t.succesBon.replace('{numero}', String(bon.numero)), type: 'ok' })
    definirSaisie(saisieRemVide())
    definirValidation(null)
    soumission.reinitialiser()
  }

  return (
    <PageFichePapier
      titre={libelles.ecrans.saisieRemise}
      message={message}
      principal={{ etiquette: c.enregistrer, formulaire: FORMULAIRE, enCours: soumission.enCours }}
      aide={t.aide}
      erreur={preparation.erreur}
      recentes={<FichesRecentes fiches={fiches.donnees} erreur={fiches.erreur} />}
    >
      <form id={FORMULAIRE} onSubmit={(e) => { e.preventDefault(); void enregistrer() }}>
        <CadreFiche titre={t.titreFiche} icone="droplet">
          <PartieFiche>
            <EnTeteDeFiche prefixe="rem" libelleHeure={t.heure} saisie={saisie} auteurs={donnees?.utilisateurs ?? []} changer={changer} />
            <Choix id="passage-rem" libelle={t.passage} valeur={saisie.passageId} surChangement={(v) => changer('passageId', v)}
              options={(donnees?.passages ?? []).map((p) => ({ valeur: String(p.passage.id), libelle: t.passageOption.replace('{numero}', String(p.passage.numero)).replace('{apporteur}', p.apporteur) }))} />
          </PartieFiche>
          <p className="mes-champ-aide">{c.auteurAide}</p>
          {saisie.passageId !== '' && lecture.erreur !== null && <Note ton="erreur">{lecture.erreur}</Note>}
          {vue !== null && <Note ton="ok">{vue.partage === null
            ? t.partageAFaire.replace('{pese}', grammesVersKg(vue.huile_pesee_g))
            : t.partageDeja.replace('{du}', grammesVersKg(vue.partage.huile_due_g)).replace('{remis}', grammesVersKg(vue.huile_remise_g))}</Note>}

          <TableauLignes titre={t.titreContenants} colonnes={[t.vide, t.plein, t.tampon, c.heureLigne]} surAjout={() => changer('contenants', [...saisie.contenants, { ...CONTENANT_VIDE }])}>
            {saisie.contenants.map((contenant, rang) => <tr key={rang}>
              <Cellule libelle={t.vide} rang={rang} valeur={contenant.vide} surChangement={(v) => ligne(rang, { vide: v })} />
              <Cellule libelle={t.plein} rang={rang} valeur={contenant.plein} surChangement={(v) => ligne(rang, { plein: v })} />
              <CelluleChoix libelle={t.tampon} rang={rang} valeur={contenant.tamponId} options={tampons} surChangement={(v) => ligne(rang, { tamponId: v })} />
              <Cellule libelle={c.heureLigne} rang={rang} type="datetime-local" valeur={contenant.heure} surChangement={(v) => ligne(rang, { heure: v })} />
            </tr>)}
          </TableauLignes>

          <PartieFiche titre={t.titreCloture}>
            <Case libelle={t.avecCloture} coche={saisie.avecCloture} surChangement={(v) => changer('avecCloture', v)} />
            {saisie.avecCloture && <>
              <Heure id="heure-cloture-rem" libelle={t.heureCloture} valeur={saisie.heureCloture} surChangement={(v) => changer('heureCloture', v)} />
              {vue?.regime === 'mixte' && <Choix id="cuve-rem" libelle={t.cuve} valeur={saisie.cuveId} surChangement={(v) => changer('cuveId', v)} options={(donnees?.cuves ?? []).map((cuve) => ({ valeur: String(cuve.id), libelle: cuve.code }))} />}
              <Case libelle={t.validerEcart} coche={saisie.validerEcart} surChangement={(v) => { definirValidation(null); changer('validerEcart', v) }} />
              {saisie.validerEcart && <>
                <Champ id="motif-rem" libelle={c.motif} valeur={saisie.motif} surChangement={(v) => changer('motif', v)} />
                <Choix id="valide-par-rem" libelle={t.validePar} valeur={saisie.validePar} surChangement={(v) => changer('validePar', v)} options={optionsAuteurs(donnees?.utilisateurs ?? [], true)} />
                <ValidationPin surValidation={definirValidation} />
              </>}
            </>}
          </PartieFiche>
          <PartieFiche>
            <Champ id="observations-rem" libelle={c.observations} valeur={saisie.observations} surChangement={(v) => changer('observations', v)} />
          </PartieFiche>
          {(erreurLocale ?? soumission.erreur) !== null && <Note ton="erreur">{erreurLocale ?? soumission.erreur}</Note>}
        </CadreFiche>
      </form>
    </PageFichePapier>
  )
}
