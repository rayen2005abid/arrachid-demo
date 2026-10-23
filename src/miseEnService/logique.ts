// Logique pure du formulaire de première mise en service (T1.6), sans React.
// Le serveur reste juge : ces contrôles évitent seulement un aller-retour inutile.

import { libelles } from '../libelles'

export const CHAMPS = [
  'code',
  'campagne.libelle',
  'campagne.date_ouverture',
  'proprietaire.nom',
  'proprietaire.pin',
  'proprietaire.confirmation',
  'administrateur.nom',
  'administrateur.pin',
  'administrateur.confirmation',
] as const

export type ChampMiseEnService = (typeof CHAMPS)[number]
export type FormulaireMiseEnService = Record<ChampMiseEnService, string>
export type ErreursFormulaire = Partial<Record<ChampMiseEnService, string>>

export const FORMULAIRE_VIDE: FormulaireMiseEnService = Object.fromEntries(CHAMPS.map((c) => [c, ''])) as FormulaireMiseEnService

const m = libelles.miseEnService.erreurs

/** Même normalisation que le serveur pour le code : espaces et tirets ignorés, majuscules. */
export function normaliserCode(code: string): string {
  return code.replace(/[\s-]/g, '').toUpperCase()
}

/** Comparaison des noms comme le serveur : accents, casse et espaces ignorés. */
export function normaliserNom(nom: string): string {
  return nom.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().split(/\s+/).filter(Boolean).join(' ')
}

function verifierCompte(f: FormulaireMiseEnService, qui: 'proprietaire' | 'administrateur', erreurs: ErreursFormulaire) {
  if (f[`${qui}.nom`].trim() === '') erreurs[`${qui}.nom`] = m.nomObligatoire
  if (!/^[0-9]{4}$/.test(f[`${qui}.pin`])) erreurs[`${qui}.pin`] = m.pinInvalide
  else if (f[`${qui}.confirmation`] !== f[`${qui}.pin`]) erreurs[`${qui}.confirmation`] = m.confirmationDifferente
}

/** Erreurs par champ ; objet vide = formulaire prêt à envoyer. */
export function verifierFormulaire(f: FormulaireMiseEnService): ErreursFormulaire {
  const erreurs: ErreursFormulaire = {}
  if (!/^[A-Z0-9]{16}$/.test(normaliserCode(f.code))) erreurs.code = m.codeInvalide
  if (f['campagne.libelle'].trim() === '') erreurs['campagne.libelle'] = m.libelleObligatoire
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(f['campagne.date_ouverture'])) erreurs['campagne.date_ouverture'] = m.dateObligatoire
  verifierCompte(f, 'proprietaire', erreurs)
  verifierCompte(f, 'administrateur', erreurs)
  const nomP = normaliserNom(f['proprietaire.nom'])
  if (nomP !== '' && nomP === normaliserNom(f['administrateur.nom'])) erreurs['administrateur.nom'] = m.nomsIdentiques
  return erreurs
}

// Le serveur nomme le champ fautif en notation pointée (`administrateur.pin`) ; une erreur de
// format de requête ne donne que le dernier élément (`date_ouverture`), sans ambiguïté sauf pour
// `nom` et `pin`, laissés au message général.
const CHAMPS_SIMPLES: Record<string, ChampMiseEnService> = {
  code: 'code',
  libelle: 'campagne.libelle',
  date_ouverture: 'campagne.date_ouverture',
}

/** Champ du formulaire correspondant au `champ` d'une erreur du serveur, ou `null`. */
export function champDuServeur(champ: string | null): ChampMiseEnService | null {
  if (champ === null) return null
  if ((CHAMPS as readonly string[]).includes(champ)) return champ as ChampMiseEnService
  return CHAMPS_SIMPLES[champ] ?? null
}

/** Corps de `POST /api/mise-en-service` (le `commande_id` est ajouté par `useSoumission`). */
export function corpsMiseEnService(f: FormulaireMiseEnService): Record<string, unknown> {
  return {
    code: f.code.trim(),
    campagne: { libelle: f['campagne.libelle'].trim(), date_ouverture: f['campagne.date_ouverture'] },
    proprietaire: { nom: f['proprietaire.nom'].trim(), pin: f['proprietaire.pin'] },
    administrateur: { nom: f['administrateur.nom'].trim(), pin: f['administrateur.pin'] },
  }
}
