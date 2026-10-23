import { libelles } from '../libelles'

/** Erreur du serveur ou du réseau. L'interface n'affiche que `message` (PROMPT §6.9). */
export class ErreurApi extends Error {
  readonly code: string
  readonly champ: string | null
  readonly statut: number

  constructor(code: string, message: string, champ: string | null = null, statut = 0) {
    super(message)
    this.name = 'ErreurApi'
    this.code = code
    this.champ = champ
    this.statut = statut
  }
}

export const CODE_SERVEUR_INDISPONIBLE = 'serveur_indisponible'

export function erreurServeurIndisponible(): ErreurApi {
  return new ErreurApi(CODE_SERVEUR_INDISPONIBLE, libelles.bandeau.serveurIndisponible, null, 0)
}

function texteOuNull(valeur: unknown): string | null {
  return typeof valeur === 'string' && valeur !== '' ? valeur : null
}

/** Transforme le corps `{"erreur": {code, message, champ}}` en erreur typée, sinon en erreur générique. */
export function analyserErreur(statut: number, corps: unknown): ErreurApi {
  if (typeof corps === 'object' && corps !== null && 'erreur' in corps) {
    const erreur = (corps as { erreur: unknown }).erreur
    if (typeof erreur === 'object' && erreur !== null) {
      const { code, message, champ } = erreur as Record<string, unknown>
      return new ErreurApi(
        texteOuNull(code) ?? 'erreur_interne',
        texteOuNull(message) ?? libelles.commun.erreurInconnue,
        texteOuNull(champ),
        statut,
      )
    }
  }
  return new ErreurApi('erreur_interne', libelles.commun.erreurInconnue, null, statut)
}

/** Texte affichable pour n'importe quelle erreur capturée : jamais de code HTTP ni de trace. */
export function messageUtilisateur(erreur: unknown): string {
  return erreur instanceof ErreurApi ? erreur.message : libelles.commun.erreurInconnue
}
