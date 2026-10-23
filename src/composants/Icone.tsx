// Icône en SVG dans la page (formes de icones.ts, licence ISC dans LICENSE-Lucide.txt).
// Toujours décorative : cachée aux lecteurs d'écran, le texte voisin dit ce qu'elle montre. Taille donnée par le CSS.
import { createElement } from 'react'
import { ICONES, type NomIcone } from './icones'

export function Icone({ nom, className }: { nom: NomIcone; className?: string }) {
  return (
    <svg
      className={className === undefined ? 'mes-icone' : `mes-icone ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICONES[nom].map(([balise, attributs], rang) => createElement(balise, { key: rang, ...attributs }))}
    </svg>
  )
}
