import { useLecture } from '../api/useLecture'
import { Chiffres } from '../composants/Chiffres'
import { Panneau } from '../composants/Panneau'
import { Pastille } from '../composants/Pastille'
import { TableauDonnees, type Colonne } from '../composants/TableauDonnees'
import { formaterHorodatage } from '../format/dates'
import { afficherMillimes } from '../format/montants'
import { libelles } from '../libelles'
import { cheminCompte, libelleEcriture, lienPiece, texteSolde, tonSolde, type CompteDetail, type Ecriture } from './comptes'

const t = libelles.comptes

function montant(millimes: number) {
  return millimes === 0 ? '' : afficherMillimes(millimes)
}

interface Props {
  apporteurId: number
  /** Campagne lue ; null : la campagne ouverte (choix du serveur). */
  campagneId: number | null
  /** Nom déjà connu (liste), affiché avant la réponse. */
  nom: string
}

/**
 * Relevé du compte d'un apporteur (CPT-01, T5.5) : écritures datées, pièce archivée, réception et solde après chaque
 * écriture, tous calculés par le serveur. Réservé à `voir_finances` : l'écran ne le monte jamais pour un opérateur.
 */
export function ReleveCompte({ apporteurId, campagneId, nom }: Props) {
  const chemin = cheminCompte(apporteurId, campagneId)
  const detail = useLecture<{ compte: CompteDetail | null }>(chemin)
  const lu = detail.cheminLu === chemin
  const compte = lu ? (detail.donnees?.compte ?? null) : null
  const nomAffiche = compte?.apporteur.nom ?? nom

  const colonnes: Colonne<Ecriture>[] = [
    { cle: 'date', titre: t.colonnesReleve.date, rendu: (e) => formaterHorodatage(e.date), nombre: true },
    {
      cle: 'ecriture',
      titre: t.colonnesReleve.ecriture,
      rendu: (e) => `${libelleEcriture(t.types[e.type] ?? e.type, e.libelle)}${e.est_extourne ? t.extourne : ''}${e.annulee ? t.annulee : ''}`,
    },
    {
      cle: 'piece',
      titre: t.colonnesReleve.piece,
      rendu: (e) => {
        if (e.type_piece === null) return ''
        const piece = `${t.pieces[e.type_piece] ?? e.type_piece} n° ${e.piece_numero}`
        const lien = lienPiece(e)
        return lien === null ? piece : <a href={lien} target="_blank" rel="noreferrer">{piece}</a>
      },
    },
    { cle: 'reception', titre: t.colonnesReleve.reception, rendu: (e) => e.reception_numero ?? '', nombre: true },
    { cle: 'debit', titre: t.colonnesReleve.debit, rendu: (e) => montant(e.debit_millimes), nombre: true },
    { cle: 'credit', titre: t.colonnesReleve.credit, rendu: (e) => montant(e.credit_millimes), nombre: true },
    { cle: 'solde', titre: t.colonnesReleve.solde, rendu: (e) => texteSolde(e.solde_apres_millimes, afficherMillimes) },
  ]

  return (
    <Panneau
      titre={t.releve.replace('{nom}', nomAffiche)}
      icone="scroll-text"
      actions={compte === null ? undefined : <Pastille ton={tonSolde(compte.solde_millimes)}>{texteSolde(compte.solde_millimes, afficherMillimes)}</Pastille>}
      serre
    >
      {compte !== null && (
        <Chiffres
          libelle={t.totauxReleve}
          valeurs={[
            { etiquette: t.colonnes.credit, valeur: afficherMillimes(compte.credit_millimes) },
            { etiquette: t.colonnes.debit, valeur: afficherMillimes(compte.debit_millimes) },
            { etiquette: t.colonnes.ecritures, valeur: String(compte.ecritures.length) },
          ]}
        />
      )}
      <TableauDonnees
        legende={t.legendeReleve.replace('{nom}', nomAffiche)}
        colonnes={colonnes}
        lignes={lu ? (compte?.ecritures ?? []) : null}
        cleLigne={(e) => e.id}
        className="bureau-releve"
        vide={t.aucuneEcriture}
        erreur={detail.erreur}
      />
      <p className="bureau-aide">{t.aide}</p>
    </Panneau>
  )
}
