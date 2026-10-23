// Calendrier du mois : un clic sur un jour affiche sa semaine dans l'agenda. Le jour courant est encadré, la semaine
// affichée est en rouge.
import { Icone } from '../composants/Icone'
import { libelles } from '../libelles'
import { ajouterJours, dateCourte, grilleMois, libelleMois, numeroDuJour } from './logique'

const t = libelles.tableauDeBord

interface Props {
  /** Un jour du mois affiché. */
  mois: string
  /** Lundi de la semaine affichée dans l'agenda. */
  lundi: string
  aujourdhui: string
  surJour: (jour: string) => void
  surMois: (decalage: number) => void
}

export function Calendrier({ mois, lundi, aujourdhui, surJour, surMois }: Props) {
  const finSemaine = ajouterJours(lundi, 6)
  return (
    <section className="tdb-calendrier" aria-label={t.calendrier.nom}>
      <header>
        <button type="button" className="tdb-nav" aria-label={t.calendrier.precedent} onClick={() => surMois(-1)}><Icone nom="chevron-left" /></button>
        <strong>{libelleMois(mois)}</strong>
        <button type="button" className="tdb-nav" aria-label={t.calendrier.suivant} onClick={() => surMois(1)}><Icone nom="chevron-right" /></button>
      </header>
      <table>
        <thead>
          <tr>{t.joursCourts.map((j, i) => <th key={i} scope="col" abbr={t.jours[i]}>{j}</th>)}</tr>
        </thead>
        <tbody>
          {grilleMois(mois).map((semaine) => (
            <tr key={semaine[0].jour}>
              {semaine.map(({ jour, horsMois }) => (
                <td key={jour} className={[horsMois ? 'hors' : '', jour >= lundi && jour <= finSemaine ? 'semaine' : '', jour === aujourdhui ? 'auj' : ''].filter(Boolean).join(' ')}>
                  <button type="button" aria-label={dateCourte(jour)} aria-current={jour === aujourdhui ? 'date' : undefined} onClick={() => surJour(jour)}>
                    <span>{numeroDuJour(jour)}</span>
                  </button>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="tdb-legende">{t.calendrier.legende}</p>
    </section>
  )
}
