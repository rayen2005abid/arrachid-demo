// Choix exclusif en gros boutons (maquette MES : « modes ») : plage de la journée, niveau de service, ligne de
// trituration… Un groupe de boutons radio nommé par son étiquette ; un choix que le serveur refuse est désactivé.
import { useId } from 'react'

export interface OptionChoix<V extends string | number> {
  valeur: V
  libelle: string
  inactive?: boolean
}

interface Props<V extends string | number> {
  libelle: string
  options: readonly OptionChoix<V>[]
  /** Valeur choisie ; null tant que rien n'est choisi. */
  valeur: V | null
  surChoisir: (valeur: V) => void
  aide?: string
  erreur?: string
}

export function ChoixBoutons<V extends string | number>({ libelle, options, valeur, surChoisir, aide, erreur }: Props<V>) {
  const id = useId()
  const decrits = [aide !== undefined ? `${id}-aide` : '', erreur !== undefined ? `${id}-erreur` : ''].filter((x) => x !== '')
  return (
    <div className="mes-champ">
      <span id={`${id}-etiquette`} className="mes-etiquette">{libelle}</span>
      <div className="mes-choix" role="radiogroup" aria-labelledby={`${id}-etiquette`} aria-describedby={decrits.length > 0 ? decrits.join(' ') : undefined}>
        {options.map((option) => (
          <button
            key={option.valeur}
            type="button"
            role="radio"
            aria-checked={option.valeur === valeur}
            className="mes-choix-bouton"
            disabled={option.inactive === true}
            onClick={() => surChoisir(option.valeur)}
          >
            {option.libelle}
          </button>
        ))}
      </div>
      {aide !== undefined && <p id={`${id}-aide`} className="mes-champ-aide">{aide}</p>}
      {erreur !== undefined && <p id={`${id}-erreur`} className="mes-champ-erreur">{erreur}</p>}
    </div>
  )
}
