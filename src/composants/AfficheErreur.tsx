import { messageUtilisateur } from '../api/erreurs'

interface Props {
  /** Message français déjà prêt, ou erreur capturée (seul `message` est affiché, jamais de code HTTP). */
  erreur: unknown
}

export function AfficheErreur({ erreur }: Props) {
  if (erreur === null || erreur === undefined || erreur === '') return null
  const texte = typeof erreur === 'string' ? erreur : messageUtilisateur(erreur)
  return <p className="erreur" role="alert">{texte}</p>
}
