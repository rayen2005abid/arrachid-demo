// Compteur d'un onglet ou d'un bandeau (maquette MES) : nombre exact de lignes renvoyées par le serveur (audit §4.4).
// Rien n'est affiché à zéro : un compteur ne se montre que quand quelque chose attend.
import { classes } from './logique'

export type TonCompteur = 'action' | 'alerte' | 'erreur' | 'ok'

interface Props {
  nombre: number
  ton?: TonCompteur
  /** Phrase lue par les lecteurs d'écran à la place du nombre seul (« 2 remorques sur le site »). */
  libelle?: string
}

export function Compteur({ nombre, ton = 'action', libelle }: Props) {
  if (!Number.isSafeInteger(nombre) || nombre <= 0) return null
  return (
    <span className={classes('mes-compteur', ton !== 'action' && `mes-compteur-${ton}`)}>
      {libelle === undefined ? (
        nombre
      ) : (
        <>
          <span aria-hidden="true">{nombre}</span>
          <span className="visuellement-cache">{libelle}</span>
        </>
      )}
    </span>
  )
}
