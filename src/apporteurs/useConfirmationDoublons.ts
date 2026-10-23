import { useRef, useState } from 'react'
import { lire } from '../api/client'
import { messageUtilisateur } from '../api/erreurs'
import { cheminDoublons, type Formulaire, type Suggestion } from './logique'
import { libelles } from '../libelles'

/** Relecture au F8 : la suggestion différée ne suffit pas si l'opérateur valide pendant la frappe. */
export function useConfirmationDoublons(formulaire: Formulaire) {
  const chemin = cheminDoublons(formulaire)
  const [derniere, definirDerniere] = useState<{ chemin: string; suggestions: Suggestion[] } | null>(null)
  const [confirmation, definirConfirmation] = useState<string | null>(null)
  const [erreur, definirErreur] = useState<string | null>(null)
  const [enCours, definirEnCours] = useState(false)
  const occupe = useRef(false)
  const generation = useRef(0)
  const suggestions = derniere?.chemin === chemin ? derniere.suggestions : []
  const signature = (liste: Suggestion[]) => JSON.stringify([chemin, liste.map((s) => [s.id, s.raisons])])
  const confirme = confirmation === signature(suggestions)

  const verifier = async (): Promise<boolean> => {
    if (occupe.current) return false
    if (chemin === null) return true
    occupe.current = true
    const depart = generation.current
    definirEnCours(true)
    definirErreur(null)
    try {
      // Le téléphone seul garde son avertissement serveur et sa confirmation existants.
      const trouvees = (await lire<Suggestion[]>(chemin)).filter((s) => s.raisons.some((r) => r !== 'telephone'))
      if (depart !== generation.current) return false
      definirDerniere({ chemin, suggestions: trouvees })
      if (trouvees.length === 0 || confirmation === signature(trouvees)) return true
      definirErreur(libelles.apporteurs.verifierDoublons)
      return false
    } catch (e) {
      if (depart === generation.current) definirErreur(messageUtilisateur(e))
      return false
    } finally {
      occupe.current = false
      definirEnCours(false)
    }
  }

  const reinitialiser = () => {
    generation.current += 1
    definirConfirmation(null)
    definirDerniere(null)
    definirErreur(null)
  }

  return { suggestions, confirme, erreur, enCours, verifier, reinitialiser,
    confirmer: (valeur: boolean) => definirConfirmation(valeur ? signature(suggestions) : null) }
}
