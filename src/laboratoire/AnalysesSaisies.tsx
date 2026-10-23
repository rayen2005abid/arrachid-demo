import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useLecture } from '../api/useLecture'
import { Note } from '../composants/Note'
import { Panneau } from '../composants/Panneau'
import { Pastille, type TonPastille } from '../composants/Pastille'
import { TableauDonnees, type Colonne } from '../composants/TableauDonnees'
import { formaterHorodatage } from '../format/dates'
import { libelles } from '../libelles'
import { afficherCentiemes, CHAMPS_ANALYSE, CHEMIN_ANALYSES, cheminCorrectionAnalyse, type AnalyseSaisie, type EtapeAnalyse } from './analyse'

const t = libelles.labo
const a = libelles.labo.analyse
const s = libelles.labo.analyse.saisies
const PERIODE_MS = 15_000
const TONS: Record<EtapeAnalyse, TonPastille> = { prix_attendu: 'alerte', prix_fixe: 'ok', prix_refuse: 'neutre', en_production: 'sombre', close: 'neutre' }

/**
 * Analyses saisies de la campagne (CONTEXTE §11.3) : ce que le labo a analysé, l'étape de la réception et ses
 * corrections. « Corriger » ouvre l'écran des corrections sur la réception, seulement quand le serveur l'accepterait
 * de cette personne (§29). `version` change après chaque analyse enregistrée : la liste est relue aussitôt.
 */
export function AnalysesSaisies({ version }: { version: number }) {
  const liste = useLecture<AnalyseSaisie[]>(CHEMIN_ANALYSES, PERIODE_MS)
  const { recharger } = liste
  useEffect(() => {
    if (version > 0) void recharger()
  }, [version, recharger])

  const colonnes: Colonne<AnalyseSaisie>[] = [
    { cle: 'reception', titre: t.colonnes.reception, rendu: (l) => l.reception.numero, nombre: true },
    { cle: 'apporteur', titre: t.colonnes.apporteur, rendu: (l) => l.reception.apporteur },
    ...CHAMPS_ANALYSE.map((champ) => ({ cle: champ, titre: a.champs[champ], rendu: (l: AnalyseSaisie) => afficherCentiemes(l[champ]), nombre: true })),
    { cle: 'variete', titre: s.variete, rendu: (l) => l.variete ?? a.varieteInconnue },
    {
      cle: 'saisie',
      titre: s.saisie,
      rendu: (l) => (
        <div className="labo-etape">
          {formaterHorodatage(l.saisi_le)}
          <span className="aide">{l.saisi_par}</span>
        </div>
      ),
    },
    {
      cle: 'etat',
      titre: s.etat,
      rendu: (l) => (
        <div className="labo-etape">
          <Pastille ton={TONS[l.etape]}>{s.etapes[l.etape]}</Pastille>
          {l.corrections > 0 && <span className="aide">{s.corrigee.replace('{nombre}', String(l.corrections))}</span>}
        </div>
      ),
    },
    {
      cle: 'action',
      titre: t.colonnes.actions,
      rendu: (l) => (l.actions_possibles.includes('corriger') ? <Link className="bouton-secondaire" to={cheminCorrectionAnalyse(l.reception.id)}>{s.corriger}</Link> : null),
    },
  ]

  const corrigeables = (liste.donnees ?? []).some((l) => l.actions_possibles.includes('corriger'))

  return (
    <Panneau titre={s.titre} icone="history" compte={liste.donnees?.length}>
      <TableauDonnees legende={s.titre} colonnes={colonnes} lignes={liste.donnees} cleLigne={(l) => l.id} vide={s.aucune} erreur={liste.erreur} />
      {corrigeables && <Note>{s.aide}</Note>}
    </Panneau>
  )
}
