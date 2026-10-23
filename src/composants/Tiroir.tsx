// Tiroir (panneau latéral de la maquette MES) : créer ou modifier sans quitter l'écran.
// - le focus entre dans le tiroir (premier champ) et y reste ; à la fermeture il revient où il était ;
// - Échap, la croix, « Annuler » ou un clic sur le voile ferment ; Entrée ou F8 valident ;
// - tant qu'il est ouvert, les autres touches F de l'écran sont suspendues.
// À rendre hors de tout formulaire de l'écran (le tiroir a le sien), un seul à la fois.
import { useEffect, useId, useRef, type FormEvent, type KeyboardEvent as ToucheReact, type ReactNode } from 'react'
import { messageUtilisateur } from '../api/erreurs'
import { useTouches } from '../contextes/touches'
import { libelles } from '../libelles'
import { Icone } from './Icone'
import type { NomIcone } from './icones'
import { cibleTabulation, touchesTiroir } from './logique'
import { Note } from './Note'

const ATTEIGNABLES =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Éléments que Tab peut atteindre, dans l'ordre de la page ; les éléments cachés sont exclus. */
function atteignables(racine: Element): HTMLElement[] {
  return [...racine.querySelectorAll<HTMLElement>(ATTEIGNABLES)].filter((element) => element.getClientRects().length > 0)
}

interface Props {
  titre: string
  icone?: NomIcone
  /** Libellé du bouton principal du tiroir, déclenché aussi par F8 et Entrée. */
  etiquette: string
  surValider: () => void
  surFermer: () => void
  enCours?: boolean
  /** Bouton principal désactivé (par exemple tant que le PIN frais n'est pas saisi). */
  bloque?: boolean
  /** Erreur de la dernière validation, en tête du tiroir (jamais de code HTTP). */
  erreur?: unknown
  /** Ce que l'action va changer, en clair (CONTEXTE §2.1), juste avant les boutons. */
  consequence?: ReactNode
  /** Nom du formulaire du tiroir pour les lecteurs d'écran (une correction : « Correction de la pesée n° 1 »). */
  nomFormulaire?: string
  children?: ReactNode
}

export function Tiroir({ titre, icone, etiquette, surValider, surFermer, enCours = false, bloque = false, erreur, consequence, nomFormulaire, children }: Props) {
  const idTitre = useId()
  const racine = useRef<HTMLElement>(null)
  const formulaire = useRef<HTMLFormElement>(null)
  const fermer = useRef(surFermer)
  useEffect(() => {
    fermer.current = surFermer
  })
  const inactif = enCours || bloque
  useTouches(touchesTiroir(etiquette, () => formulaire.current?.requestSubmit(), inactif))

  // Le focus entre dans le tiroir (premier élément du contenu, sinon le tiroir lui-même), puis revient à l'origine.
  useEffect(() => {
    const origine = document.activeElement
    const tiroir = racine.current
    if (tiroir !== null && !tiroir.contains(document.activeElement)) {
      const corps = tiroir.querySelector('.mes-tiroir-corps')
      const premier = corps === null ? undefined : atteignables(corps)[0]
      ;(premier ?? tiroir).focus()
    }
    return () => {
      if (origine instanceof HTMLElement && origine.isConnected) origine.focus()
      else requestAnimationFrame(() => document.querySelector<HTMLElement>('.entete-ecran .bouton-principal')?.focus())
    }
  }, [])

  // Tab reste dans le tiroir, et Échap ferme même si le focus en est sorti (clic sur la page derrière le voile).
  useEffect(() => {
    const clavier = (e: KeyboardEvent) => {
      const tiroir = racine.current
      if (tiroir === null || e.defaultPrevented) return
      if (e.key === 'Escape') {
        e.preventDefault()
        fermer.current()
      } else if (e.key === 'Tab') {
        const liste = atteignables(tiroir)
        const actif = document.activeElement
        const cible = cibleTabulation(actif instanceof HTMLElement ? liste.indexOf(actif) : -1, liste.length, e.shiftKey)
        if (cible !== null || liste.length === 0) e.preventDefault()
        if (cible !== null) liste[cible].focus()
        else if (liste.length === 0) tiroir.focus()
      }
    }
    document.addEventListener('keydown', clavier)
    return () => document.removeEventListener('keydown', clavier)
  }, [])

  // Échap dans le tiroir : il se ferme, et l'écran derrière ne reçoit pas la touche (ses propres raccourcis Échap).
  const clavierTiroir = (e: ToucheReact<HTMLElement>) => {
    if (e.key !== 'Escape' || e.defaultPrevented) return
    e.preventDefault()
    e.stopPropagation()
    surFermer()
  }

  const soumettre = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!inactif) surValider()
  }

  const texteErreur = erreur === undefined || erreur === null || erreur === '' ? null : typeof erreur === 'string' ? erreur : messageUtilisateur(erreur)
  return (
    <>
      <div className="mes-voile" onClick={surFermer} />
      <section ref={racine} className="mes-tiroir" role="dialog" aria-modal="true" aria-labelledby={idTitre} tabIndex={-1} onKeyDown={clavierTiroir}>
        <header className="mes-tiroir-tete">
          {icone !== undefined && <Icone nom={icone} />}
          <h2 id={idTitre}>{titre}</h2>
          <button type="button" className="mes-tiroir-fermer" aria-label={libelles.commun.fermer} onClick={surFermer}>
            <Icone nom="x" />
          </button>
        </header>
        <form ref={formulaire} className="mes-tiroir-formulaire" onSubmit={soumettre} aria-label={nomFormulaire} noValidate>
          <div className="mes-tiroir-corps">
            {texteErreur !== null && <Note ton="erreur">{texteErreur}</Note>}
            {children}
            {consequence !== undefined && <Note>{consequence}</Note>}
          </div>
          <footer className="mes-tiroir-pied">
            <button type="button" className="bouton-secondaire" onClick={surFermer}>{libelles.commun.annuler}</button>
            <button type="submit" className="bouton-principal" disabled={inactif} aria-keyshortcuts="F8">
              <span className="touche-f8" aria-hidden="true">F8</span>
              {etiquette}
            </button>
          </footer>
        </form>
      </section>
    </>
  )
}
