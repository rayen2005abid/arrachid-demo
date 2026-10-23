// En-tête d'écran de la maquette MES (T-86) : code, titre, sous-titre, message, action principale F8.
// Un seul bouton principal par écran (CONTEXTE §2.1) ; F8 le déclenche au clavier.
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useTouches } from '../contextes/touches'
import { ENTREES_MENU } from '../navigation'

export interface ActionPrincipale {
  etiquette: string
  /** Formulaire validé par le bouton (attribut `form`) ; sinon `surClic`. */
  formulaire?: string
  surClic?: () => void
  enCours?: boolean
  inactif?: boolean
}

export interface MessageEcran {
  texte: string
  type?: 'ok' | 'alerte' | 'info'
}

interface Props {
  titre: string
  /** Code court de l'écran (« REC-01 ») ; par défaut celui du menu. */
  code?: string
  sousTitre?: ReactNode
  message?: MessageEcran | null
  principal?: ActionPrincipale | null
  /** Boutons secondaires, à gauche du bouton principal. */
  children?: ReactNode
}

function declencher(principal: ActionPrincipale) {
  if (principal.formulaire !== undefined) {
    const formulaire = document.getElementById(principal.formulaire)
    if (formulaire instanceof HTMLFormElement) formulaire.requestSubmit()
  } else {
    principal.surClic?.()
  }
}

export function EnTeteEcran({ titre, code, sousTitre, message, principal, children }: Props) {
  const { pathname } = useLocation()
  const codeEcran = code ?? ENTREES_MENU.find((e) => e.chemin === pathname)?.code
  const bloque = principal != null && (principal.enCours === true || principal.inactif === true)
  useTouches(principal == null ? {} : { F8: { libelle: principal.etiquette, action: () => declencher(principal), inactif: bloque } })

  return (
    <div className="entete-ecran">
      {codeEcran !== undefined && <span className="entete-ecran-code">{codeEcran}</span>}
      <h1>{titre}</h1>
      {sousTitre !== undefined && <span className="entete-ecran-sous-titre">{sousTitre}</span>}
      <span className="entete-ecran-espace" />
      {message != null && (
        <span className={`entete-ecran-message entete-ecran-message-${message.type ?? 'info'}`} role="status">{message.texte}</span>
      )}
      {children}
      {/* « F8 » est un repère visuel : le nom du bouton reste son action, la touche est donnée par aria-keyshortcuts. */}
      {principal != null && (
        principal.formulaire !== undefined ? (
          <button type="submit" form={principal.formulaire} className="bouton-principal" disabled={bloque} aria-keyshortcuts="F8">
            <span className="touche-f8" aria-hidden="true">F8</span>{principal.etiquette}
          </button>
        ) : (
          <button type="button" className="bouton-principal" disabled={bloque} onClick={() => declencher(principal)} aria-keyshortcuts="F8">
            <span className="touche-f8" aria-hidden="true">F8</span>{principal.etiquette}
          </button>
        )
      )}
    </div>
  )
}
