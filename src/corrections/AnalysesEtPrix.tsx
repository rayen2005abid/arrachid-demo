import { useLecture } from '../api/useLecture'
import { Champ } from '../administration/composants'
import { ChampChoix } from '../composants/Champ'
import { Panneau } from '../composants/Panneau'
import { TableauDonnees, type Colonne } from '../composants/TableauDonnees'
import { formaterHorodatage } from '../format/dates'
import { afficherMillimes } from '../format/montants'
import { afficherCentiemes, CHAMPS_ANALYSE, CHEMIN_VARIETES, varietesActives, type ChampAnalyse, type SaisieAnalyse, type Variete } from '../laboratoire/analyse'
import { libelles } from '../libelles'
import type { AnalyseOlive, DecisionPrix, Erreurs } from './logique'

const t = libelles.corrections
const a = libelles.labo.analyse

interface PropsChampsAnalyse {
  saisie: SaisieAnalyse
  surChangement: (champ: ChampAnalyse, valeur: string) => void
  varieteId: string
  surVariete: (valeur: string) => void
  erreurs: Erreurs
  /** Le serveur a signalé une valeur inhabituelle : la prochaine validation la confirme. */
  aConfirmer: boolean
}

/** Les quatre résultats de l'analyseur et la variété, pré-remplis avec l'analyse en vigueur (T3.7). */
export function ChampsAnalyse({ saisie, surChangement, varieteId, surVariete, erreurs, aConfirmer }: PropsChampsAnalyse) {
  const varietes = useLecture<Variete[]>(CHEMIN_VARIETES)
  return (
    <>
      {CHAMPS_ANALYSE.map((champ, rang) => (
        <Champ
          key={champ}
          id={champ}
          libelle={a.champs[champ]}
          valeur={saisie[champ]}
          surChangement={(valeur) => surChangement(champ, valeur)}
          erreur={erreurs[champ]}
          inputMode="decimal"
          decimales={2}
          autoFocus={rang === 0}
        />
      ))}
      <ChampChoix
        id="variete"
        libelle={a.variete}
        valeur={varieteId}
        surChangement={surVariete}
        choixVide={a.varieteInconnue}
        options={varietesActives(varietes.donnees ?? []).map((v) => ({ valeur: String(v.id), libelle: v.libelle }))}
      />
      {aConfirmer && <p className="mes-champ-aide">{a.aideConfirmation}</p>}
    </>
  )
}

const colonnesAnalyses: Colonne<AnalyseOlive>[] = [
  { cle: 'reference', titre: t.echantillon, rendu: (l) => l.reference },
  ...CHAMPS_ANALYSE.map((champ): Colonne<AnalyseOlive> => ({ cle: champ, titre: a.champs[champ], nombre: true, rendu: (l) => afficherCentiemes(l[champ]) })),
  { cle: 'variete', titre: a.variete, rendu: (l) => l.variete ?? a.varieteInconnue },
  { cle: 'heure', titre: t.heure, rendu: (l) => formaterHorodatage(l.saisi_le) },
  { cle: 'par', titre: t.par, rendu: (l) => l.saisi_par },
  { cle: 'etat', titre: t.etat, rendu: (l) => (l.active ? t.actif : t.remplace) },
]

/** Analyses de la réception : celle en vigueur et celles qu'une correction a remplacées. */
export function TableauAnalyses({ analyses }: { analyses: readonly AnalyseOlive[] }) {
  if (analyses.length === 0) return null
  return (
    <Panneau titre={t.analyses} icone="flask-conical" compte={analyses.length} serre>
      <TableauDonnees legende={t.legendeAnalyses} colonnes={colonnesAnalyses} lignes={analyses} cleLigne={(l) => l.id} vide=""
        classeLigne={(l) => (l.active ? undefined : 'ligne-inactive')} />
    </Panneau>
  )
}

const colonnesPrix: Colonne<DecisionPrix>[] = [
  { cle: 'unite', titre: t.unite, rendu: (l) => t.unitesPrix[l.unite_prix] },
  { cle: 'prix', titre: t.prixUnitaire, nombre: true, rendu: (l) => (l.prix_unitaire_millimes_kg === null ? '—' : afficherMillimes(l.prix_unitaire_millimes_kg)) },
  { cle: 'decision', titre: t.decision, rendu: (l) => t.decisions[l.statut] },
  { cle: 'heure', titre: t.heure, rendu: (l) => formaterHorodatage(l.valide_le) },
  { cle: 'par', titre: t.par, rendu: (l) => l.valide_par },
  { cle: 'etat', titre: t.etat, rendu: (l) => (l.active ? t.actif : t.prixRemplace) },
]

/** Décisions de prix de la réception : celle en vigueur et celles qu'une correction a remplacées. */
export function TableauPrix({ prix }: { prix: readonly DecisionPrix[] }) {
  if (prix.length === 0) return null
  return (
    <Panneau titre={t.prix} icone="tag" compte={prix.length} serre>
      <TableauDonnees legende={t.legendePrix} colonnes={colonnesPrix} lignes={prix} cleLigne={(l) => l.id} vide=""
        classeLigne={(l) => (l.active ? undefined : 'ligne-inactive')} />
    </Panneau>
  )
}
