// Choix de l'apporteur au pont-bascule (arrivée et pesée directe) : recherche avec suggestions (↑ ↓, Entrée), carte de
// l'apporteur choisi avec « Changer », bouton « Nouvel apporteur ». Le parent garde la saisie et ouvre le dialogue.
import { useState, type KeyboardEvent, type Ref } from 'react'
import { useDiffere } from '../api/useDiffere'
import { useLecture } from '../api/useLecture'
import { cheminRecherche } from '../apporteurs/logique'
import { Icone } from '../composants/Icone'
import { libelles } from '../libelles'
import { ChampPont } from './champs'
import type { ApporteurTrouve } from './logique'

const t = libelles.reception

interface Props {
  id: string
  apporteur: ApporteurTrouve | null
  recherche: string
  surRecherche: (texte: string) => void
  surChoisir: (apporteur: ApporteurTrouve) => void
  surChanger: () => void
  /** Dialogue « Nouvel apporteur » ouvert : le champ ne prend pas le focus et le bouton disparaît. */
  nouvel: boolean
  surNouvel: () => void
  refRecherche: Ref<HTMLInputElement>
}

export function ChampApporteur({ id, apporteur, recherche, surRecherche, surChoisir, surChanger, nouvel, surNouvel, refRecherche }: Props) {
  const [indice, definirIndice] = useState(0)
  const differee = useDiffere(recherche, 250)
  const resultats = useLecture<ApporteurTrouve[]>(apporteur === null ? cheminRecherche(differee) : null)
  const liste = apporteur === null && cheminRecherche(differee) !== null ? (resultats.donnees ?? []) : []

  const choisir = (choisi: ApporteurTrouve) => {
    definirIndice(0)
    surChoisir(choisi)
  }

  const touche = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const pas = e.key === 'ArrowDown' ? 1 : -1
      definirIndice((i) => Math.min(Math.max(i + pas, 0), Math.max(liste.length - 1, 0)))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const choisi = liste[Math.min(indice, liste.length - 1)]
      if (choisi !== undefined) choisir(choisi)
    }
  }

  if (apporteur !== null) {
    return (
      <div className="mes-champ">
        <span className="mes-etiquette">{t.apporteur}</span>
        <div className="rec-choisi">
          <Icone nom="contact" />
          <span><strong>{apporteur.nom}</strong> <span className="chiffres pont-discret">{apporteur.cin_masquee ?? apporteur.matricule_fiscal} · {apporteur.telephone}</span></span>
          <button type="button" className="bouton-secondaire bouton-petit" onClick={surChanger}>{t.changer}</button>
        </div>
      </div>
    )
  }
  return (
    <>
      <ChampPont
        id={id}
        libelle={t.apporteur}
        placeholder={t.rechercheApporteur}
        aide={t.rechercheAide}
        valeur={recherche}
        surChangement={(v) => { surRecherche(v); definirIndice(0) }}
        surTouche={touche}
        refChamp={refRecherche}
        autoFocus={!nouvel}
      />
      {liste.length > 0 && (
        <ul className="pont-suggestions" role="listbox" aria-label={t.apporteur}>
          {liste.map((ap, i) => (
            <li key={ap.id}>
              <button type="button" role="option" aria-selected={i === indice} className="pont-suggestion" tabIndex={-1} onClick={() => choisir(ap)}>
                <span>{ap.nom}</span>
                <span className="chiffres pont-discret">{ap.cin_masquee ?? ap.matricule_fiscal} · {ap.telephone}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {cheminRecherche(differee) !== null && resultats.donnees?.length === 0 && <p className="pont-discret">{t.aucunApporteur}</p>}
      {!nouvel && (
        <div>
          <button type="button" className="bouton-secondaire bouton-petit" onClick={surNouvel}>{t.nouvelApporteur}</button>
        </div>
      )}
    </>
  )
}
