/** Numéro du chèque ou référence du virement, et banque (T-203). Le serveur vérifie ; l'écran guide la saisie. */
import type { ModePaiement } from './avances'

export interface References {
  reference: string
  banque: string
}

export const REFERENCES_VIDES: References = { reference: '', banque: '' }

/** Un chèque ou un virement porte toujours son numéro et sa banque ; des espèces jamais. */
export function referencesRequises(mode: ModePaiement): boolean {
  return mode !== 'especes'
}

/** Prêt à envoyer : espèces, ou chèque/virement avec numéro et banque non vides. */
export function referencesCompletes(mode: ModePaiement, references: References): boolean {
  return !referencesRequises(mode) || (references.reference.trim() !== '' && references.banque.trim() !== '')
}

/** Champ `references` du corps de la commande ; rien pour des espèces. */
export function corpsReferences(mode: ModePaiement, references: References): { references?: References } {
  if (!referencesRequises(mode)) return {}
  return { references: { reference: references.reference.trim(), banque: references.banque.trim() } }
}

/** Fiche papier : les références sont facultatives, envoyées seulement si l'une est notée. */
export function corpsReferencesPapier(mode: ModePaiement, references: References): { references?: References } {
  if (!referencesRequises(mode) || (references.reference.trim() === '' && references.banque.trim() === '')) return {}
  return corpsReferences(mode, references)
}
