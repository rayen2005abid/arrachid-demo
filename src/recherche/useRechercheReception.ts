import { useState } from 'react'
import { lire } from '../api/client'
import { messageUtilisateur } from '../api/erreurs'
import { cheminRechercheReception, suiteRecherche, type ReceptionTrouvee, type ResultatRecherche } from './receptions'

/**
 * Recherche d'une réception (EM-07) : renvoie la réception à ouvrir quand une seule correspond ;
 * sinon garde la liste à montrer (`resultat`) ou le message à afficher sous le champ (`erreur`).
 */
export function useRechercheReception(base: string, messageVide: string) {
  const [resultat, definirResultat] = useState<ResultatRecherche | null>(null)
  const [erreur, definirErreur] = useState<string | undefined>()
  const [enCours, definirEnCours] = useState(false)

  const chercher = async (saisie: string): Promise<ReceptionTrouvee | null> => {
    definirResultat(null)
    const chemin = cheminRechercheReception(base, saisie)
    if (chemin === null) {
      definirErreur(messageVide)
      return null
    }
    definirEnCours(true)
    try {
      const reponse = await lire<ResultatRecherche>(chemin)
      const suite = suiteRecherche(reponse)
      definirErreur(suite.erreur)
      // Plusieurs réceptions : la liste reste affichée, même après en avoir choisi une.
      if (suite.ouvrir === null && reponse.resultats.length > 1) definirResultat(reponse)
      return suite.ouvrir
    } catch (e) {
      definirErreur(messageUtilisateur(e))
      return null
    } finally {
      definirEnCours(false)
    }
  }

  return { chercher, resultat, erreur, enCours, effacerErreur: () => definirErreur(undefined) }
}
