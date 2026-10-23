import { useEffect, useRef, type KeyboardEvent } from 'react'
import { libelles } from '../libelles'
import { LONGUEUR_PIN, appliquerTouche, saisieComplete, toucheDepuisClavier, type Touche } from './logiquePin'

interface Props {
  valeur: string
  surChangement: (valeur: string) => void
  /** Appelé par le bouton Valider ou la touche Entrée, seulement si la saisie est complète. */
  surValidation: () => void
  etiquetteValider?: string
  desactive?: boolean
  longueur?: number
  focusAutomatique?: boolean
}

const CHIFFRES = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

/** Pavé numérique du PIN : cibles tactiles d'au moins 44 px, clavier chiffres / Retour arrière / Entrée. */
export function PaveNumerique({
  valeur,
  surChangement,
  surValidation,
  etiquetteValider = libelles.pave.valider,
  desactive = false,
  longueur = LONGUEUR_PIN,
  focusAutomatique = true,
}: Props) {
  const racine = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (focusAutomatique) racine.current?.focus()
  }, [focusAutomatique])

  const appuyer = (touche: Touche) => {
    if (desactive) return
    if (touche.type === 'valider') {
      if (saisieComplete(valeur, longueur)) surValidation()
      return
    }
    surChangement(appliquerTouche(valeur, touche, longueur))
  }

  const surClavier = (evenement: KeyboardEvent<HTMLDivElement>) => {
    const touche = toucheDepuisClavier(evenement.key)
    if (touche === null) return
    evenement.preventDefault()
    appuyer(touche)
  }

  const chiffre = (c: string) => (
    <button key={c} type="button" className="pave-touche" disabled={desactive} onClick={() => appuyer({ type: 'chiffre', chiffre: c })}>
      {c}
    </button>
  )

  return (
    <div className="pave" role="group" aria-label={libelles.pave.nom} tabIndex={-1} onKeyDown={surClavier} ref={racine}>
      <div className="pave-points" role="img" aria-label={`${libelles.pave.codeSaisi} : ${valeur.length} / ${longueur}`}>
        {Array.from({ length: longueur }, (_, i) => (
          <span key={i} className={i < valeur.length ? 'pave-point pave-point-plein' : 'pave-point'} />
        ))}
      </div>
      <div className="pave-grille">
        {CHIFFRES.map(chiffre)}
        <button type="button" className="pave-touche pave-touche-secondaire" disabled={desactive || valeur === ''} onClick={() => appuyer({ type: 'effacer' })}>
          {libelles.pave.corriger}
        </button>
        {chiffre('0')}
        <button type="button" className="pave-touche pave-touche-principale" disabled={desactive || !saisieComplete(valeur, longueur)} onClick={() => appuyer({ type: 'valider' })}>
          {etiquetteValider}
        </button>
      </div>
    </div>
  )
}
