import type { TypePoste } from '../types'

const TRACES: Record<TypePoste, string> = {
  reception: 'M3 7h11v9H3zM14 10h4l3 3v3h-7zM7 19.3v.01M17 19.3v.01',
  laboratoire: 'M9 3h6M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2.2h12.4a1.5 1.5 0 0 0 1.3-2.2L14 9V3M7.5 15h9',
  production: 'M3 21V11l6 3.5V11l6 3.5V5h6v16zM7 21v-3M12 21v-3M17 21v-3',
  bureau: 'M3 4h18v12H3zM8 20h8M12 16v4',
}

/** Pictogramme décoratif d'un type de poste (le nom du poste est toujours écrit à côté). */
export function IconePoste({ type, taille = 28 }: { type: TypePoste; taille?: number }) {
  return (
    <svg className="acces-icone" width={taille} height={taille} viewBox="0 0 24 24" aria-hidden="true">
      <path d={TRACES[type]} />
    </svg>
  )
}

/** Poste de travail en pointillés avec point d'alerte : le poste n'est associé à rien. */
export function IconePosteVide() {
  return (
    <svg className="acces-icone" width="84" height="84" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="18" height="12" rx="2" strokeDasharray="2.6 2.2" />
      <path d="M8 20h8M12 16v4M12 7.4v3.2M12 12.6v.01" />
    </svg>
  )
}

/** Coche de sélection. */
export function IconeCoche({ taille = 16 }: { taille?: number }) {
  return (
    <svg className="acces-icone" width={taille} height={taille} viewBox="0 0 24 24" aria-hidden="true" style={{ strokeWidth: 3.2 }}>
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  )
}

/** Initiales d'un nom, pour l'avatar. */
export function initiales(nom: string): string {
  return nom.split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0]!.toUpperCase()).join('')
}
