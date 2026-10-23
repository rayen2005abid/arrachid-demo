import { useState, type FormEvent } from 'react'
import { useLecture } from '../api/useLecture'
import { useSoumission } from '../api/useSoumission'
import { Champ, ChampChoix } from '../composants/Champ'
import { Note } from '../composants/Note'
import { Panneau } from '../composants/Panneau'
import { ValidationPin } from '../composants/ValidationPin'
import { formaterHorodatage } from '../format/dates'
import { afficherCentiemes } from '../laboratoire/analyse'
import { libelles } from '../libelles'
import type { Validation } from '../types'
import { bornesPlage, type ChampPlage, type ListePlages, type NiveauPlage, type VersionPlage } from './plages'

const t = libelles.parametres
const afficher = (v: number | null) => v === null ? '—' : `${afficherCentiemes(v)} %`

function EditeurPlage({ champ, niveau, actuelle, liste, surEnregistree, surOccupation }: {
  champ: ChampPlage; niveau: NiveauPlage; actuelle: VersionPlage | undefined
  liste: ListePlages; surEnregistree: () => Promise<void>
  surOccupation: (enCours: boolean) => void
}) {
  const [minimum, definirMinimum] = useState(actuelle?.minimum == null ? '' : afficherCentiemes(actuelle.minimum))
  const [maximum, definirMaximum] = useState(actuelle?.maximum == null ? '' : afficherCentiemes(actuelle.maximum))
  const [motif, definirMotif] = useState('')
  const [validation, definirValidation] = useState<Validation | null>(null)
  const ouverturePermise = !champ.versions.some((v) => v.niveau === niveau) && liste.valide_du_minimum < liste.heure_serveur
  const [ouverture, definirOuverture] = useState(ouverturePermise)
  const [erreur, definirErreur] = useState<string | null>(null)
  const [enregistrement, definirEnregistrement] = useState(false)
  const s = useSoumission()
  const modifier = (definir: (v: string) => void) => (valeur: string) => {
    definir(valeur)
    definirErreur(null)
    s.reinitialiser()
  }
  const enregistrer = async (e: FormEvent) => {
    e.preventDefault()
    if (enregistrement || s.enCours) return
    const bornes = bornesPlage(minimum, maximum)
    const probleme = bornes === null ? t.plageInvalide : motif.trim() === '' ? t.erreurs.motifObligatoire
      : validation === null ? t.erreurs.validationRequise : null
    definirErreur(probleme)
    if (probleme !== null || bornes === null) return
    definirEnregistrement(true)
    surOccupation(true)
    try {
      const reponse = await s.soumettre(`/api/parametres/plages/${encodeURIComponent(champ.champ)}`, {
        ...bornes, niveau, valide_du: ouverture ? liste.valide_du_minimum : null, motif: motif.trim(), validation,
      })
      if (reponse !== null) await surEnregistree()
    } finally {
      definirEnregistrement(false)
      surOccupation(false)
    }
  }
  return <form className="mes-pile" aria-label={t.plages} onSubmit={(e) => void enregistrer(e)} noValidate>
    <fieldset className="mes-groupe" disabled={enregistrement}>
    <Champ id="plage-minimum" libelle={t.minimumPlage} valeur={minimum} surChangement={modifier(definirMinimum)} inputMode="decimal" decimales={2} chiffres />
    <Champ id="plage-maximum" libelle={t.maximumPlage} valeur={maximum} surChangement={modifier(definirMaximum)} inputMode="decimal" decimales={2} chiffres />
    {ouverturePermise && <ChampChoix id="plage-debut" libelle={t.debut} valeur={ouverture ? 'ouverture' : 'maintenant'}
      options={[{ valeur: 'ouverture', libelle: t.debutOuverture }, { valeur: 'maintenant', libelle: t.debutMaintenant }]}
      surChangement={(v) => { definirOuverture(v === 'ouverture'); s.reinitialiser() }} />}
    <Champ id="plage-motif" libelle={t.motif} valeur={motif} surChangement={modifier(definirMotif)} />
    <ValidationPin seulProprietaire surValidation={definirValidation} />
    {(erreur ?? s.erreur) !== null && <Note ton="erreur">{erreur ?? s.erreur}</Note>}
    <button type="submit" className="bouton-principal" disabled={s.enCours || validation === null}>{t.enregistrerPlage}</button>
    </fieldset>
  </form>
}

/** Aucun seuil livré : limites approuvées, datées et historisées par le propriétaire. */
export function PlagesValidation() {
  const lecture = useLecture<ListePlages>('/api/parametres/plages')
  const [selection, definirSelection] = useState('')
  const [niveau, definirNiveau] = useState<NiveauPlage>('suspect')
  const [message, definirMessage] = useState(false)
  const [enCours, definirEnCours] = useState(false)
  const [generation, definirGeneration] = useState(0)
  const liste = lecture.donnees
  const champ = liste?.champs.find((c) => c.champ === selection) ?? liste?.champs[0]
  const actuelle = champ?.versions.find((v) => v.niveau === niveau && liste !== null
    && v.valide_du <= liste.heure_serveur && (v.valide_au === null || v.valide_au > liste.heure_serveur))
  const apres = async () => {
    await lecture.recharger()
    definirGeneration((n) => n + 1)
    definirMessage(true)
  }
  return <Panneau titre={t.plages} icone="sliders-horizontal">
    <p className="aide">{t.aidePlages}</p>
    {lecture.erreur !== null && <Note ton="erreur">{lecture.erreur}</Note>}
    {message && <Note ton="ok">{t.plageEnregistree}</Note>}
    {liste !== null && champ !== undefined && <div className="mes-pile">
      <ChampChoix id="plage-champ" libelle={t.champPlage} valeur={champ.champ} disabled={enCours}
        options={liste.champs.map((c) => ({ valeur: c.champ, libelle: c.libelle }))}
        surChangement={(v) => { definirSelection(v); definirMessage(false) }} />
      <ChampChoix id="plage-niveau" libelle={t.niveauPlage} valeur={niveau} disabled={enCours}
        options={(['suspect', 'impossible'] as const).map((v) => ({ valeur: v, libelle: t.niveauxPlage[v] }))}
        surChangement={(v) => { definirNiveau(v === 'impossible' ? 'impossible' : 'suspect'); definirMessage(false) }} />
      <p>{t.valeurActuelle} : {actuelle === undefined ? t.aucunePlage : `${afficher(actuelle.minimum)} — ${afficher(actuelle.maximum)}`}</p>
      <EditeurPlage key={`${champ.champ}-${niveau}-${actuelle?.id ?? 'nouvelle'}-${generation}`} champ={champ} niveau={niveau} actuelle={actuelle} liste={liste} surEnregistree={apres} surOccupation={definirEnCours} />
      <details><summary>{t.historique}</summary>
        {champ.versions.length === 0 ? <p>{t.aucuneVersion}</p> : <ul>{champ.versions.map((v) => <li key={v.id}>
          {t.niveauxPlage[v.niveau]} : {afficher(v.minimum)} — {afficher(v.maximum)} ; {t.du} {formaterHorodatage(v.valide_du)}
          {v.valide_au !== null && ` ${t.au} ${formaterHorodatage(v.valide_au)}`} ; {t.par} {v.auteur.nom} : {v.motif}
        </li>)}</ul>}
      </details>
    </div>}
  </Panneau>
}
