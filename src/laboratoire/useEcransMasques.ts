import { CODE_REGISTRE } from './logique'

const MASQUES: ReadonlySet<string> = new Set([CODE_REGISTRE, 'ADM-08'])

/**
 * Écrans retirés du menu à la demande d'Omar : registre des échantillons (LAB-02) et Données manquantes (ADM-08).
 * L'adresse de l'écran reste ouverte ; seuls le menu, les onglets et les cartes d'accueil le cachent.
 */
export function useEcransMasques(): ReadonlySet<string> {
  return MASQUES
}
