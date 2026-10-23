// Situation du jour : comptes que le serveur donne déjà aux écrans, relus toutes les 15 secondes. Une ligne dont la
// lecture manque n'est pas affichée (jamais de zéro inventé). Chaque ligne ouvre l'écran qui en montre le détail.
import { Link } from 'react-router-dom'
import { useLecture } from '../api/useLecture'
import { Panneau } from '../composants/Panneau'
import { formaterHorodatage } from '../format/dates'
import { libelles } from '../libelles'
import type { EntreeMenu } from '../navigation'
import type { LectureSession } from '../caisse/sessions'
import type { Registre } from '../cuves/logique'
import { cheminDuJour, type Piece } from '../tickets/logique'
import type { File as FileTrituration } from '../triturations/logique'
import type { EtatServeur } from '../types'
import { lignesSituation } from './logique'

const t = libelles.tableauDeBord.situation
const PERIODE_MS = 15_000

interface Props {
  jour: string
  /** Écrans visibles de l'utilisateur, par code. */
  entrees: ReadonlyMap<string, EntreeMenu>
  etat: EtatServeur | null
}

const sms = (etat: EtatServeur | null) => {
  const echec = (etat as { sms?: { echec?: unknown } } | null)?.sms?.echec
  return typeof echec === 'number' ? echec : null
}

export function Situation({ jour, entrees, etat }: Props) {
  const tickets = useLecture<Piece[]>(cheminDuJour(jour), PERIODE_MS)
  const remorques = useLecture<{ statut: string }[]>('/api/receptions/en-attente', PERIODE_MS)
  const bacs = useLecture<{ etat: string }[]>('/api/bacs-reception/grille', PERIODE_MS)
  const labo = useLecture<{ etape: string }[]>('/api/laboratoire/file', PERIODE_MS)
  const prix = useLecture<unknown[]>('/api/prix/en-attente', PERIODE_MS)
  const cuves = useLecture<Registre>('/api/cuves/registre', PERIODE_MS)
  const caisse = useLecture<LectureSession>('/api/caisse/session', PERIODE_MS)
  const production = useLecture<FileTrituration>('/api/triturations', PERIODE_MS)

  const lignes = lignesSituation({
    ticketsDuJour: tickets.donnees,
    remorques: remorques.donnees,
    bacs: bacs.donnees,
    fileLabo: labo.donnees,
    prixEnAttente: prix.donnees,
    cuves: cuves.donnees?.cuves ?? null,
    caisseOuverte: caisse.donnees === null ? null : caisse.donnees.session_caisse !== null,
    smsEnEchec: sms(etat),
  }).filter((ligne) => entrees.has(ligne.code))

  const lignesProduction = production.donnees?.lignes ?? []
  const passages = production.donnees?.passages ?? []

  return (
    <Panneau titre={`${t.titre} — ${jour.slice(8, 10)}/${jour.slice(5, 7)}/${jour.slice(0, 4)}`} icone="clipboard-list" serre className="tdb-situation">
      {lignes.length === 0 && lignesProduction.length === 0 ? (
        <p className="tdb-vide">{t.indisponible}</p>
      ) : (
        <ul className="tdb-lignes">
          {lignes.map((ligne) => (
            <li key={ligne.id}>
              <Link to={entrees.get(ligne.code)!.chemin}>
                <span>{ligne.libelle}</span>
                <b className={ligne.alerte ? 'alerte' : undefined}>{ligne.valeur}</b>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {lignesProduction.length > 0 && entrees.has('PRD-02') && (
        <ul className="tdb-production">
          {lignesProduction.map((ligne) => {
            const passage = passages.find((p) => p.ligne.id === ligne.id && p.statut === 'en_cours')
            return (
              <li key={ligne.id}>
                <Link to={entrees.get('PRD-02')!.chemin} className={passage !== undefined ? 'marche' : undefined}>
                  <i aria-hidden="true" />
                  {ligne.libelle} : {passage !== undefined ? t.enMarche : t.alArret}
                  <small>
                    {passage !== undefined
                      ? t.passageDepuis.replace('{num}', String(passage.numero)).replace('{heure}', passage.debut === null ? '—' : formaterHorodatage(passage.debut).slice(11))
                      : t.aucunPassage}
                  </small>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Panneau>
  )
}
