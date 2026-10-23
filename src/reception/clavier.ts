// Clavier de la réception (PROMPT §6.20.1) : ordre de saisie fixe donné par `data-champ`,
// Entrée = champ suivant, ou validation du formulaire sur le dernier champ.
import type { KeyboardEvent } from 'react'

function champs(formulaire: HTMLFormElement): HTMLElement[] {
  return [...formulaire.querySelectorAll<HTMLElement>('[data-champ]')].filter(
    (element) => !(element as HTMLInputElement).disabled && element.offsetParent !== null,
  )
}

/** Donne le focus au champ suivant ; sur le dernier, valide le formulaire. */
export function allerAuSuivant(formulaire: HTMLFormElement, courant: Element): void {
  const liste = champs(formulaire)
  const position = liste.findIndex((element) => element === courant || element.contains(courant))
  const suivant = liste[position + 1]
  if (position >= 0 && suivant !== undefined) {
    if (suivant.getAttribute('role') === 'radiogroup') {
      const choix = suivant.querySelector<HTMLElement>('[aria-checked="true"]') ?? suivant.querySelector<HTMLElement>('[role="radio"]')
      choix?.focus()
      return
    }
    suivant.focus()
    if (suivant instanceof HTMLInputElement) suivant.select()
  } else {
    formulaire.requestSubmit()
  }
}

/** Gestionnaire `onKeyDown` du formulaire : un champ qui gère lui-même Entrée appelle preventDefault. */
export function surEntree(e: KeyboardEvent<HTMLFormElement>): void {
  if (e.key !== 'Enter' || e.defaultPrevented || e.altKey || e.ctrlKey) return
  const cible = e.target as HTMLElement
  if (!(cible instanceof HTMLInputElement || cible instanceof HTMLSelectElement)) return
  if (cible instanceof HTMLInputElement && cible.type === 'checkbox') return
  e.preventDefault()
  allerAuSuivant(e.currentTarget, cible)
}
