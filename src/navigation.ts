import type { NomIcone } from './composants/icones'
import { libelles } from './libelles'
import type { Role, TypePoste } from './types'

// UNIQUE définition du menu (PROMPT §6.20.3). Pour ajouter ou remplacer un écran :
// 1. ajouter/modifier une entrée ci-dessous (chemin, libellé, permission requise, onglet, icône) ;
// 2. associer le chemin à son composant dans `src/pages/ecrans.tsx` (sinon : écran « disponible prochainement »).
//
// Refonte de l'interface (T-164) : chaque écran appartient à un onglet de son module. Un onglet regroupe des routes
// existantes ; chacune en est un sous-onglet. Un onglet n'apparaît que si l'une de ses routes est visible.

export type Groupe = 'tableau' | 'reception' | 'laboratoire' | 'production' | 'bureau' | 'administration'

export type IdOnglet =
  | 'tableau-de-bord' | 'pont-bascule' | 'bacs' | 'apporteurs' | 'tickets' | 'chargements'
  | 'analyses-olives' | 'echantillons'
  | 'planification' | 'trituration' | 'remise-huile' | 'rendement' | 'cuves'
  | 'caisse' | 'decomptes' | 'ventes' | 'prix' | 'documents' | 'rattrapage'
  | 'donnees-manquantes' | 'diagnostic' | 'parametres' | 'utilisateurs' | 'postes' | 'equipements' | 'adresses'
  | 'referentiels' | 'historique'

export interface EntreeMenu {
  chemin: string
  /** Code court affiché dans l'en-tête de l'écran (maquette MES : « REC-01 »). */
  code: string
  /** Nom de l'écran (carte de l'accueil, écran pas encore construit). */
  libelle: string
  groupe: Groupe
  /** Permission du serveur (`session.permissions`) nécessaire pour voir l'entrée. */
  permission: string
  /** Types de poste où un `operateur` voit l'entrée (responsable et propriétaire : tous les postes). */
  postesOperateur?: readonly TypePoste[]
  /** Onglet de la coquille qui regroupe l'écran (T-164). */
  onglet: IdOnglet
  /** Icône du sous-onglet, et de l'onglet quand l'écran y est seul visible. */
  icone: NomIcone
  /** Libellé du sous-onglet (T-164, A2) ; sans lui, l'écran est seul dans son onglet et en prend le libellé. */
  sousOnglet?: string
  /**
   * Route de l'onglet sans sous-onglet : une fiche ouverte depuis la page de liens (Rattrapage), ou la seconde adresse
   * d'un écran réuni (LAB-03, CPT-01).
   */
  horsBarre?: true
}

const e = libelles.ecrans
const s = libelles.sousOnglets

export const ENTREES_MENU: readonly EntreeMenu[] = [
  // Tableau de bord : module à part, réservé au responsable et au propriétaire (`voir_finances`, R/P). Les écrans
  // « Pilotage » et « Aujourd'hui au bureau » de la maquette ne sont pas dans la bêta.
  { chemin: '/tableau-de-bord', code: 'TDB-01', libelle: e.tableauDeBord, groupe: 'tableau', permission: 'voir_finances', onglet: 'tableau-de-bord', icone: 'layout-dashboard' },

  { chemin: '/receptions', code: 'REC-01', libelle: e.reception, groupe: 'reception', permission: 'receptionner', onglet: 'pont-bascule', icone: 'scale' },
  { chemin: '/apporteurs', code: 'APP-01', libelle: e.apporteurs, groupe: 'reception', permission: 'gerer_apporteurs', onglet: 'apporteurs', icone: 'contact' },
  { chemin: '/bacs', code: 'BAC-01', libelle: e.bacs, groupe: 'reception', permission: 'liberer_bac', postesOperateur: ['production', 'reception'], onglet: 'bacs', icone: 'grid-3x3' },
  { chemin: '/tickets', code: 'TIC-01', libelle: e.tickets, groupe: 'reception', permission: 'imprimer_piece', postesOperateur: ['reception'], onglet: 'tickets', icone: 'ticket' },
  { chemin: '/chargements', code: 'CHG-01', libelle: e.chargements, groupe: 'reception', permission: 'charger_citerne', onglet: 'chargements', icone: 'truck' },

  // Analyses d'olives (T-164, A3) : LAB-01 et LAB-03 ouvrent le même écran ; la seconde adresse reste valable, hors
  // de la barre des sous-onglets, et ouvre l'écran sur la saisie d'analyse.
  { chemin: '/laboratoire/file', code: 'LAB-01', libelle: e.fileLabo, groupe: 'laboratoire', permission: 'analyser', onglet: 'analyses-olives', icone: 'list' },
  { chemin: '/laboratoire/echantillons', code: 'LAB-02', libelle: e.echantillons, groupe: 'laboratoire', permission: 'gerer_echantillons', onglet: 'echantillons', icone: 'test-tube' },
  { chemin: '/laboratoire/analyses', code: 'LAB-03', libelle: e.saisieAnalyse, groupe: 'laboratoire', permission: 'analyser', onglet: 'analyses-olives', icone: 'flask-conical', horsBarre: true },

  // T3.8 : l'opérateur planifie à la production et au bureau (permission `planifier`).
  { chemin: '/production/planification', code: 'PLN-01', libelle: e.planification, groupe: 'production', permission: 'planifier', onglet: 'planification', icone: 'calendar-clock' },
  { chemin: '/production/file', code: 'PRD-01', libelle: e.fileTrituration, groupe: 'production', permission: 'produire', onglet: 'trituration', icone: 'list-ordered', sousOnglet: s.passages },
  { chemin: '/production/en-cours', code: 'PRD-02', libelle: e.triturationEnCours, groupe: 'production', permission: 'produire', onglet: 'trituration', icone: 'weight', sousOnglet: s.peseesHuile },
  { chemin: '/production/remise-huile', code: 'PRD-03', libelle: e.remiseHuile, groupe: 'production', permission: 'remettre_huile', onglet: 'remise-huile', icone: 'droplets' },
  { chemin: '/production/rendement', code: 'PRD-05', libelle: e.controleRendement, groupe: 'production', permission: 'produire', onglet: 'rendement', icone: 'gauge' },
  { chemin: '/production/cuves', code: 'CUV-01', libelle: e.cuves, groupe: 'production', permission: 'consulter_operations', postesOperateur: ['production'], onglet: 'cuves', icone: 'cylinder', sousOnglet: s.cuves },
  { chemin: '/production/analyses-huile', code: 'PRD-04', libelle: e.analysesHuile, groupe: 'production', permission: 'analyser_huile', onglet: 'cuves', icone: 'flask-round', sousOnglet: s.analysesHuile },

  { chemin: '/bureau/prix', code: 'PRX-01', libelle: e.prix, groupe: 'bureau', permission: 'fixer_prix', onglet: 'prix', icone: 'tag' },
  // Décomptes (T-164, A3 et A9) : DEC-01 et CPT-01 ouvrent le même écran ; la seconde adresse reste valable, hors de la
  // barre des sous-onglets, et ouvre l'écran sur les comptes des apporteurs (`voir_finances`).
  { chemin: '/bureau/decomptes', code: 'DEC-01', libelle: e.decomptes, groupe: 'bureau', permission: 'emettre_decompte', onglet: 'decomptes', icone: 'file-text', sousOnglet: s.decomptes },
  { chemin: '/bureau/caisse', code: 'CAI-01', libelle: e.caisse, groupe: 'bureau', permission: 'ouvrir_caisse', onglet: 'caisse', icone: 'wallet' },
  { chemin: '/bureau/comptes-apporteurs', code: 'CPT-01', libelle: e.comptesApporteurs, groupe: 'bureau', permission: 'voir_finances', onglet: 'decomptes', icone: 'scroll-text', sousOnglet: s.comptes, horsBarre: true },
  { chemin: '/bureau/ventes-detail', code: 'VTE-01', libelle: e.ventesDetail, groupe: 'bureau', permission: 'vendre_detail', onglet: 'ventes', icone: 'shopping-bag', sousOnglet: s.comptoir },
  { chemin: '/bureau/clients', code: 'CLI-01', libelle: e.clients, groupe: 'bureau', permission: 'vendre_detail', onglet: 'ventes', icone: 'contact', sousOnglet: s.clients },
  { chemin: '/bureau/contrats', code: 'CTR-01', libelle: e.contrats, groupe: 'bureau', permission: 'gerer_contrats', onglet: 'ventes', icone: 'handshake', sousOnglet: s.contrats },
  { chemin: '/bureau/factures', code: 'FAC-01', libelle: e.factures, groupe: 'bureau', permission: 'emettre_facture', onglet: 'ventes', icone: 'receipt', sousOnglet: s.factures },
  { chemin: '/bureau/documents', code: 'DOC-01', libelle: e.documents, groupe: 'bureau', permission: 'consulter_operations', postesOperateur: ['bureau'], onglet: 'documents', icone: 'folder-open', sousOnglet: s.pieces },
  // T-164 (A10) : le seul rapport demande `voir_rapport_corrections` ; l'entrée aussi (propriétaire).
  { chemin: '/bureau/rapports', code: 'RAP-01', libelle: e.rapports, groupe: 'bureau', permission: 'voir_rapport_corrections', onglet: 'documents', icone: 'chart-column', sousOnglet: s.rapports },
  { chemin: '/bureau/journal-sms', code: 'SMS-01', libelle: e.journalSms, groupe: 'bureau', permission: 'renvoyer_sms', onglet: 'documents', icone: 'message-square', sousOnglet: s.journalSms },
  // Rattrapage (T-164, A2 et A7) : page de liens vers les fiches papier et les corrections, chacune sur sa route.
  { chemin: '/bureau/rattrapage', code: 'PAP-00', libelle: e.rattrapage, groupe: 'bureau', permission: 'saisie_differee', onglet: 'rattrapage', icone: 'notebook-pen' },
  { chemin: '/bureau/corrections', code: 'COR-01', libelle: e.corrections, groupe: 'bureau', permission: 'corriger_avant_reglement', onglet: 'rattrapage', icone: 'file-pen', sousOnglet: e.corrections, horsBarre: true },
  { chemin: '/bureau/saisie-differee', code: 'PAP-01', libelle: e.saisieDifferee, groupe: 'bureau', permission: 'saisie_differee', onglet: 'rattrapage', icone: 'scale', horsBarre: true },
  { chemin: '/bureau/saisie-differee-labo', code: 'PAP-02', libelle: e.saisieLabo, groupe: 'bureau', permission: 'saisie_differee', onglet: 'rattrapage', icone: 'flask-conical', horsBarre: true },
  { chemin: '/bureau/saisie-differee-trituration', code: 'PAP-03', libelle: e.saisieTrituration, groupe: 'bureau', permission: 'saisie_differee', onglet: 'rattrapage', icone: 'factory', horsBarre: true },
  { chemin: '/bureau/saisie-differee-remise', code: 'PAP-04', libelle: e.saisieRemise, groupe: 'bureau', permission: 'saisie_differee', onglet: 'rattrapage', icone: 'droplet', horsBarre: true },
  { chemin: '/bureau/saisie-differee-cuve', code: 'PAP-05', libelle: e.saisieCuve, groupe: 'bureau', permission: 'saisie_differee', onglet: 'rattrapage', icone: 'cylinder', horsBarre: true },
  { chemin: '/bureau/saisie-differee-reglement', code: 'PAP-06', libelle: e.saisieReglement, groupe: 'bureau', permission: 'saisie_differee', onglet: 'rattrapage', icone: 'hand-coins', horsBarre: true },
  { chemin: '/bureau/saisie-differee-vente', code: 'PAP-07', libelle: e.saisieVente, groupe: 'bureau', permission: 'saisie_differee', onglet: 'rattrapage', icone: 'shopping-bag', horsBarre: true },

  // Administration (T-164, A4) : un onglet par écran ; seul Paramètres regroupe trois écrans (A2).
  { chemin: '/administration/parametres', code: 'ADM-01', libelle: e.parametres, groupe: 'administration', permission: 'gerer_parametres', onglet: 'parametres', icone: 'sliders-horizontal', sousOnglet: s.parametres },
  { chemin: '/administration/utilisateurs', code: 'ADM-02', libelle: e.utilisateurs, groupe: 'administration', permission: 'gerer_utilisateurs', onglet: 'utilisateurs', icone: 'user-cog' },
  { chemin: '/administration/postes', code: 'ADM-03', libelle: e.postes, groupe: 'administration', permission: 'administrer_technique', onglet: 'postes', icone: 'monitor' },
  { chemin: '/administration/diagnostic', code: 'ADM-04', libelle: e.diagnostic, groupe: 'administration', permission: 'administrer_technique', onglet: 'diagnostic', icone: 'activity' },
  { chemin: '/administration/equipements', code: 'ADM-05', libelle: e.equipements, groupe: 'administration', permission: 'gerer_equipement_metier', onglet: 'equipements', icone: 'printer' },
  { chemin: '/administration/referentiels', code: 'ADM-06', libelle: e.referentiels, groupe: 'administration', permission: 'gerer_referentiel', onglet: 'referentiels', icone: 'database' },
  { chemin: '/administration/historique', code: 'ADM-07', libelle: e.historique, groupe: 'administration', permission: 'gerer_referentiel', onglet: 'historique', icone: 'history' },
  // T1.6 : ce qui manque à chaque module ; le responsable et le propriétaire peuvent compléter les données.
  { chemin: '/administration/donnees-manquantes', code: 'ADM-08', libelle: e.donneesManquantes, groupe: 'administration', permission: 'gerer_referentiel', onglet: 'donnees-manquantes', icone: 'clipboard-list' },
  { chemin: '/administration/profils-fiscaux', code: 'ADM-10', libelle: e.profilsFiscaux, groupe: 'administration', permission: 'gerer_profils_fiscaux', onglet: 'parametres', icone: 'percent', sousOnglet: s.profilsFiscaux },
  { chemin: '/administration/articles', code: 'ADM-11', libelle: e.articles, groupe: 'administration', permission: 'gerer_referentiel', onglet: 'parametres', icone: 'package', sousOnglet: s.articles },
  { chemin: '/administration/equipements-reseau', code: 'ADM-09', libelle: e.adressesEquipements, groupe: 'administration', permission: 'configurer_adresse_equipement', onglet: 'adresses', icone: 'plug' },
]

export const ORDRE_GROUPES: readonly Groupe[] = ['tableau', 'reception', 'laboratoire', 'production', 'bureau', 'administration']

export const ICONES_GROUPES: Readonly<Record<Groupe, NomIcone>> = {
  tableau: 'layout-dashboard',
  reception: 'scale',
  laboratoire: 'flask-conical',
  production: 'factory',
  bureau: 'briefcase',
  administration: 'settings',
}

export interface DefinitionOnglet {
  id: IdOnglet
  groupe: Groupe
  libelle: string
  icone: NomIcone
}

const o = libelles.onglets

/** Onglets de chaque module, dans l'ordre de la barre (T-164). */
export const ONGLETS: readonly DefinitionOnglet[] = [
  { id: 'tableau-de-bord', groupe: 'tableau', libelle: o.tableauDeBord, icone: 'layout-dashboard' },
  { id: 'pont-bascule', groupe: 'reception', libelle: o.pontBascule, icone: 'scale' },
  { id: 'bacs', groupe: 'reception', libelle: o.bacs, icone: 'grid-3x3' },
  { id: 'apporteurs', groupe: 'reception', libelle: o.apporteurs, icone: 'contact' },
  { id: 'tickets', groupe: 'reception', libelle: o.tickets, icone: 'ticket' },
  { id: 'chargements', groupe: 'reception', libelle: o.chargements, icone: 'truck' },
  { id: 'analyses-olives', groupe: 'laboratoire', libelle: o.analysesOlives, icone: 'flask-conical' },
  { id: 'echantillons', groupe: 'laboratoire', libelle: o.echantillons, icone: 'test-tube' },
  { id: 'planification', groupe: 'production', libelle: o.planification, icone: 'calendar-clock' },
  { id: 'trituration', groupe: 'production', libelle: o.trituration, icone: 'factory' },
  { id: 'remise-huile', groupe: 'production', libelle: o.remiseHuile, icone: 'droplets' },
  { id: 'rendement', groupe: 'production', libelle: o.rendement, icone: 'gauge' },
  { id: 'cuves', groupe: 'production', libelle: o.cuves, icone: 'cylinder' },
  { id: 'caisse', groupe: 'bureau', libelle: o.caisse, icone: 'wallet' },
  { id: 'decomptes', groupe: 'bureau', libelle: o.decomptes, icone: 'users' },
  { id: 'ventes', groupe: 'bureau', libelle: o.ventes, icone: 'shopping-bag' },
  { id: 'prix', groupe: 'bureau', libelle: o.prix, icone: 'tag' },
  { id: 'documents', groupe: 'bureau', libelle: o.documents, icone: 'folder-open' },
  { id: 'rattrapage', groupe: 'bureau', libelle: o.rattrapage, icone: 'notebook-pen' },
  { id: 'diagnostic', groupe: 'administration', libelle: o.diagnostic, icone: 'activity' },
  { id: 'donnees-manquantes', groupe: 'administration', libelle: o.donneesManquantes, icone: 'clipboard-list' },
  { id: 'parametres', groupe: 'administration', libelle: o.parametres, icone: 'sliders-horizontal' },
  { id: 'utilisateurs', groupe: 'administration', libelle: o.utilisateurs, icone: 'user-cog' },
  { id: 'postes', groupe: 'administration', libelle: o.postes, icone: 'monitor' },
  { id: 'equipements', groupe: 'administration', libelle: o.equipements, icone: 'printer' },
  { id: 'adresses', groupe: 'administration', libelle: o.adresses, icone: 'plug' },
  { id: 'referentiels', groupe: 'administration', libelle: o.referentiels, icone: 'database' },
  { id: 'historique', groupe: 'administration', libelle: o.historique, icone: 'history' },
]

/** Entrées visibles : permission détenue, et pour un opérateur, type de poste autorisé. */
export function entreesVisibles(
  permissions: readonly string[],
  role: Role,
  typePoste: TypePoste,
  entrees: readonly EntreeMenu[] = ENTREES_MENU,
): EntreeMenu[] {
  return entrees.filter(
    (entree) =>
      permissions.includes(entree.permission) &&
      (role !== 'operateur' || !entree.postesOperateur || entree.postesOperateur.includes(typePoste)),
  )
}

/** Entrées sans les écrans masqués (codes) : l'adresse de l'écran reste ouverte, seul le menu le cache. */
export function sansEcrans(entrees: readonly EntreeMenu[], masques: ReadonlySet<string>): EntreeMenu[] {
  return entrees.filter((entree) => !masques.has(entree.code))
}

export function regrouper(entrees: readonly EntreeMenu[]): { groupe: Groupe; entrees: EntreeMenu[] }[] {
  return ORDRE_GROUPES.map((groupe) => ({ groupe, entrees: entrees.filter((entree) => entree.groupe === groupe) })).filter(
    (bloc) => bloc.entrees.length > 0,
  )
}

export interface OngletVisible {
  id: IdOnglet
  groupe: Groupe
  libelle: string
  icone: NomIcone
  /** Route ouverte par l'onglet : son premier sous-onglet visible. */
  cible: string
  /** Écrans visibles de l'onglet, sous-onglets et écrans de la page de liens. */
  ecrans: EntreeMenu[]
  /** Sous-onglets visibles ; la barre ne s'affiche qu'à partir de deux. */
  sousOnglets: EntreeMenu[]
}

/**
 * Onglets à afficher à partir des entrées visibles. Un onglet n'apparaît que si l'une de ses routes est visible.
 * Règle des libellés (T-164, A5) : s'il n'y a qu'un écran visible, l'onglet prend le libellé et l'icône de cet écran
 * (son sous-onglet), et n'a pas de barre de sous-onglets.
 */
export function ongletsVisibles(entrees: readonly EntreeMenu[]): OngletVisible[] {
  const resultat: OngletVisible[] = []
  for (const onglet of ONGLETS) {
    const ecrans = entrees.filter((entree) => entree.onglet === onglet.id)
    if (ecrans.length === 0) continue
    const sousOnglets = ecrans.filter((entree) => entree.horsBarre !== true)
    const seul = ecrans.length === 1 ? ecrans[0] : null
    resultat.push({
      id: onglet.id,
      groupe: onglet.groupe,
      libelle: seul === null ? onglet.libelle : (seul.sousOnglet ?? onglet.libelle),
      icone: seul === null ? onglet.icone : seul.icone,
      cible: (sousOnglets[0] ?? ecrans[0]).chemin,
      ecrans,
      sousOnglets,
    })
  }
  return resultat
}

/** Libellé d'une entrée dans la barre de sous-onglets. */
export function libelleSousOnglet(entree: EntreeMenu): string {
  return entree.sousOnglet ?? entree.libelle
}

/** Onglet qui contient la route affichée, ou null (accueil, route hors menu). */
export function ongletActif(onglets: readonly OngletVisible[], chemin: string): OngletVisible | null {
  return onglets.find((onglet) => onglet.ecrans.some((entree) => entree.chemin === chemin)) ?? null
}

/** Modules qui ont au moins un onglet visible, dans l'ordre, avec la route que chacun ouvre (son premier onglet). */
export function modulesVisibles(onglets: readonly OngletVisible[]): { groupe: Groupe; cible: string }[] {
  return ORDRE_GROUPES.flatMap((groupe) => {
    const premier = onglets.find((onglet) => onglet.groupe === groupe)
    return premier === undefined ? [] : [{ groupe, cible: premier.cible }]
  })
}

/**
 * Module affiché : celui de la route ouverte ; sur l'accueil, celui du type de poste s'il est visible, sinon le
 * premier visible.
 */
export function moduleAffiche(onglets: readonly OngletVisible[], chemin: string, typePoste: TypePoste): Groupe | null {
  const actif = ongletActif(onglets, chemin)
  if (actif !== null) return actif.groupe
  const groupes = modulesVisibles(onglets).map((module) => module.groupe)
  return groupes.includes(typePoste) ? typePoste : (groupes[0] ?? null)
}
