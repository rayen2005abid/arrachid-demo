import { moteur } from '../demo/moteur'
import { creerIdentifiantCommande } from './identifiant'
import { memoriserLecture, noterLectureEnCours } from './memoire'
export const reglages = { nouvellesTentatives: 0, delaiTentativeMs: 0 }
export interface OptionsEnvoi { commandeId?: string }
// Compatibilité des anciens composants copiés : la démo ne possède aucune session réseau.
export function surServeurIndisponible(ecouteur: () => void) { void ecouteur; return () => {} }
export function surSessionTerminee(ecouteur: () => void) { void ecouteur; return () => {} }
export function lire<T>(chemin: string): Promise<T> {
  const promesse = Promise.resolve().then(() => moteur.executer('GET', chemin) as T).then(d => { memoriserLecture(chemin, d); return d })
  noterLectureEnCours(chemin, promesse)
  return promesse
}
export async function envoyer<T>(chemin: string, corps: Record<string, unknown> = {}, options: OptionsEnvoi = {}): Promise<T> {
  const resultat = moteur.executer('POST', chemin, { ...corps, commande_id: options.commandeId ?? creerIdentifiantCommande() }) as T
  if (!chemin.endsWith('/apercu')) window.dispatchEvent(new Event('arrachid-demo-modifiee'))
  return resultat
}
