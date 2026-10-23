import { centiemes } from '../laboratoire/analyse'

export type NiveauPlage = 'suspect' | 'impossible'
export interface VersionPlage {
  id: number
  niveau: NiveauPlage
  minimum: number | null
  maximum: number | null
  valide_du: string
  valide_au: string | null
  auteur: { id: number; nom: string }
  motif: string
}
export interface ChampPlage { champ: string; libelle: string; versions: VersionPlage[] }
export interface ListePlages {
  heure_serveur: string
  valide_du_minimum: string
  champs: ChampPlage[]
}

export function bornesPlage(minimum: string, maximum: string) {
  const min = minimum.trim() === '' ? null : centiemes(minimum)
  const max = maximum.trim() === '' ? null : centiemes(maximum)
  if ((minimum.trim() !== '' && min === null) || (maximum.trim() !== '' && max === null)
    || (min === null && max === null) || (min !== null && max !== null && min > max)) return null
  return { minimum: min, maximum: max }
}
