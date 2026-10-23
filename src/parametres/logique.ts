// Logique pure de l'écran des paramètres (T1.6), sans React.
// Le navigateur ne calcule aucune heure métier : il choisit seulement entre « maintenant »
// (heure du serveur à l'enregistrement, `valide_du: null`) et l'ouverture fournie par le serveur.

import { libelles } from '../libelles'
import type { Validation } from '../types'

export type TypeValeur = 'entier' | 'texte' | 'booleen' | 'json'

export interface VersionParametre {
  id: number
  valeur: string
  valide_du: string
  valide_au: string | null
  auteur: { id: number; nom: string }
  motif: string
  cree_le: string
}

export interface Parametre {
  cle: string
  libelle: string
  type_valeur: TypeValeur
  valeur_actuelle: { id: number; valeur: string } | null
  versions: VersionParametre[]
  suggestion: string | null
  source_suggestion: string | null
}

export interface ListeParametres {
  heure_serveur: string
  valide_du_minimum: string
  parametres: Parametre[]
}

export type ModeDebut = 'maintenant' | 'ouverture'

/** « Depuis l'ouverture » seulement avant toute opération et pour une clé encore sans version. */
export function modesDebut(parametre: Parametre, liste: ListeParametres): ModeDebut[] {
  const ouvertureAutorisee = liste.valide_du_minimum < liste.heure_serveur && parametre.versions.length === 0
  return ouvertureAutorisee ? ['ouverture', 'maintenant'] : ['maintenant']
}

export function modeParDefaut(parametre: Parametre, liste: ListeParametres): ModeDebut {
  return modesDebut(parametre, liste)[0]
}

/** `valide_du` à envoyer : l'ouverture donnée par le serveur, ou `null` = heure du serveur. */
export function valideDu(mode: ModeDebut, liste: ListeParametres): string | null {
  return mode === 'ouverture' ? liste.valide_du_minimum : null
}

/** Pré-remplissage : valeur en vigueur, sinon valeur suggérée ; rien n'est enregistré sans validation. */
export function valeurInitiale(parametre: Parametre): string {
  return parametre.valeur_actuelle?.valeur ?? parametre.suggestion ?? ''
}

/** Message d'erreur si la saisie ne correspond pas au type, sinon `null`. */
export function verifierValeur(type: TypeValeur, texte: string): string | null {
  const e = libelles.parametres.erreurs
  if (texte.trim() === '') return e.valeurObligatoire
  if (type === 'entier' && !/^-?[0-9]+$/.test(texte)) return e.entier
  if (type === 'booleen' && texte !== '0' && texte !== '1') return e.booleen
  if (type === 'json') {
    try {
      const lu: unknown = JSON.parse(texte)
      if (typeof lu !== 'object' || lu === null) return e.json
    } catch {
      return e.json
    }
  }
  return null
}

export function corpsValeur(
  valeur: string,
  mode: ModeDebut,
  liste: ListeParametres,
  motif: string,
  validation: Validation | null,
): Record<string, unknown> {
  return { valeur, valide_du: valideDu(mode, liste), motif: motif.trim(), validation }
}
