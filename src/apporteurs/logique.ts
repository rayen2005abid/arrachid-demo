// Logique pure de l'écran des apporteurs (T2.1). Le serveur reste juge : ces contrôles évitent
// seulement un aller-retour pour un champ vide (CONTEXTE §50 règle 7).
import { libelles } from '../libelles'

const m = libelles.apporteurs.erreurs

export type TypeApporteur = 'personne' | 'societe'

export interface Apporteur {
  id: number
  type_apporteur: TypeApporteur
  nom: string
  /** Présent seulement pour responsable et propriétaire (CONTEXTE §6.4). */
  cin?: string | null
  cin_masquee: string | null
  matricule_fiscal: string | null
  telephone: string
  localite: string | null
  adresse: string | null
  actif: number
  cree_le: string
  actions_possibles: string[]
}

export interface Suggestion extends Apporteur {
  raisons: ('cin' | 'matricule_fiscal' | 'telephone' | 'nom')[]
}

export interface Formulaire {
  type_apporteur: TypeApporteur
  nom: string
  cin: string
  matricule_fiscal: string
  telephone: string
  localite: string
  adresse: string
}

export const FORMULAIRE_VIDE: Formulaire = {
  type_apporteur: 'personne',
  nom: '',
  cin: '',
  matricule_fiscal: '',
  telephone: '',
  localite: '',
  adresse: '',
}

export type Erreurs = Partial<Record<keyof Formulaire | 'motif', string>>

const propre = (valeur: string) => valeur.trim().split(/\s+/).join(' ')

/** Au moins 2 caractères hors espaces : le serveur refuse une recherche plus courte. */
export function rechercheValable(saisie: string): boolean {
  return saisie.replace(/\s/g, '').length >= 2
}

export function cheminRecherche(saisie: string): string | null {
  return rechercheValable(saisie) ? `/api/apporteurs?q=${encodeURIComponent(saisie.trim())}` : null
}

function simplifier(texte: string): string {
  return texte.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

/** Filtre la table affichée : nom, téléphone, CIN, matricule ou localité, sans accents ni casse ; chaque mot doit s'y trouver. */
export function filtrerApporteurs<T extends Pick<Apporteur, 'nom' | 'telephone' | 'cin' | 'cin_masquee' | 'matricule_fiscal' | 'localite'>>(
  apporteurs: readonly T[],
  saisie: string,
): T[] {
  const mots = simplifier(saisie).split(' ').filter((m) => m !== '')
  if (mots.length === 0) return [...apporteurs]
  return apporteurs.filter((a) => {
    const texte = simplifier([a.nom, a.telephone, a.cin, a.cin_masquee, a.matricule_fiscal, a.localite].filter(Boolean).join(' '))
    const chiffres = texte.replace(/\s/g, '')
    return mots.every((m) => texte.includes(m) || chiffres.includes(m))
  })
}

/** Suggestions de doublons pendant la frappe (CIN, matricule, téléphone, nom) ; `null` si rien à chercher. */
export function cheminDoublons(f: Formulaire, saufId?: number): string | null {
  const params = new URLSearchParams()
  for (const cle of ['cin', 'matricule_fiscal', 'telephone', 'nom'] as const) {
    if (propre(f[cle]).length >= 2) params.set(cle, propre(f[cle]))
  }
  if ([...params.keys()].length === 0) return null
  if (saufId !== undefined) params.set('sauf_id', String(saufId))
  return `/api/apporteurs/doublons?${params.toString()}`
}

/** Fiche existante → formulaire ; le CIN complet n'est connu que des responsables. */
export function formulaireDe(a: Apporteur): Formulaire {
  return {
    type_apporteur: a.type_apporteur,
    nom: a.nom,
    cin: a.cin ?? '',
    matricule_fiscal: a.matricule_fiscal ?? '',
    telephone: a.telephone,
    localite: a.localite ?? '',
    adresse: a.adresse ?? '',
  }
}

function controler(f: Formulaire): Erreurs {
  const erreurs: Erreurs = {}
  if (propre(f.nom) === '') erreurs.nom = m.nom
  if (propre(f.telephone) === '') erreurs.telephone = m.telephone
  if (f.type_apporteur === 'personne' && propre(f.cin) === '') erreurs.cin = m.cin
  if (f.type_apporteur === 'societe' && propre(f.matricule_fiscal) === '') erreurs.matricule_fiscal = m.matricule
  return erreurs
}

const facultatif = (valeur: string) => (propre(valeur) === '' ? null : propre(valeur))

export function corpsCreation(f: Formulaire): { corps: Record<string, unknown> | null; erreurs: Erreurs } {
  const erreurs = controler(f)
  if (Object.keys(erreurs).length > 0) return { corps: null, erreurs }
  return {
    erreurs,
    corps: {
      type_apporteur: f.type_apporteur,
      nom: propre(f.nom),
      cin: facultatif(f.cin),
      matricule_fiscal: f.type_apporteur === 'societe' ? facultatif(f.matricule_fiscal) : null,
      telephone: propre(f.telephone),
      localite: facultatif(f.localite),
      adresse: facultatif(f.adresse),
    },
  }
}

/**
 * Seuls les champs changés partent au serveur. Un CIN que l'opérateur ne voit pas (masqué) reste
 * inchangé tant qu'il n'en tape pas un nouveau.
 */
export function corpsModification(
  origine: Apporteur,
  f: Formulaire,
  motif: string,
): { corps: Record<string, unknown> | null; erreurs: Erreurs } {
  const cinConnu = origine.cin !== undefined
  const erreurs = controler({ ...f, cin: cinConnu || propre(f.cin) !== '' ? f.cin : 'masque' })
  if (propre(motif) === '') erreurs.motif = m.motif
  if (Object.keys(erreurs).length > 0) return { corps: null, erreurs }
  const avant = formulaireDe(origine)
  const corps: Record<string, unknown> = {}
  for (const cle of Object.keys(f) as (keyof Formulaire)[]) {
    if (cle === 'cin' && !cinConnu && propre(f.cin) === '') continue
    if (propre(f[cle]) !== propre(avant[cle])) corps[cle] = cle === 'type_apporteur' ? f[cle] : facultatif(f[cle])
  }
  if (f.type_apporteur === 'personne' && 'type_apporteur' in corps) corps.matricule_fiscal = null
  return { corps: { ...corps, motif: propre(motif) }, erreurs }
}

/** CIN (complet pour le responsable, masqué sinon, comme le serveur le renvoie) ou matricule fiscal d'une société. */
export function identite(a: Pick<Apporteur, 'cin' | 'cin_masquee' | 'matricule_fiscal'>): string {
  return a.cin ?? a.cin_masquee ?? a.matricule_fiscal ?? '—'
}

/** Texte court des raisons d'une suggestion (« même CIN, même téléphone »). */
export function texteRaisons(s: Suggestion): string {
  return s.raisons.map((r) => libelles.apporteurs.raisons[r]).join(', ')
}
