// Agenda de la semaine, de 06:00 à 22:00 par cases de 30 minutes. Double-clic sur une case : nouveau rendez-vous à
// cette heure (F2 au clavier). Les rendez-vous sont un aide-mémoire du poste, rangés par `logique.ts`.
import { useEffect, useRef } from 'react'
import { Icone } from '../composants/Icone'
import { libelles } from '../libelles'
import {
  ajouterJours, CASES_AGENDA, DEBUT_AGENDA, heureTexte, PAS_AGENDA, placeRdv, type RendezVous,
} from './logique'

const t = libelles.tableauDeBord
const k = t.agenda
const HAUTEUR_CASE = 26

interface Props {
  lundi: string
  aujourdhui: string
  /** Minutes depuis minuit à Tunis, pour la ligne « maintenant ». */
  maintenant: number
  rendezVous: readonly RendezVous[]
  surSemaine: (decalage: number) => void
  surAujourdhui: () => void
  surNouveau: (jour: string, debut: string) => void
  surVoir: (rdv: RendezVous) => void
}

export function Agenda({ lundi, aujourdhui, maintenant, rendezVous, surSemaine, surAujourdhui, surNouveau, surVoir }: Props) {
  const jours = t.jours.map((nom, i) => ({ nom, jour: ajouterJours(lundi, i) }))
  const cases = Array.from({ length: CASES_AGENDA }, (_, i) => DEBUT_AGENDA + i * PAS_AGENDA)
  const corps = useRef<HTMLDivElement>(null)
  // La grille s'ouvre vers 07:30 : avant, le moulin ne tourne pas.
  useEffect(() => {
    if (corps.current !== null) corps.current.scrollTop = 3 * HAUTEUR_CASE
  }, [])
  const enCours = (maintenant - DEBUT_AGENDA) / PAS_AGENDA
  return (
    <section className="tdb-agenda" aria-label={k.nom}>
      <div className="tdb-agenda-barre">
        <span className="tdb-semaine">
          {k.semaine.replace('{debut}', `${lundi.slice(8)}/${lundi.slice(5, 7)}/${lundi.slice(0, 4)}`).replace('{fin}', `${jours[6].jour.slice(8)}/${jours[6].jour.slice(5, 7)}/${jours[6].jour.slice(0, 4)}`)}
        </span>
        <button type="button" className="tdb-nav" title={`${k.precedente} (F5)`} aria-label={k.precedente} onClick={() => surSemaine(-1)}><Icone nom="chevron-left" /></button>
        <button type="button" className="tdb-aujourdhui" title="F6" onClick={surAujourdhui}>{k.cetteSemaine}</button>
        <button type="button" className="tdb-nav" title={`${k.suivante} (F7)`} aria-label={k.suivante} onClick={() => surSemaine(1)}><Icone nom="chevron-right" /></button>
        <span className="tdb-aide">{k.aide}</span>
      </div>
      <div className="tdb-agenda-tete">
        <div>{k.heure}</div>
        {jours.map(({ nom, jour }) => <div key={jour} className={jour === aujourdhui ? 'auj' : undefined}>{nom} {Number(jour.slice(8))}</div>)}
      </div>
      <div ref={corps} className="tdb-agenda-corps">
        <div className="tdb-grille">
          <div className="tdb-heures">
            {cases.map((m) => <div key={m} className={m % 60 === 0 ? 'plein' : undefined} style={{ height: HAUTEUR_CASE }}>{heureTexte(m)}</div>)}
          </div>
          {jours.map(({ jour }) => (
            <div key={jour} className={`tdb-jour${jour === aujourdhui ? ' auj' : ''}`}>
              {cases.map((m, i) => (
                <div key={m} className={`tdb-case${Math.floor(i / 2) % 2 === 0 ? ' alt' : ''}`} style={{ height: HAUTEUR_CASE }} onDoubleClick={() => surNouveau(jour, heureTexte(m))} />
              ))}
              {rendezVous.filter((r) => r.jour === jour).map((r) => {
                const { debut, hauteur } = placeRdv(r)
                return (
                  <button
                    key={r.id}
                    type="button"
                    className={`tdb-rdv tdb-rdv-${r.categorie}`}
                    title={`${r.debut}–${r.fin} · ${r.objet}`}
                    style={{ top: debut * HAUTEUR_CASE + 1, height: hauteur * HAUTEUR_CASE - 2 }}
                    onClick={() => surVoir(r)}
                  >
                    {r.objet}
                    <b>{r.debut}–{r.fin}{r.detail !== '' ? ` · ${r.detail}` : ''}</b>
                  </button>
                )
              })}
              {jour === aujourdhui && enCours >= 0 && enCours <= CASES_AGENDA && <div className="tdb-maintenant" style={{ top: enCours * HAUTEUR_CASE }} aria-hidden="true" />}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
