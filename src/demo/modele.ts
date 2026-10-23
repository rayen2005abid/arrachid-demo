/* eslint-disable @typescript-eslint/no-explicit-any */
// Modèle réservé aux contrats JSON des écrans de démonstration.
import { ErreurApi } from '../api/erreurs'
export type Ligne = Record<string, any>
export type Donnees = Record<string, any>
export const copie = <T,>(v: T): T => structuredClone(v)
export const maintenant = () => new Date().toISOString()
export function refuser(message: string): never { throw new ErreurApi('limite_demo', message, null, 400) }
export function entier(v: unknown, libelle: string, zero = false): number {
  if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < (zero ? 0 : 1)) refuser(`${libelle} : saisissez un entier ${zero ? 'positif ou nul' : 'strictement positif'}.`)
  return v as number
}
export function suivant(l: Ligne[]) { return Math.max(0, ...l.map(x => Number(x.id) || 0)) + 1 }
export function liste(d: Donnees, p: string): Ligne[] { return Array.isArray(d[p]) ? d[p] : [] }
export function chercher(l: Ligne[], id: unknown): Ligne { return l.find(x => x.id === Number(id)) ?? refuser('Élément introuvable dans cette démonstration.') }
export function utile(c: Ligne): Ligne { return Object.fromEntries(Object.entries(c).filter(([k]) => !['commande_id', 'validation', 'pin', 'confirmer_doublons', 'confirmer_telephone'].includes(k))) }
export function introuvable(): never { return refuser('Cette opération n’est pas simulée dans cette démonstration. Consultez les exemples ou essayez les parcours indiqués dans « Guide démo ».') }
