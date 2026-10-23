import type { ReactNode } from 'react'
import { ContexteSession } from '../contextes/session'
import { ContexteServeur } from '../contextes/serveur'
import { Brouillons } from '../contextes/brouillons'
import type { DescriptionSession, EtatServeur } from '../types'
import { moteur } from './moteur'

const rien = async () => {}
const session = moteur.executer('GET', '/api/session') as DescriptionSession
const etat = moteur.executer('GET', '/api/etat') as EtatServeur
const valeurSession = { statut: 'connecte' as const, session, utilisateurVerrouille: null, brouillons: new Brouillons(), connecter: rien, verrouiller: rien, changerUtilisateur: () => {}, recharger: rien }
const valeurServeur = { etat, disponible: true, miseEnServiceRequise: false, reverifierMiseEnService: rien }
export function FournisseurDemo({ children }: { children: ReactNode }) {
  return <ContexteServeur.Provider value={valeurServeur}><ContexteSession.Provider value={valeurSession}>{children}</ContexteSession.Provider></ContexteServeur.Provider>
}
