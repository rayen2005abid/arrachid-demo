import { Note } from '../composants/Note'
import { Panneau } from '../composants/Panneau'
import { Pastille } from '../composants/Pastille'
import { TableauDonnees, type Colonne } from '../composants/TableauDonnees'
import { formaterHorodatage } from '../format/dates'
import { grouperMilliers } from '../format/saisie'
import { libelles } from '../libelles'
import { ticketsAffiches, type ReceptionTrouvee, type ResultatRecherche } from './receptions'

const t = libelles.rechercheReception

const COLONNES: readonly Colonne<ReceptionTrouvee>[] = [
  { cle: 'ticket', titre: t.colonnes.ticket, rendu: (r) => <span className="chiffres">{ticketsAffiches(r)}</span> },
  { cle: 'reception', titre: t.colonnes.reception, rendu: (r) => r.numero, nombre: true },
  { cle: 'apporteur', titre: t.colonnes.apporteur, rendu: (r) => r.apporteur_nom },
  { cle: 'arrivee', titre: t.colonnes.arrivee, rendu: (r) => <span className="chiffres">{formaterHorodatage(r.cree_le)}</span> },
  { cle: 'net', titre: t.colonnes.net, rendu: (r) => (r.net_kg === null ? '—' : grouperMilliers(r.net_kg)), nombre: true },
  { cle: 'trouve', titre: t.colonnes.trouvePar, rendu: (r) => <Pastille ton="neutre">{t.trouvePar[r.trouve_par]}</Pastille> },
]

interface Props {
  resultat: ResultatRecherche
  surChoisir: (reception: ReceptionTrouvee) => void
  choisie: number | null
}

/** Plusieurs réceptions correspondent à la saisie : la personne choisit la bonne. */
export function ReceptionsTrouvees({ resultat, surChoisir, choisie }: Props) {
  return (
    <Panneau titre={t.titre} icone="search" compte={resultat.resultats.length} serre>
      <TableauDonnees
        legende={t.titre}
        colonnes={COLONNES}
        lignes={resultat.resultats}
        cleLigne={(r) => r.reception_id}
        vide={t.aucune}
        surChoisir={surChoisir}
        choisie={choisie}
      />
      {!resultat.complet && <Note ton="alerte">{t.incomplet}</Note>}
    </Panneau>
  )
}
