// Logique pure de l'écran des clients (T6.1). Le serveur reste juge : ces contrôles évitent
// seulement un aller-retour pour un champ vide (CONTEXTE §50 règle 7).
import { libelles } from '../libelles'

const m = libelles.clients.erreurs

export type TypeClient = 'personne' | 'societe'
export type RegimeTva = 'normal' | 'suspension' | 'export'

export interface Client {
  id: number
  type_client: TypeClient
  nom: string
  /** Présent seulement pour responsable et propriétaire (CONTEXTE §6.4). */
  cin?: string | null
  cin_masquee: string | null
  matricule_fiscal: string | null
  telephone: string | null
  adresse: string | null
  regime_tva: RegimeTva
  actif: number
  cree_le: string
  actions_possibles: string[]
}

export interface Suggestion extends Client {
  raisons: ('cin' | 'matricule_fiscal' | 'telephone' | 'nom')[]
}

export interface Formulaire {
  type_client: TypeClient
  nom: string
  cin: string
  matricule_fiscal: string
  telephone: string
  adresse: string
  regime_tva: RegimeTva
}

export const FORMULAIRE_VIDE: Formulaire = {
  type_client: 'societe', nom: '', cin: '', matricule_fiscal: '', telephone: '', adresse: '', regime_tva: 'normal',
}

export type Erreurs = Partial<Record<keyof Formulaire | 'motif', string>>

const propre = (valeur: string) => valeur.trim().split(/\s+/).join(' ')
const facultatif = (valeur: string) => (propre(valeur) === '' ? null : propre(valeur))

/** Tous les clients pour la table de l'écran ; les désactivés seulement sur demande. */
export function cheminListe(inactifs: boolean): string {
  return `/api/clients${inactifs ? '?inactifs=true' : ''}`
}

function simplifier(texte: string): string {
  return texte.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

/** Filtre la table affichée : nom, téléphone, CIN, matricule ou adresse, sans accents ni casse ; chaque mot doit s'y trouver. */
export function filtrerClients(clients: readonly Client[], saisie: string): Client[] {
  const mots = simplifier(saisie).split(' ').filter((m) => m !== '')
  if (mots.length === 0) return [...clients]
  return clients.filter((c) => {
    const texte = simplifier([c.nom, c.telephone, c.cin, c.cin_masquee, c.matricule_fiscal, c.adresse].filter(Boolean).join(' '))
    const chiffres = texte.replace(/\s/g, '')
    return mots.every((m) => texte.includes(m) || chiffres.includes(m))
  })
}

/** Suggestions de doublons pendant la frappe ; `null` si rien à chercher. */
export function cheminDoublons(f: Formulaire, saufId?: number): string | null {
  const params = new URLSearchParams()
  for (const cle of ['cin', 'matricule_fiscal', 'telephone', 'nom'] as const) {
    if (propre(f[cle]).length >= 2) params.set(cle, propre(f[cle]))
  }
  if ([...params.keys()].length === 0) return null
  if (saufId !== undefined) params.set('sauf_id', String(saufId))
  return `/api/clients/doublons?${params.toString()}`
}

export function formulaireDe(c: Client): Formulaire {
  return {
    type_client: c.type_client, nom: c.nom, cin: c.cin ?? '', matricule_fiscal: c.matricule_fiscal ?? '',
    telephone: c.telephone ?? '', adresse: c.adresse ?? '', regime_tva: c.regime_tva,
  }
}

/** `cinConnu` : faux quand le CIN enregistré est masqué pour cette personne. */
function controler(f: Formulaire, cinConnu: boolean): Erreurs {
  const erreurs: Erreurs = {}
  if (propre(f.nom) === '') erreurs.nom = m.nom
  if (cinConnu && propre(f.cin) === '' && propre(f.matricule_fiscal) === '') {
    erreurs[f.type_client === 'personne' ? 'cin' : 'matricule_fiscal'] = m.identifiant
  }
  return erreurs
}

export function corpsCreation(f: Formulaire): { corps: Record<string, unknown> | null; erreurs: Erreurs } {
  const erreurs = controler(f, true)
  if (Object.keys(erreurs).length > 0) return { corps: null, erreurs }
  return {
    erreurs,
    corps: {
      type_client: f.type_client, nom: propre(f.nom), cin: facultatif(f.cin),
      matricule_fiscal: facultatif(f.matricule_fiscal), telephone: facultatif(f.telephone),
      adresse: facultatif(f.adresse), regime_tva: f.regime_tva,
    },
  }
}

/** Seuls les champs changés partent ; un CIN masqué reste inchangé tant qu'on n'en tape pas un. */
export function corpsModification(origine: Client, f: Formulaire, motif: string): { corps: Record<string, unknown> | null; erreurs: Erreurs } {
  const cinConnu = origine.cin !== undefined
  const erreurs = controler(f, cinConnu || propre(f.cin) !== '')
  if (propre(motif) === '') erreurs.motif = m.motif
  if (Object.keys(erreurs).length > 0) return { corps: null, erreurs }
  const avant = formulaireDe(origine)
  const corps: Record<string, unknown> = {}
  for (const cle of Object.keys(f) as (keyof Formulaire)[]) {
    if (cle === 'cin' && !cinConnu && propre(f.cin) === '') continue
    if (propre(f[cle]) === propre(avant[cle])) continue
    corps[cle] = cle === 'type_client' || cle === 'regime_tva' ? f[cle] : facultatif(f[cle])
  }
  return { corps: { ...corps, motif: propre(motif) }, erreurs }
}

/** Activation ou désactivation : commande à part, avec sa raison. */
export function corpsActivation(actif: boolean, motif: string): { corps: Record<string, unknown> | null; erreurs: Erreurs } {
  if (propre(motif) === '') return { corps: null, erreurs: { motif: m.motif } }
  return { corps: { actif, motif: propre(motif) }, erreurs: {} }
}

export function texteRaisons(s: Suggestion): string {
  return s.raisons.map((r) => libelles.clients.raisons[r]).join(', ')
}
