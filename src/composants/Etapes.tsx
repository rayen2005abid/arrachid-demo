// Étapes d'un parcours (maquette MES) : faites, en cours, bloquée, à venir. Le rang de l'étape en cours vient d'un état
// renvoyé par le serveur (le `statut` d'un chargement, par exemple) ; le client n'invente aucune étape ni aucun état.
import { libelles } from '../libelles'
import { Icone } from './Icone'
import { etatsEtapes } from './logique'

interface Props {
  libelle: string
  etapes: readonly { cle: string; libelle: string }[]
  /** Rang de l'étape en cours : 0 pour la première, le nombre d'étapes quand tout est fait. */
  rangActuel: number
  bloquee?: boolean
}

export function Etapes({ libelle, etapes, rangActuel, bloquee = false }: Props) {
  const etats = etatsEtapes(etapes.length, rangActuel, bloquee)
  return (
    <ol className="mes-etapes" aria-label={libelle}>
      {etapes.map((etape, rang) => {
        const etat = etats[rang]
        return (
          <li key={etape.cle} className={`mes-etape mes-etape-${etat}`} aria-current={etat === 'actuelle' || etat === 'bloquee' ? 'step' : undefined}>
            <span className="mes-etape-libelle">
              {etat === 'faite' && <Icone nom="check" />}
              {etape.libelle}
            </span>
            <span className="visuellement-cache">{`, ${libelles.composants.etapes[etat]}`}</span>
          </li>
        )
      })}
    </ol>
  )
}
