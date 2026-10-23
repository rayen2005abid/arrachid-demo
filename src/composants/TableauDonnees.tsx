// Tableau de données (maquette MES) : en-tête gris en capitales, nombres à droite, défilement horizontal, ligne
// choisie, et les états chargement, vide et erreur. Remplace `.tableau-admin` et ses variantes au fil de la refonte.
// `tbody tr` ne contient que des lignes du serveur : les messages d'état sont sous le tableau.
import type { KeyboardEvent, ReactNode } from 'react'
import { libelles } from '../libelles'
import { EtatVide } from './EtatVide'
import { classes } from './logique'
import { Note } from './Note'

export interface Colonne<T> {
  cle: string
  titre: string
  rendu: (ligne: T) => ReactNode
  /** Nombre : chiffres tabulaires, alignés à droite. */
  nombre?: boolean
}

interface Props<T> {
  /** Nom du tableau pour les lecteurs d'écran (légende cachée à l'écran, sauf avec `legendeVisible`). */
  legende: string
  /** Légende montrée au-dessus du tableau (plusieurs tableaux dans un panneau : le jour d'un ordre de passage). */
  legendeVisible?: boolean
  colonnes: readonly Colonne<T>[]
  /** Lignes renvoyées par le serveur ; null tant que la lecture n'a pas répondu. */
  lignes: readonly T[] | null
  cleLigne: (ligne: T) => string | number
  /** Message quand le serveur ne renvoie aucune ligne. */
  vide: string
  /** Message de la dernière lecture en échec ; les lignes déjà reçues restent affichées dessous. */
  erreur?: string | null
  /** Lignes à choisir : clic, Entrée ou Espace ; flèches haut et bas pour passer d'une ligne à l'autre. */
  surChoisir?: (ligne: T) => void
  choisie?: string | number | null
  /** Classe du tableau (des tests la sélectionnent : `tableau-triturations`, `tableau-cuves`…). */
  className?: string
  /** Classe d'une ligne, d'après un état du serveur (pesée remplacée, mouvement annulé…). */
  classeLigne?: (ligne: T) => string | undefined
}

/** Clavier d'une ligne à choisir, seulement quand la ligne elle-même a le focus (un bouton de la ligne garde le sien). */
function clavierLigne(e: KeyboardEvent<HTMLTableRowElement>, choisir: () => void) {
  if (e.target !== e.currentTarget) return
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    choisir()
    return
  }
  const voisine = e.key === 'ArrowDown' ? e.currentTarget.nextElementSibling : e.key === 'ArrowUp' ? e.currentTarget.previousElementSibling : null
  if (voisine instanceof HTMLElement) {
    e.preventDefault()
    voisine.focus()
  }
}

export function TableauDonnees<T>({ legende, legendeVisible = false, colonnes, lignes, cleLigne, vide, erreur, surChoisir, choisie, className, classeLigne }: Props<T>) {
  const enErreur = erreur !== undefined && erreur !== null && erreur !== ''
  const classeCellule = (colonne: Colonne<T>) => (colonne.nombre === true ? 'mes-nombre' : undefined)
  return (
    <>
      {enErreur && <Note ton="erreur">{erreur}</Note>}
      {(lignes !== null || !enErreur) && (
        <div className="mes-tableau">
          <table className={className}>
            <caption className={legendeVisible ? 'mes-legende' : 'visuellement-cache'}>{legende}</caption>
            <thead>
              <tr>
                {colonnes.map((colonne) => (
                  <th key={colonne.cle} scope="col" className={classeCellule(colonne)}>{colonne.titre}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lignes?.map((ligne) => {
                const cle = cleLigne(ligne)
                const choisir = surChoisir === undefined ? undefined : () => surChoisir(ligne)
                return (
                  <tr
                    key={cle}
                    className={classes(choisir !== undefined && 'mes-cliquable', classeLigne?.(ligne)) || undefined}
                    tabIndex={choisir === undefined ? undefined : 0}
                    aria-selected={choisir === undefined ? undefined : cle === choisie}
                    onClick={choisir}
                    onKeyDown={choisir === undefined ? undefined : (e) => clavierLigne(e, choisir)}
                  >
                    {colonnes.map((colonne) => (
                      <td key={colonne.cle} className={classeCellule(colonne)}>{colonne.rendu(ligne)}</td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
          {lignes === null && <p className="mes-vide" role="status">{libelles.commun.chargement}</p>}
          {lignes !== null && lignes.length === 0 && <EtatVide message={vide} />}
        </div>
      )}
    </>
  )
}
