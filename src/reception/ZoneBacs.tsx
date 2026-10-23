// Grille de la zone de réception (déchargement et pesée directe) : un clic ajoute ou retire un bac libre du champ texte,
// qui reste la référence ; un bac occupé montre son apporteur et son heure. Le serveur refuse un bac déjà plein.
import type { Bac } from '../bacs/logique'
import { compter, trierParNumero } from '../bacs/logique'
import { Note } from '../composants/Note'
import { Panneau } from '../composants/Panneau'
import { libelles } from '../libelles'
import { basculerBac, heureLocale, lireBacs } from './logique'

const t = libelles.reception

interface Props {
  grille: { donnees: Bac[] | null; erreur: string | null }
  texte: string
  surChanger: (texte: string) => void
}

export function ZoneBacs({ grille, texte, surChanger }: Props) {
  const selectionnes = lireBacs(texte) ?? []
  const liste = trierParNumero(grille.donnees ?? [])
  const nombres = compter(liste)
  const legende = [
    t.legende.libre.replace('{nombre}', String(nombres.libres)),
    t.legende.occupe.replace('{nombre}', String(nombres.occupes)),
    t.legende.selection.replace('{nombre}', String(selectionnes.length)),
  ].join(' · ')
  return (
    <Panneau titre={t.zone} icone="grid-3x3" compte={legende}>
      {grille.erreur !== null && <Note ton="erreur">{grille.erreur}</Note>}
      <div className="pont-bacs">
        {liste.map((bac) => {
          const occupe = bac.etat === 'occupe'
          const choisi = !occupe && selectionnes.includes(bac.numero)
          return (
            <button
              key={bac.id}
              type="button"
              className="pont-bac"
              disabled={occupe}
              aria-pressed={choisi}
              aria-label={`${t.selectionner} ${bac.libelle}`}
              title={occupe && bac.occupation !== null ? t.occupeDepuis.replace('{nom}', bac.occupation.apporteur).replace('{heure}', heureLocale(bac.occupation.occupe_le)) : undefined}
              onClick={() => surChanger(basculerBac(texte, bac.numero))}
            >
              <span className="pont-bac-numero">{bac.numero}</span>
              {occupe && bac.occupation !== null ? (
                <small>{bac.occupation.apporteur}<br />{heureLocale(bac.occupation.occupe_le)}</small>
              ) : (
                <small>{choisi ? t.bacChoisi : t.bacLibre}</small>
              )}
            </button>
          )
        })}
      </div>
    </Panneau>
  )
}
