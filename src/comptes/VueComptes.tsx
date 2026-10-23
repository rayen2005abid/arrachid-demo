import { useState } from 'react'
import { useLecture } from '../api/useLecture'
import { Champ, ChampChoix } from '../composants/Champ'
import { EtatVide } from '../composants/EtatVide'
import { ListeDetail } from '../composants/ListeDetail'
import { Panneau } from '../composants/Panneau'
import { TableauDonnees, type Colonne } from '../composants/TableauDonnees'
import { afficherMillimes } from '../format/montants'
import { libelles } from '../libelles'
import { cheminComptes, filtrerComptes, texteSolde, type CompteResume, type ListeComptes } from './comptes'
import { ReleveCompte } from './ReleveCompte'

const t = libelles.comptes
const PERIODE_MS = 10000

/**
 * Vue « Comptes des apporteurs » de l'écran Décomptes (CPT-01, T5.5 ; T-164, A3) : soldes d'une campagne à gauche,
 * avec le choix de la campagne, le relevé de l'apporteur choisi à droite, ses totaux en tête. Lecture seule,
 * `voir_finances`.
 */
export function VueComptes() {
  const [campagne, definirCampagne] = useState<number | null>(null)
  const [filtre, definirFiltre] = useState('')
  const [choisi, definirChoisi] = useState<CompteResume | null>(null)
  const chemin = cheminComptes(campagne)
  const liste = useLecture<ListeComptes>(chemin, PERIODE_MS)
  const donnees = liste.cheminLu === chemin ? liste.donnees : null
  const lignes = donnees === null ? null : filtrerComptes(donnees.comptes, filtre)

  const colonnes: Colonne<CompteResume>[] = [
    { cle: 'apporteur', titre: t.colonnes.apporteur, rendu: (c) => c.nom },
    { cle: 'cin', titre: t.colonnes.cin, rendu: (c) => c.cin_masquee ?? '', nombre: true },
    { cle: 'ecritures', titre: t.colonnes.ecritures, rendu: (c) => c.nombre_ecritures, nombre: true },
    { cle: 'solde', titre: t.colonnes.solde, rendu: (c) => texteSolde(c.solde_millimes, afficherMillimes) },
  ]

  const soldes = (
    <Panneau titre={t.titreSoldes} icone="users" compte={lignes?.length} serre>
      <div className="bureau-outils">
        <ChampChoix
          id="comptes-campagne"
          libelle={t.campagne}
          valeur={donnees?.campagne_id === null || donnees === null ? '' : String(donnees.campagne_id)}
          options={(liste.donnees?.campagnes ?? []).map((c) => ({ valeur: String(c.id), libelle: c.active ? t.enCours.replace('{libelle}', c.libelle) : c.libelle }))}
          surChangement={(valeur) => { definirCampagne(Number(valeur)); definirChoisi(null) }}
        />
        <Champ id="comptes-filtre" libelle={t.filtre} valeur={filtre} surChangement={definirFiltre} autoFocus />
      </div>
      {donnees !== null && (
        <p className="bureau-totaux">
          {t.totaux.replace('{payer}', afficherMillimes(donnees.total_a_payer_millimes)).replace('{encaisser}', afficherMillimes(donnees.total_a_encaisser_millimes))}
        </p>
      )}
      <TableauDonnees
        legende={t.legendeSoldes}
        colonnes={colonnes}
        lignes={lignes}
        cleLigne={(c) => c.apporteur_id}
        vide={donnees !== null && donnees.comptes.length === 0 ? t.aucune : t.aucunPourFiltre}
        erreur={liste.erreur}
        surChoisir={definirChoisi}
        choisie={choisi?.apporteur_id ?? null}
      />
    </Panneau>
  )

  const releve = choisi === null
    ? <Panneau titre={t.releveVide} icone="scroll-text"><EtatVide message={t.choisir} /></Panneau>
    : <ReleveCompte key={`${choisi.apporteur_id}-${campagne ?? 'ouverte'}`} apporteurId={choisi.apporteur_id} campagneId={campagne} nom={choisi.nom} />

  // Liste étroite (nom, CIN, écritures, solde) : le relevé, qui a sept colonnes, prend le reste ; les totaux débit et
  // crédit de l'apporteur choisi sont en tête de son relevé.
  return <ListeDetail liste={soldes} detail={releve} listeEtroite />
}
