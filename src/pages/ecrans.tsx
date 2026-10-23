import type { ReactElement } from 'react'
import { PageDonneesManquantes } from './PageDonneesManquantes'
import { PageMiseEnService } from './PageMiseEnService'
import { PageParametres } from './PageParametres'
import { PageEquipements } from '../administration/PageEquipements'
import { PageDiagnostic } from '../administration/PageDiagnostic'
import { PageHistorique } from '../administration/PageHistorique'
import { PagePostes } from '../administration/PagePostes'
import { PageReferentiels } from '../administration/PageReferentiels'
import { PageUtilisateurs } from '../administration/PageUtilisateurs'
import { PageApporteurs } from '../apporteurs/PageApporteurs'
import { PageClients } from '../clients/PageClients'
import { PageContrats } from '../contrats/PageContrats'
import { PageChargements } from '../chargements/PageChargements'
import { PageFactures } from '../factures/PageFactures'
import { PageProfilsFiscaux } from '../profilsFiscaux/PageProfilsFiscaux'
import { PageArticles } from '../articles/PageArticles'
import { PageVentesDetail } from '../ventesDetail/PageVentesDetail'
import { PageBacs } from '../bacs/PageBacs'
import { PageCorrections } from '../corrections/PageCorrections'
import { PageJournalSms } from '../sms/PageJournalSms'
import { PageTickets } from '../tickets/PageTickets'
import { PageSaisieDifferee } from '../saisieDifferee/PageSaisieDifferee'
import { PageSaisieLabo } from '../saisieDifferee/PageSaisieLabo'
import { PageSaisieCuve } from '../saisieDifferee/PageSaisieCuve'
import { PageSaisieReglement } from '../saisieDifferee/PageSaisieReglement'
import { PageSaisieVente } from '../saisieDifferee/PageSaisieVente'
import { PageSaisieRemise } from '../saisieDifferee/PageSaisieRemise'
import { PageSaisieTrituration } from '../saisieDifferee/PageSaisieTrituration'
import { PageRattrapage } from '../saisieDifferee/PageRattrapage'
import { PageReception } from '../reception/PageReception'
import { PageAnalysesOlives } from '../laboratoire/PageAnalysesOlives'
import { PageEchantillons } from '../laboratoire/PageEchantillons'
import { PagePrix } from '../prix/PagePrix'
import { PageDecomptes } from '../decomptes/PageDecomptes'
import { PageCaisse } from '../caisse/PageCaisse'
import { PageDocuments } from '../documents/PageDocuments'
import { PageRapports } from '../documents/PageRapports'
import { PagePlanification } from '../planification/PagePlanification'
import { PageAnalysesHuile } from '../analysesHuile/PageAnalysesHuile'
import { PageCuves } from '../cuves/PageCuves'
import { PageRemise } from '../partages/PageRemise'
import { PageFile } from '../triturations/PageFile'
import { PagePesees } from '../triturations/PagePesees'
import { PageRendement } from '../triturations/PageRendement'
import { PageTableauDeBord } from '../tableauDeBord/PageTableauDeBord'

// Table des écrans construits. Clé = `chemin` d'une entrée de `src/navigation.ts`.
// Tout chemin absent de cette table affiche « Écran disponible prochainement ».
// Round 2 : T1.7 ajoute ici ses écrans d'administration, par exemple
//   '/administration/utilisateurs': <PageUtilisateurs />,
export const ECRANS: Record<string, ReactElement> = {
  // Tableau de bord du propriétaire et du responsable
  '/tableau-de-bord': <PageTableauDeBord />,
  // T1.6
  '/administration/parametres': <PageParametres />,
  '/administration/donnees-manquantes': <PageDonneesManquantes />,
  // T1.7 — administration
  '/administration/utilisateurs': <PageUtilisateurs />,
  '/administration/postes': <PagePostes />,
  '/administration/diagnostic': <PageDiagnostic />,
  '/administration/equipements': <PageEquipements vue="metier" />,
  '/administration/equipements-reseau': <PageEquipements vue="reseau" />,
  '/administration/referentiels': <PageReferentiels />,
  '/administration/historique': <PageHistorique />,
  // T2.10 — réception au pont-bascule
  '/receptions': <PageReception />,
  '/chargements': <PageChargements />,
  // T2.1 — apporteurs
  '/apporteurs': <PageApporteurs />,
  // T6.1 — clients
  '/bureau/clients': <PageClients />,
  // T6.3 — contrats
  '/bureau/contrats': <PageContrats />,
  '/bureau/factures': <PageFactures />,
  '/bureau/ventes-detail': <PageVentesDetail />,
  // T6.2 — profils fiscaux
  '/administration/profils-fiscaux': <PageProfilsFiscaux />,
  '/administration/articles': <PageArticles />,
  // T2.7 — corrections de la réception
  '/bureau/corrections': <PageCorrections />,
  '/bureau/saisie-differee': <PageSaisieDifferee />,
  // T3.9 — reprise de la fiche papier du laboratoire
  '/bureau/saisie-differee-labo': <PageSaisieLabo />,
  // T4.11 — reprise des fiches papier de trituration, de remise d'huile et de cuve
  '/bureau/saisie-differee-trituration': <PageSaisieTrituration />,
  '/bureau/saisie-differee-remise': <PageSaisieRemise />,
  '/bureau/saisie-differee-cuve': <PageSaisieCuve />,
  '/bureau/saisie-differee-reglement': <PageSaisieReglement />,
  '/bureau/saisie-differee-vente': <PageSaisieVente />,
  // Refonte UI (T-164) : page de liens vers les fiches papier et les corrections
  '/bureau/rattrapage': <PageRattrapage />,
  // T2.3 — bacs
  '/bacs': <PageBacs />,
  // T2.5 — journal SMS
  '/bureau/journal-sms': <PageJournalSms />,
  // T2.4 — tickets (recherche, réimpression, aperçu)
  '/tickets': <PageTickets />,
  // T3.1, T3.2 — Analyses d'olives : file du labo et saisie d'analyse sur un même écran (T-164, A3) ; registre des
  // échantillons
  '/laboratoire/file': <PageAnalysesOlives />,
  '/laboratoire/analyses': <PageAnalysesOlives />,
  '/laboratoire/echantillons': <PageEchantillons />,
  // T3.4 — prix d'achat
  '/bureau/prix': <PagePrix />,
  // T5.1, T5.2, T5.5 — Décomptes : décomptes, paiements et comptes des apporteurs sur un même écran (T-164, A3)
  '/bureau/decomptes': <PageDecomptes />,
  '/bureau/caisse': <PageCaisse />,
  '/bureau/comptes-apporteurs': <PageDecomptes />,
  // T5.6 — fiche lot, registre journalier, rapport des corrections
  '/bureau/documents': <PageDocuments />,
  '/bureau/rapports': <PageRapports />,
  // T3.8 — planification des triturations
  '/production/planification': <PagePlanification />,
  // T4.4 — file de trituration : former un passage, le démarrer, finir la production
  '/production/file': <PageFile />,
  // T4.5 — trituration en cours : pesées d'huile vers une cuve ou un tampon
  '/production/en-cours': <PagePesees />,
  // T4.6 — remise d'huile : partage, contenants de l'agriculteur, clôture
  '/production/remise-huile': <PageRemise />,
  // T4.7 — contrôle de rendement : verdict de chaque passage, justification du responsable
  '/production/rendement': <PageRendement />,
  // T4.8 — analyses d'huile : prélèvement, acidité, reclassement d'une cuve
  '/production/analyses-huile': <PageAnalysesHuile />,
  // T4.1 — registre des cuves (liste, et détail avec `?cuve=<id>`)
  '/production/cuves': <PageCuves />,
}

// Écran de première mise en service (route `/mise-en-service`, hors menu) : T1.6 le remplace.
export const ECRAN_MISE_EN_SERVICE: ReactElement = <PageMiseEnService />
