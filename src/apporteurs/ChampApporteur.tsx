// Choix d'un apporteur par saisie : on tape quelques lettres du nom, du téléphone ou du CIN, les propositions
// s'affichent sous le champ, flèches + Entrée pour choisir sans lâcher le clavier. Utilisé par les écrans de saisie.
import { useId, useState, type KeyboardEvent } from 'react'
import { useDiffere } from '../api/useDiffere'
import { useLecture } from '../api/useLecture'
import { cheminRecherche, type Apporteur } from './logique'
import '../styles/pont.css'

const DELAI_FRAPPE_MS = 200

interface Props {
  id: string
  libelle: string
  valeur: Apporteur | null
  surChoix: (apporteur: Apporteur | null) => void
  aide?: string
  autoFocus?: boolean
}

export function ChampApporteur({ id, libelle, valeur, surChoix, aide, autoFocus }: Props) {
  const [saisie, definirSaisie] = useState('')
  const [indice, definirIndice] = useState(0)
  const [ferme, definirFerme] = useState(false)
  const differee = useDiffere(saisie, DELAI_FRAPPE_MS)
  const chemin = valeur === null ? cheminRecherche(differee) : null
  const resultats = useLecture<Apporteur[]>(chemin)
  const liste = chemin !== null && !ferme ? (resultats.donnees ?? []) : []
  const idListe = useId()

  const choisir = (a: Apporteur) => {
    surChoix(a)
    definirSaisie('')
    definirIndice(0)
  }

  const touche = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (liste.length === 0) return
      e.preventDefault()
      const pas = e.key === 'ArrowDown' ? 1 : -1
      definirIndice((i) => Math.min(Math.max(i + pas, 0), liste.length - 1))
    } else if (e.key === 'Enter') {
      const choisi = liste[Math.min(indice, liste.length - 1)]
      if (choisi !== undefined) {
        e.preventDefault()
        choisir(choisi)
      }
    } else if (e.key === 'Escape') {
      definirFerme(true)
    }
  }

  if (valeur !== null) {
    return (
      <div className="mes-champ">
        <span className="mes-etiquette">{libelle}</span>
        <div className="rec-choisi">
          <span>
            <strong>{valeur.nom}</strong>{' '}
            <span className="chiffres pont-discret">{valeur.cin_masquee ?? valeur.matricule_fiscal} · {valeur.telephone}</span>
          </span>
          <button type="button" className="bouton-secondaire bouton-petit" onClick={() => surChoix(null)}>Changer</button>
        </div>
      </div>
    )
  }

  return (
    <div className="mes-champ">
      <label htmlFor={id} className="mes-etiquette">{libelle}</label>
      <input
        id={id}
        className="mes-saisie"
        role="combobox"
        aria-expanded={liste.length > 0}
        aria-controls={idListe}
        aria-autocomplete="list"
        autoComplete="off"
        autoFocus={autoFocus}
        value={saisie}
        onChange={(e) => { definirSaisie(e.target.value); definirIndice(0); definirFerme(false) }}
        onKeyDown={touche}
      />
      {aide !== undefined && <p className="mes-champ-aide">{aide}</p>}
      <ul id={idListe} className="pont-suggestions" role="listbox" aria-label={libelle} hidden={liste.length === 0}>
        {liste.map((a, i) => (
          <li key={a.id}>
            <button type="button" role="option" aria-selected={i === indice} className="pont-suggestion" tabIndex={-1} onClick={() => choisir(a)}>
              <span>{a.nom}</span>
              <span className="chiffres pont-discret">{a.cin_masquee ?? a.matricule_fiscal} · {a.telephone}</span>
            </button>
          </li>
        ))}
      </ul>
      {chemin !== null && !ferme && resultats.donnees?.length === 0 && <p className="mes-champ-aide">Aucun apporteur trouvé.</p>}
    </div>
  )
}
