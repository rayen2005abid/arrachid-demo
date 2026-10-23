import { useCallback, useRef, useState } from 'react'
import { creerSuiviCommande, soumettre, type SuiviCommande } from './soumission'
import { ErreurApi, messageUtilisateur } from './erreurs'

interface EtatSoumission {
  enCours: boolean
  /** Message français de la dernière erreur (jamais de code HTTP). */
  erreur: string | null
  /** Champ fautif signalé par le serveur, le cas échéant. */
  champ: string | null
  /** Code de l'erreur (ex. `telephone_deja_utilise`) : choisit une réaction, jamais affiché. */
  code: string | null
}

const ETAT_INITIAL: EtatSoumission = { enCours: false, erreur: null, champ: null, code: null }

/**
 * Hook d'un formulaire de commande : possède le `commande_id` de la soumission.
 * `soumettre` renvoie la réponse du serveur (données persistées) ou `null` en cas d'erreur.
 * Appeler `reinitialiser()` quand l'utilisateur change les valeurs ou annule le formulaire.
 * `suiviConserve` permet de retrouver l'identifiant après verrouillage, sans garder le corps ni un PIN.
 */
export function useSoumission(suiviConserve?: SuiviCommande) {
  const suivi = useRef<SuiviCommande>(suiviConserve ?? creerSuiviCommande())
  const [etat, definirEtat] = useState<EtatSoumission>(ETAT_INITIAL)

  const envoyerCommande = useCallback(async <T,>(chemin: string, corps: Record<string, unknown>) => {
    definirEtat({ enCours: true, erreur: null, champ: null, code: null })
    try {
      const resultat = await soumettre<T>(suivi.current, chemin, corps)
      definirEtat(ETAT_INITIAL)
      return resultat
    } catch (erreur) {
      const champ = erreur instanceof ErreurApi ? erreur.champ : null
      const code = erreur instanceof ErreurApi ? erreur.code : null
      definirEtat({ enCours: false, erreur: messageUtilisateur(erreur), champ, code })
      return null
    }
  }, [])

  const reinitialiser = useCallback(() => {
    suivi.current.renouveler()
    definirEtat(ETAT_INITIAL)
  }, [])

  return { ...etat, soumettre: envoyerCommande, reinitialiser }
}
