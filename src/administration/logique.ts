// Logique pure des écrans d'administration (sans React) : actions, validation, corps des commandes.
import { libelles } from '../libelles'
import type { Element, FicheReferentiel } from './types'
import { grammesVersKg, kgVersGrammes, lireEntier } from './unites'

const err = libelles.administration.erreurs

/** Ordre d'affichage fixe ; seules les actions renvoyées par le serveur sont montrées. */
export const ORDRE_ACTIONS = [
  'modifier',
  'reinitialiser_pin',
  'configurer_adresse',
  'desactiver',
  'reactiver',
  'revoquer',
  'retirer',
] as const

export function actionsVisibles(element: Pick<Element, 'actions_possibles'>, permises: readonly string[] = ORDRE_ACTIONS): string[] {
  return ORDRE_ACTIONS.filter((action) => permises.includes(action) && element.actions_possibles.includes(action))
}

export function peut(element: Pick<Element, 'actions_possibles'>, action: string): boolean {
  return element.actions_possibles.includes(action)
}

/** Une fiche en usage (opération active) demande une raison avant tout changement. */
export function motifRequis(fiche: { en_usage?: boolean } | null): boolean {
  return fiche?.en_usage === true
}

export type Erreurs = Record<string, string>
export type Resultat<T> = { corps: T; erreurs: null } | { corps: null; erreurs: Erreurs }

function resultat<T>(corps: T, erreurs: Erreurs): Resultat<T> {
  return Object.keys(erreurs).length === 0 ? { corps, erreurs: null } : { corps: null, erreurs }
}

export const PIN_VALIDE = /^[0-9]{4}$/

export interface SaisieUtilisateur {
  nom: string
  role: string
  pin: string
  confirmation: string
}

export function validerUtilisateur(s: SaisieUtilisateur): Resultat<{ nom: string; role: string; pin: string }> {
  const erreurs: Erreurs = {}
  const nom = s.nom.trim().replace(/\s+/g, ' ')
  if (nom === '') erreurs.nom = err.obligatoire
  if (s.role === '') erreurs.role = err.obligatoire
  Object.assign(erreurs, validerPins(s.pin, s.confirmation))
  return resultat({ nom, role: s.role, pin: s.pin }, erreurs)
}

export function validerPins(pin: string, confirmation: string): Erreurs {
  if (!PIN_VALIDE.test(pin)) return { pin: err.pinInvalide }
  if (pin !== confirmation) return { confirmation: err.pinsDifferents }
  return {}
}

// --- Référentiels ---

export type GenreChamp = 'texte' | 'texte_facultatif' | 'entier' | 'entier_facultatif' | 'kg' | 'qualite' | 'booleen'

export interface DefinitionChamp {
  nom: string
  libelle: string
  genre: GenreChamp
}

export type CleOnglet = 'bacs' | 'tampons' | 'cuves' | 'varietes' | 'lignes'

export interface DefinitionReferentiel {
  onglet: CleOnglet
  chemin: string
  /** Clé de la réponse de commande (`{"bac": …}`) et table de l'historique. */
  table: string
  colonneActif: 'actif' | 'active'
  champs: DefinitionChamp[]
}

const r = libelles.administration.referentiels

export const REFERENTIELS: readonly DefinitionReferentiel[] = [
  {
    onglet: 'bacs',
    chemin: '/api/bacs',
    table: 'bac',
    colonneActif: 'actif',
    champs: [
      { nom: 'numero', libelle: r.numero, genre: 'entier' },
      { nom: 'libelle', libelle: r.libelle, genre: 'texte' },
    ],
  },
  {
    onglet: 'tampons',
    chemin: '/api/tampons',
    table: 'tampon',
    colonneActif: 'actif',
    champs: [
      { nom: 'code', libelle: r.code, genre: 'texte' },
      { nom: 'libelle', libelle: r.libelle, genre: 'texte' },
      { nom: 'capacite_g', libelle: r.capaciteKg, genre: 'kg' },
    ],
  },
  {
    onglet: 'cuves',
    chemin: '/api/cuves',
    table: 'cuve',
    colonneActif: 'active',
    champs: [
      { nom: 'code', libelle: r.code, genre: 'texte' },
      { nom: 'libelle', libelle: r.libelle, genre: 'texte' },
      { nom: 'capacite_g', libelle: r.capaciteKg, genre: 'kg' },
      { nom: 'groupe', libelle: r.groupe, genre: 'texte_facultatif' },
      { nom: 'qualite_affectee', libelle: r.qualite, genre: 'qualite' },
      { nom: 'vente_detail_autorisee', libelle: 'Vente au détail autorisée', genre: 'booleen' },
    ],
  },
  {
    onglet: 'varietes',
    chemin: '/api/varietes',
    table: 'variete',
    colonneActif: 'actif',
    champs: [{ nom: 'libelle', libelle: r.libelle, genre: 'texte' }],
  },
  {
    onglet: 'lignes',
    chemin: '/api/lignes-trituration',
    table: 'ligne_trituration',
    colonneActif: 'active',
    champs: [
      { nom: 'code', libelle: r.code, genre: 'texte' },
      { nom: 'libelle', libelle: r.libelle, genre: 'texte' },
      { nom: 'capacite_kg_h', libelle: r.capaciteKgH, genre: 'entier_facultatif' },
    ],
  },
]

export type Saisies = Record<string, string>

/** Valeurs initiales du formulaire : les grammes sont présentés en kg. */
export function saisiesDepuis(definition: DefinitionReferentiel, fiche: FicheReferentiel | null): Saisies {
  const saisies: Saisies = {}
  for (const champ of definition.champs) {
    const valeur = fiche?.[champ.nom]
    if (valeur === null || valeur === undefined) saisies[champ.nom] = champ.genre === 'booleen' ? '0' : ''
    else if (champ.genre === 'kg' && typeof valeur === 'number') saisies[champ.nom] = grammesVersKg(valeur)
    else saisies[champ.nom] = String(valeur)
  }
  return saisies
}

/** Saisies → corps de commande en unités de stockage (g entiers), ou erreurs par champ. */
export function construireCorps(definition: DefinitionReferentiel, saisies: Saisies): Resultat<Record<string, unknown>> {
  const corps: Record<string, unknown> = {}
  const erreurs: Erreurs = {}
  for (const champ of definition.champs) {
    const brut = (saisies[champ.nom] ?? '').trim()
    const facultatif = champ.genre === 'texte_facultatif' || champ.genre === 'entier_facultatif'
    // Une case jamais cochée vaut « non », jamais « champ obligatoire ».
    if (champ.genre === 'booleen') {
      corps[champ.nom] = brut === '1'
      continue
    }
    if (brut === '') {
      if (facultatif) corps[champ.nom] = null
      else erreurs[champ.nom] = err.obligatoire
      continue
    }
    switch (champ.genre) {
      case 'texte':
      case 'texte_facultatif':
      case 'qualite':
        corps[champ.nom] = brut
        break
      case 'entier':
      case 'entier_facultatif': {
        const entier = lireEntier(brut)
        if (entier === null) erreurs[champ.nom] = err.entierInvalide
        else if (entier <= 0) erreurs[champ.nom] = err.positif
        else corps[champ.nom] = entier
        break
      }
      case 'kg': {
        const grammes = kgVersGrammes(brut)
        if (grammes === null) erreurs[champ.nom] = err.kgInvalide
        else if (grammes <= 0) erreurs[champ.nom] = err.positif
        else corps[champ.nom] = grammes
        break
      }
    }
  }
  return resultat(corps, erreurs)
}

/** Valeur affichée d'un champ dans la liste (grammes en kg). */
export function valeurAffichee(champ: DefinitionChamp, fiche: FicheReferentiel): string {
  const valeur = fiche[champ.nom]
  if (champ.genre === 'kg' && typeof valeur === 'number') return grammesVersKg(valeur)
  if (champ.genre === 'qualite' && typeof valeur === 'string' && valeur in r.qualites) return r.qualites[valeur as keyof typeof r.qualites]
  if (champ.genre === 'booleen') return valeur ? 'Oui' : 'Non'
  return texteValeur(valeur)
}

function nombre(valeur: unknown): number {
  return typeof valeur === 'number' ? valeur : 0
}

/** État dérivé lu par le serveur, résumé en une phrase (jamais saisi). */
export function resumeEtat(onglet: CleOnglet, fiche: FicheReferentiel): string {
  switch (onglet) {
    case 'bacs': {
      const occupation = fiche.occupation as { numero_reception: number; apporteur: string } | null
      return occupation === null ? r.etats.libre : `${r.etats.occupe} — ${r.reception} ${occupation.numero_reception}, ${occupation.apporteur}`
    }
    case 'tampons':
      return nombre(fiche.contenu_g) === 0 ? r.etats.libre : `${r.etats.occupe} — ${grammesVersKg(nombre(fiche.contenu_g))} kg`
    case 'cuves': {
      if (nombre(fiche.stock_g) === 0 && nombre(fiche.reserve_g) === 0) return r.etats.vide
      const reserve = nombre(fiche.reserve_g) > 0 ? ` · ${r.reserve} ${grammesVersKg(nombre(fiche.reserve_g))}` : ''
      return `${r.stock} ${grammesVersKg(nombre(fiche.stock_g))}${reserve}`
    }
    case 'varietes':
      return `${r.lotsEnCours} : ${nombre(fiche.lots_en_cours)}`
    case 'lignes':
      return `${r.triturationsEnCours} : ${nombre(fiche.triturations_en_cours)}`
  }
}

/** Ajoute la raison au corps ; `null` si elle est exigée et absente. */
export function avecMotif(corps: Record<string, unknown>, motif: string, requis: boolean): Record<string, unknown> | null {
  const propre = motif.trim()
  if (requis && propre === '') return null
  return propre === '' ? corps : { ...corps, motif: propre }
}

/** Adresse réseau : même forme que le contrôle du serveur (IPv4[:port] ou COMn), vide permis. */
export function adresseValide(texte: string): boolean {
  const propre = texte.trim()
  if (propre === '') return true
  if (/^COM[1-9]\d{0,2}$/i.test(propre)) return true
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?::(\d{1,5}))?$/.exec(propre)
  if (m === null) return false
  const octets = m.slice(1, 5).map(Number)
  const port = m[5] === undefined ? 1 : Number(m[5])
  return octets.every((o) => o <= 255) && port >= 1 && port <= 65535
}

// --- Historique : miroir de PERMISSIONS_HISTORIQUE du serveur (T-26) ---

export interface TableHistorique {
  table: string
  permission: string
  /** Liste permettant de choisir la fiche par son nom ; sinon saisie du numéro. */
  liste?: { chemin: string; libelle: (fiche: Record<string, unknown>) => string }
}

const parCode = (f: Record<string, unknown>) => `${String(f.code)} — ${String(f.libelle)}`

export const TABLES_HISTORIQUE: readonly TableHistorique[] = [
  { table: 'bac', permission: 'gerer_referentiel', liste: { chemin: '/api/bacs?inclure_inactifs=true', libelle: (f) => `${String(f.numero)} — ${String(f.libelle)}` } },
  { table: 'tampon', permission: 'gerer_referentiel', liste: { chemin: '/api/tampons?inclure_inactifs=true', libelle: parCode } },
  { table: 'cuve', permission: 'gerer_referentiel', liste: { chemin: '/api/cuves?inclure_inactifs=true', libelle: parCode } },
  { table: 'variete', permission: 'gerer_referentiel', liste: { chemin: '/api/varietes?inclure_inactifs=true', libelle: (f) => String(f.libelle) } },
  { table: 'ligne_trituration', permission: 'gerer_referentiel', liste: { chemin: '/api/lignes-trituration?inclure_inactifs=true', libelle: parCode } },
  { table: 'article', permission: 'gerer_referentiel' },
  { table: 'campagne', permission: 'gerer_referentiel' },
  { table: 'apporteur', permission: 'voir_cin_complete' },
  { table: 'client', permission: 'voir_cin_complete' },
  { table: 'equipement', permission: 'gerer_equipement_metier', liste: { chemin: '/api/equipements', libelle: parCode } },
  { table: 'utilisateur', permission: 'gerer_utilisateurs', liste: { chemin: '/api/utilisateurs', libelle: (f) => String(f.nom) } },
  { table: 'parametre', permission: 'gerer_parametres' },
  { table: 'poste', permission: 'administrer_technique', liste: { chemin: '/api/postes', libelle: parCode } },
  { table: 'poste_equipement', permission: 'administrer_technique' },
]

/** Tables dont l'historique est lisible avec ces permissions. */
export function tablesLisibles(permissions: readonly string[]): TableHistorique[] {
  return TABLES_HISTORIQUE.filter((t) => permissions.includes(t.permission))
}

/** Affichage d'une valeur d'historique ou de fiche. */
export function texteValeur(valeur: unknown): string {
  if (valeur === null || valeur === undefined || valeur === '') return libelles.administration.historiqueVue.vide
  return String(valeur)
}

/** Horodatage UTC → date et heure de Tunis, lisibles. */
export function dateHeure(horodatage: string | null): string {
  if (horodatage === null) return libelles.administration.historiqueVue.vide
  return new Date(horodatage).toLocaleString('fr-FR', { timeZone: 'Africa/Tunis', dateStyle: 'short', timeStyle: 'short' })
}
