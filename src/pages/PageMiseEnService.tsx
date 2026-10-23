import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSoumission } from '../api/useSoumission'
import { AfficheErreur } from '../composants/AfficheErreur'
import { useServeur } from '../contextes/serveur'
import { libelles } from '../libelles'
import {
  FORMULAIRE_VIDE,
  champDuServeur,
  corpsMiseEnService,
  verifierFormulaire,
  type ChampMiseEnService,
  type ErreursFormulaire,
  type FormulaireMiseEnService,
} from '../miseEnService/logique'

const l = libelles.miseEnService

interface PropsChamp {
  champ: ChampMiseEnService
  etiquette: string
  formulaire: FormulaireMiseEnService
  erreurs: ErreursFormulaire
  surChangement: (champ: ChampMiseEnService, valeur: string) => void
  type?: 'text' | 'date' | 'password'
  aide?: string
  focusAutomatique?: boolean
}

function Champ({ champ, etiquette, formulaire, erreurs, surChangement, type = 'text', aide, focusAutomatique }: PropsChamp) {
  const id = `mes-${champ.replace('.', '-')}`
  const pin = type === 'password'
  return (
    <div className="champ">
      <label htmlFor={id}>{etiquette}</label>
      {aide && <p className="aide" id={`${id}-aide`}>{aide}</p>}
      <input
        id={id}
        type={type}
        value={formulaire[champ]}
        autoFocus={focusAutomatique}
        autoComplete="off"
        inputMode={pin ? 'numeric' : undefined}
        maxLength={pin ? 4 : undefined}
        aria-invalid={erreurs[champ] !== undefined}
        aria-describedby={aide ? `${id}-aide` : undefined}
        onChange={(evenement) => surChangement(champ, evenement.target.value)}
      />
      <AfficheErreur erreur={erreurs[champ] ?? null} />
    </div>
  )
}

/** Première mise en service : code à usage unique, campagne, propriétaire et administrateur. */
export function PageMiseEnService() {
  const { reverifierMiseEnService } = useServeur()
  const navigation = useNavigate()
  const soumission = useSoumission()
  const [formulaire, definirFormulaire] = useState<FormulaireMiseEnService>(FORMULAIRE_VIDE)
  const [erreurs, definirErreurs] = useState<ErreursFormulaire>({})
  const [termine, definirTermine] = useState(false)

  const changer = (champ: ChampMiseEnService, valeur: string) => {
    definirFormulaire((precedent) => ({ ...precedent, [champ]: valeur }))
    definirErreurs((precedentes) => ({ ...precedentes, [champ]: undefined }))
    // Valeurs modifiées après un refus : nouvelle soumission, nouveau commande_id.
    if (soumission.erreur !== null) soumission.reinitialiser()
  }

  const valider = async (evenement: FormEvent) => {
    evenement.preventDefault()
    const trouvees = verifierFormulaire(formulaire)
    definirErreurs(trouvees)
    if (Object.keys(trouvees).length > 0 || soumission.enCours) return
    const reponse = await soumission.soumettre('/api/mise-en-service', corpsMiseEnService(formulaire))
    if (reponse !== null) definirTermine(true)
  }

  const continuer = async () => {
    await reverifierMiseEnService()
    navigation('/', { replace: true })
  }

  if (termine) {
    return (
      <section className="page-centree">
        <h1>{l.reussiTitre}</h1>
        <p>{l.reussi}</p>
        <p className="aide">{l.suite}</p>
        <button type="button" className="bouton-principal" autoFocus onClick={() => void continuer()}>
          {libelles.commun.continuer}
        </button>
      </section>
    )
  }

  // L'erreur du serveur s'affiche sous son champ ; sinon en haut du formulaire.
  const champServeur = champDuServeur(soumission.champ)
  const erreursAffichees: ErreursFormulaire =
    champServeur !== null && soumission.erreur !== null ? { ...erreurs, [champServeur]: soumission.erreur } : erreurs
  const commun = { formulaire, erreurs: erreursAffichees, surChangement: changer }

  return (
    <section className="page-formulaire">
      <h1>{l.titre}</h1>
      <p className="aide">{l.aide}</p>
      <form onSubmit={(evenement) => void valider(evenement)} noValidate>
        <Champ champ="code" etiquette={l.code} aide={l.codeAide} focusAutomatique {...commun} />
        <fieldset>
          <legend>{l.campagne}</legend>
          <Champ champ="campagne.libelle" etiquette={l.libelleCampagne} {...commun} />
          <Champ champ="campagne.date_ouverture" etiquette={l.dateOuverture} type="date" {...commun} />
        </fieldset>
        {(['proprietaire', 'administrateur'] as const).map((qui) => (
          <fieldset key={qui}>
            <legend>{l[qui]}</legend>
            <Champ champ={`${qui}.nom`} etiquette={l.nom} {...commun} />
            <Champ champ={`${qui}.pin`} etiquette={l.pin} type="password" {...commun} />
            <Champ champ={`${qui}.confirmation`} etiquette={l.confirmation} type="password" {...commun} />
          </fieldset>
        ))}
        {champServeur === null && <AfficheErreur erreur={soumission.erreur} />}
        <button type="submit" className="bouton-principal" disabled={soumission.enCours}>
          {l.valider}
        </button>
      </form>
    </section>
  )
}
