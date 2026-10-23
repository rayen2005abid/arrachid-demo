import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { envoyer, lire, surSessionTerminee } from '../api/client'
import { ErreurApi } from '../api/erreurs'
import { DELAI_INACTIVITE_MS, creerMinuteurInactivite } from '../inactivite'
import type { DescriptionSession, UtilisateurListe } from '../types'
import { ContexteSession, type StatutSession, type ValeurSession } from './session'
import { Brouillons } from './brouillons'

const PERIODE_NOUVEL_ESSAI_MS = 5000
const EVENEMENTS_ACTIVITE = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const

export function FournisseurSession({ children }: { children: ReactNode }) {
  const [statut, definirStatut] = useState<StatutSession>('chargement')
  const [session, definirSession] = useState<DescriptionSession | null>(null)
  const [utilisateurVerrouille, definirUtilisateurVerrouille] = useState<UtilisateurListe | null>(null)
  const [brouillons, definirBrouillons] = useState(() => new Brouillons())
  const brouillonsCourants = useRef(brouillons)
  const proprietaireBrouillons = useRef<string | null>(null)
  const etat = useRef({ statut, session })
  etat.current = { statut, session }

  const effacerBrouillons = useCallback(() => {
    brouillonsCourants.current.vider()
    const nouveaux = new Brouillons()
    brouillonsCourants.current = nouveaux
    definirBrouillons(nouveaux)
  }, [])

  const ouvrirSession = useCallback((ouverte: DescriptionSession) => {
    const proprietaire = `${ouverte.poste.id}:${ouverte.utilisateur.id}`
    if (proprietaireBrouillons.current !== proprietaire) effacerBrouillons()
    proprietaireBrouillons.current = proprietaire
    definirSession(ouverte)
    definirStatut('connecte')
  }, [effacerBrouillons])

  const recharger = useCallback(async () => {
    try {
      const lue = await lire<DescriptionSession>('/api/session')
      ouvrirSession(lue)
    } catch (erreur) {
      definirSession(null)
      if (erreur instanceof ErreurApi && erreur.code === 'poste_non_appaire') definirStatut('non_appaire')
      else if (erreur instanceof ErreurApi && erreur.code === 'non_connecte') {
        definirStatut(etat.current.statut === 'verrouille' ? 'verrouille' : 'deconnecte')
      } else definirStatut('indisponible') // CODE_SERVEUR_INDISPONIBLE ou réponse inattendue
    }
  }, [ouvrirSession])

  const verrouillerLocalement = useCallback(() => {
    const courante = etat.current.session
    if (courante) definirUtilisateurVerrouille(courante.utilisateur)
    definirSession(null)
    definirStatut('verrouille')
  }, [])

  // Chargement initial, puis nouvel essai périodique tant que le serveur est injoignable.
  useEffect(() => {
    void recharger()
  }, [recharger])
  useEffect(() => {
    if (statut !== 'indisponible') return
    const minuteur = setInterval(() => void recharger(), PERIODE_NOUVEL_ESSAI_MS)
    return () => clearInterval(minuteur)
  }, [statut, recharger])

  // Toute réponse 401 pendant une session ouverte affiche l'écran de verrouillage.
  useEffect(
    () =>
      surSessionTerminee(() => {
        if (etat.current.statut === 'connecte') verrouillerLocalement()
      }),
    [verrouillerLocalement],
  )

  const verrouiller = useCallback(async () => {
    try {
      await envoyer('/api/session/deconnexion', {})
    } catch {
      // Le serveur expirera la session de toute façon ; l'écran se verrouille quand même.
    }
    verrouillerLocalement()
  }, [verrouillerLocalement])

  // Verrouillage après 10 minutes sans interaction ; un battement prolonge la session serveur.
  useEffect(() => {
    if (statut !== 'connecte') return
    const minuteur = creerMinuteurInactivite(
      DELAI_INACTIVITE_MS,
      () => void verrouiller(),
      () => {
        lire('/api/session').catch(() => undefined) // un 401 déclenche déjà le verrouillage
      },
    )
    const surActivite = () => minuteur.activite()
    EVENEMENTS_ACTIVITE.forEach((nom) => window.addEventListener(nom, surActivite, true))
    return () => {
      minuteur.arreter()
      EVENEMENTS_ACTIVITE.forEach((nom) => window.removeEventListener(nom, surActivite, true))
    }
  }, [statut, verrouiller])

  const connecter = useCallback(async (utilisateurId: number, pin: string) => {
    const ouverte = await envoyer<DescriptionSession>('/api/session/connexion', {
      utilisateur_id: utilisateurId,
      pin,
    })
    ouvrirSession(ouverte)
    definirUtilisateurVerrouille(null)
  }, [ouvrirSession])

  const changerUtilisateur = useCallback(() => {
    effacerBrouillons()
    proprietaireBrouillons.current = null
    definirUtilisateurVerrouille(null)
    definirStatut('deconnecte')
  }, [effacerBrouillons])

  const valeur: ValeurSession = useMemo(
    () => ({ statut, session, utilisateurVerrouille, connecter, verrouiller, changerUtilisateur, recharger, brouillons }),
    [statut, session, utilisateurVerrouille, connecter, verrouiller, changerUtilisateur, recharger, brouillons],
  )
  return <ContexteSession.Provider value={valeur}>{children}</ContexteSession.Provider>
}
