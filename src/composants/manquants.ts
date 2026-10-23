// Données manquantes (`GET /api/mise-en-service/manquants`) : forme du rapport et logique du bandeau (EM-02).
import { libelles } from '../libelles'
import type { TypePoste } from '../types'

export interface ModuleManquants {
  module: string
  libelle: string
  pret: boolean
  parametres_manquants: { cle: string; libelle: string }[]
  donnees_manquantes: { code: string; libelle: string }[]
  /** À compléter sans rendre le module indisponible (plages de l'analyseur). */
  avertissements: { code: string; libelle: string }[]
  /** Types de poste dont les écrans ont besoin du module. */
  postes: TypePoste[]
}

export const CHEMIN_MANQUANTS = '/api/mise-en-service/manquants'
const b = libelles.bandeauModules

/** Modules indisponibles dont un écran de ce type de poste a besoin. */
export function modulesIndisponibles(modules: readonly ModuleManquants[], typePoste: TypePoste): ModuleManquants[] {
  return modules.filter((m) => !m.pret && m.postes.includes(typePoste))
}

/** « Trituration et cuves indisponible. À saisir par le propriétaire : … » */
export function phraseModule(m: ModuleManquants): string {
  const morceaux = [b.indisponible.replace('{module}', m.libelle)]
  if (m.parametres_manquants.length > 0) morceaux.push(b.parametres.replace('{liste}', m.parametres_manquants.map((p) => p.libelle).join(' ; ')))
  if (m.donnees_manquantes.length > 0) morceaux.push(b.donnees.replace('{liste}', m.donnees_manquantes.map((d) => d.libelle).join(' ; ')))
  return morceaux.join(' ')
}
