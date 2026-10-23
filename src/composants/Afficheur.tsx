// Afficheur d'une balance ou d'un analyseur (maquette MES : afficheur sombre) : la valeur lue sur l'appareil se tape
// dedans, en grands chiffres. Aucune lecture automatique n'existe : la tête de l'afficheur le dit (« Saisie manuelle »).
// Une ou deux lignes (contenant vide puis plein) ; le pied montre un aperçu déjà prévu par l'écran (huile du contenant).
import type { ReactNode } from 'react'
import { erreurSaisieNumerique } from '../format/validationNumerique'

export interface LigneAfficheur {
  id: string
  /** Libellé court à gauche des chiffres (« Contenant n° 3 », « Vide »). */
  libelle: string
  /** Nom complet de la saisie pour les lecteurs d'écran et les essais (« Poids du contenant (kg) »). */
  nom: string
  valeur: string
  surChangement: (valeur: string) => void
  invalide?: boolean
  autoFocus?: boolean
  placeholder?: string
  decimales?: number
}

interface Props {
  titre: string
  /** Texte à droite de la tête : d'où vient la valeur. */
  source?: string
  lignes: readonly LigneAfficheur[]
  unite: string
  pied?: ReactNode
  /** Message sous l'afficheur quand une saisie est illisible. */
  erreur?: string
}

export function Afficheur({ titre, source, lignes, unite, pied, erreur }: Props) {
  const probleme = erreur ?? lignes.map((ligne) => erreurSaisieNumerique(ligne.valeur, 'decimal', ligne.decimales)).find((message) => message !== undefined)
  return (
    <div className="mes-champ">
      <div className="mes-afficheur">
        <div className="mes-afficheur-tete">
          <span>{titre}</span>
          {source !== undefined && <span className="mes-afficheur-source">{source}</span>}
        </div>
        {lignes.map((ligne) => (
          <div key={ligne.id} className="mes-afficheur-ligne">
            <label htmlFor={ligne.id}>{ligne.libelle}</label>
            <input
              id={ligne.id}
              aria-label={ligne.nom}
              aria-invalid={ligne.invalide === true || erreurSaisieNumerique(ligne.valeur, 'decimal', ligne.decimales) !== undefined}
              inputMode="decimal"
              autoComplete="off"
              placeholder={ligne.placeholder ?? '0'}
              value={ligne.valeur}
              autoFocus={ligne.autoFocus}
              onChange={(e) => ligne.surChangement(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' || e.altKey || e.ctrlKey || e.shiftKey || e.nativeEvent.isComposing) return
                const position = lignes.findIndex((l) => l.id === ligne.id)
                const suivante = lignes[position + 1]
                if (suivante === undefined) return
                e.preventDefault()
                document.getElementById(suivante.id)?.focus()
              }}
            />
            <span className="mes-afficheur-unite">{unite}</span>
          </div>
        ))}
        {pied !== undefined && pied !== null && <p className="mes-afficheur-pied">{pied}</p>}
      </div>
      {probleme !== undefined && <p className="mes-champ-erreur" role="alert">{probleme}</p>}
    </div>
  )
}
