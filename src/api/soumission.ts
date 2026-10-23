import { envoyer } from './client'
import { creerIdentifiantCommande } from './identifiant'

/**
 * Cycle de vie du `commande_id` d'une soumission (PROMPT §6.20.1) :
 * créé une fois, conservé après un échec (nouvel essai = même identifiant),
 * renouvelé seulement après un succès ou une réinitialisation.
 */
export interface SuiviCommande {
  id(): string
  renouveler(): void
}

export function creerSuiviCommande(generer: () => string = creerIdentifiantCommande): SuiviCommande {
  let courant = generer()
  return {
    id: () => courant,
    renouveler: () => {
      courant = generer()
    },
  }
}

export async function soumettre<T>(
  suivi: SuiviCommande,
  chemin: string,
  corps: Record<string, unknown>,
): Promise<T> {
  const resultat = await envoyer<T>(chemin, corps, { commandeId: suivi.id() })
  suivi.renouveler()
  return resultat
}
