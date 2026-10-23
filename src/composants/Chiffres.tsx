// Chiffres clés (maquette MES : « kpis », « valeurs », « partage ») : une bande d'étiquettes et de valeurs, dont un
// afficheur sombre possible. Les valeurs sont celles du serveur, déjà mises en forme ; rien n'est estimé ni arrondi ici.
// Remplace `.rec-afficheur`, `.rec-valeurs` et `.rem-chiffres` au fil de la refonte.
import type { ReactNode } from 'react'
import { classes } from './logique'

export interface Chiffre {
  etiquette: string
  valeur: ReactNode
  unite?: string
  /** `fort` : la valeur qui compte ; `mauvais` : hors limite ; `afficheur` : afficheur sombre, comme la bascule. */
  ton?: 'fort' | 'mauvais' | 'afficheur'
  /** Valeur en lettres (un nom) plutôt qu'en chiffres. */
  texte?: boolean
}

export function Chiffres({ valeurs, libelle }: { valeurs: readonly Chiffre[]; libelle?: string }) {
  return (
    <dl className="mes-chiffres" aria-label={libelle}>
      {valeurs.map((chiffre) => (
        <div
          key={chiffre.etiquette}
          className={classes('mes-chiffre', chiffre.ton !== undefined && `mes-chiffre-${chiffre.ton}`, chiffre.texte === true && 'mes-chiffre-texte')}
        >
          <dt>{chiffre.etiquette}</dt>
          <dd>
            {chiffre.valeur}
            {chiffre.unite !== undefined && <span className="mes-chiffre-unite">{chiffre.unite}</span>}
          </dd>
        </div>
      ))}
    </dl>
  )
}
