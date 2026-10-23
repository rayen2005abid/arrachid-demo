// Champ libellé de la réception : fait partie de l'ordre de saisie (`data-champ`) sauf avis contraire.
// `ChampPont` (écrans du module Réception, refonte Session 4) prend le `Champ` partagé. L'ancien `ChampRec` est retiré
// en Session 6 : Prix, son dernier écran, est passé au `Champ` partagé.
import type { KeyboardEvent, Ref } from 'react'
import { Champ } from '../composants/Champ'

export const FORMULAIRE_PRINCIPAL = 'formulaire-reception'

/** Bouton principal de l'en-tête (F8) : formulaire visé, libellé, état. */
export interface Principal {
  formulaire: string
  etiquette: string
  enCours: boolean
}

interface Props {
  id: string
  libelle: string
  valeur: string
  surChangement: (valeur: string) => void
  aide?: string
  erreur?: string
  inputMode?: 'text' | 'numeric' | 'decimal' | 'tel'
  autoFocus?: boolean
  placeholder?: string
  horsOrdre?: boolean
  surTouche?: (e: KeyboardEvent<HTMLInputElement>) => void
  refChamp?: Ref<HTMLInputElement>
  chiffres?: boolean
}

export function ChampPont({ id, libelle, valeur, surChangement, aide, erreur, inputMode = 'text', autoFocus, placeholder, horsOrdre, surTouche, refChamp, chiffres }: Props) {
  return (
    <Champ
      id={id}
      libelle={libelle}
      valeur={valeur}
      surChangement={surChangement}
      aide={aide}
      erreur={erreur}
      data-champ={horsOrdre ? undefined : true}
      inputMode={inputMode}
      autoFocus={autoFocus}
      placeholder={placeholder}
      onKeyDown={surTouche}
      ref={refChamp}
      chiffres={chiffres}
    />
  )
}
