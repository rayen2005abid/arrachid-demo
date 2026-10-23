// Champ libellé (maquette MES) : étiquette en capitales, saisie, aide puis erreur sous la saisie. Hauteur selon la
// densité du poste (34 px, 44 px sur les tablettes). Remplace `.champ` (38 px) et `.rec-champ` (40 px) au fil de la
// refonte. Les autres attributs (inputMode, autoFocus, maxLength, onKeyDown, data-champ…) passent à la saisie.
import type { InputHTMLAttributes, ReactNode, Ref, SelectHTMLAttributes } from 'react'
import { classes } from './logique'
import { erreurSaisieNumerique } from '../format/validationNumerique'

interface Commun {
  id: string
  libelle: string
  aide?: string
  /** Message d'erreur sous la saisie ; la saisie est marquée invalide. */
  erreur?: string
  /** Champ obligatoire : astérisque à l'écran, `aria-required` pour les lecteurs d'écran. */
  requis?: boolean
}

function Etiquette({ id, libelle, requis }: Pick<Commun, 'id' | 'libelle' | 'requis'>) {
  return (
    <label htmlFor={id} className="mes-etiquette">
      {libelle}
      {requis === true && <span className="mes-requis" aria-hidden="true">*</span>}
    </label>
  )
}

function Messages({ id, aide, erreur }: Pick<Commun, 'id' | 'aide' | 'erreur'>) {
  return (
    <>
      {aide !== undefined && <p id={`${id}-aide`} className="mes-champ-aide">{aide}</p>}
      {erreur !== undefined && <p id={`${id}-erreur`} className="mes-champ-erreur">{erreur}</p>}
    </>
  )
}

/** Attributs d'accessibilité communs : état invalide, obligatoire, et textes qui décrivent la saisie. */
function aria({ id, aide, erreur, requis }: Commun) {
  const decrits = [aide !== undefined ? `${id}-aide` : '', erreur !== undefined ? `${id}-erreur` : ''].filter((x) => x !== '')
  return {
    'aria-invalid': erreur !== undefined,
    'aria-required': requis === true ? true : undefined,
    'aria-describedby': decrits.length > 0 ? decrits.join(' ') : undefined,
  }
}

type AttributsSaisie = Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'value' | 'defaultValue' | 'onChange' | 'className' | 'children'>

interface PropsChamp extends Commun, AttributsSaisie {
  /** Précision de l'unité : 2 centièmes, 3 millimes/grammes, 4 taux fiscaux. */
  decimales?: number
  valeur: string
  surChangement: (valeur: string) => void
  /** Chiffres tabulaires (poids, montants, numéros). */
  chiffres?: boolean
  /** Grande saisie d'un poids ou d'un montant, chiffres à droite. */
  grand?: boolean
  /** Contrôle collé à droite de la saisie, à la même hauteur (ex. choix d'unité). */
  suffixe?: ReactNode
  ref?: Ref<HTMLInputElement>
}

export function Champ({ id, libelle, aide, erreur, requis, valeur, surChangement, chiffres = false, grand = false, decimales, suffixe, ref, ...saisie }: PropsChamp) {
  const probleme = erreur ?? erreurSaisieNumerique(valeur, saisie.inputMode, decimales)
  const entree = (
    <input
      autoComplete="off"
      {...saisie}
      {...aria({ id, libelle, aide, erreur: probleme, requis })}
      ref={ref}
      id={id}
      className={classes('mes-saisie', chiffres && 'mes-saisie-chiffres', grand && 'mes-saisie-grande')}
      value={valeur}
      onChange={(e) => surChangement(e.target.value)}
    />
  )
  return (
    <div className="mes-champ">
      <Etiquette id={id} libelle={libelle} requis={requis} />
      {suffixe === undefined ? entree : <div className="mes-saisie-groupe">{entree}{suffixe}</div>}
      <Messages id={id} aide={aide} erreur={probleme} />
    </div>
  )
}

type AttributsChoix = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'value' | 'defaultValue' | 'onChange' | 'className' | 'children'>

interface PropsChoix extends Commun, AttributsChoix {
  valeur: string
  options: readonly { valeur: string; libelle: string }[]
  surChangement: (valeur: string) => void
  /** Texte du choix vide en tête de liste (« Choisir… ») ; sans lui, pas de choix vide. */
  choixVide?: string
  ref?: Ref<HTMLSelectElement>
}

export function ChampChoix({ id, libelle, aide, erreur, requis, valeur, options, surChangement, choixVide, ref, ...choix }: PropsChoix) {
  return (
    <div className="mes-champ">
      <Etiquette id={id} libelle={libelle} requis={requis} />
      <select
        {...choix}
        {...aria({ id, libelle, aide, erreur, requis })}
        ref={ref}
        id={id}
        className="mes-saisie"
        value={valeur}
        onChange={(e) => surChangement(e.target.value)}
      >
        {choixVide !== undefined && <option value="">{choixVide}</option>}
        {options.map((option) => (
          <option key={option.valeur} value={option.valeur}>{option.libelle}</option>
        ))}
      </select>
      <Messages id={id} aide={aide} erreur={erreur} />
    </div>
  )
}
