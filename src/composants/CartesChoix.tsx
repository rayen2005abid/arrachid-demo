// Cartes à choisir (maquette MES : « destinations ») : la cuve ou le tampon d'un contenant d'huile, une opération de
// cuve, une campagne… Un groupe de boutons radio ; chaque carte dit ce que le serveur renvoie (code, contenu, place).
// Une carte que le serveur écarte est désactivée et dit pourquoi.
import { useId, type ReactNode } from 'react'

interface PropsGroupe {
  /** Nom du groupe pour les lecteurs d'écran ; affiché au-dessus des cartes sauf avec `etiquetteCachee`. */
  libelle: string
  /** Le titre du panneau dit déjà ce qu'on choisit : l'étiquette n'est lue que par les lecteurs d'écran. */
  etiquetteCachee?: boolean
  erreur?: string
  children: ReactNode
}

export function CartesChoix({ libelle, etiquetteCachee = false, erreur, children }: PropsGroupe) {
  const id = useId()
  return (
    <div className="mes-champ">
      <span id={`${id}-etiquette`} className={etiquetteCachee ? 'visuellement-cache' : 'mes-etiquette'}>{libelle}</span>
      <div className="mes-cartes-choix" role="radiogroup" aria-labelledby={`${id}-etiquette`} aria-describedby={erreur === undefined ? undefined : `${id}-erreur`}>
        {children}
      </div>
      {erreur !== undefined && <p id={`${id}-erreur`} className="mes-champ-erreur">{erreur}</p>}
    </div>
  )
}

interface PropsCarte {
  titre: ReactNode
  choisie: boolean
  surChoisir: () => void
  inactive?: boolean
  /** Lignes de détail sous le titre (contenu, capacité, raison d'un refus…). */
  children?: ReactNode
}

export function CarteChoix({ titre, choisie, surChoisir, inactive = false, children }: PropsCarte) {
  return (
    <button type="button" role="radio" aria-checked={choisie} className="mes-carte-choix" disabled={inactive} onClick={surChoisir}>
      <strong className="mes-carte-choix-titre">{titre}</strong>
      {children}
    </button>
  )
}
