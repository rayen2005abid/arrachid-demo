import { libelles } from '../libelles'
import type { EtatServeur, TypePoste } from '../types'
import type { EtatLampe } from './Lampe'

const b = libelles.barreEtat

export function libelleServeur(etat: EtatServeur | null, disponible: boolean): string {
  if (!disponible) return b.serveurIndisponible
  return etat === null ? b.serveurEnAttente : b.serveurConnecte
}

export function libelleBascule(etat: EtatServeur | null): string {
  if (etat?.bascule === 'automatique') return b.basculeAutomatique
  if (etat?.bascule === 'indisponible') return b.basculeIndisponible
  return b.basculeManuelle
}

export function libelleImprimante(etat: EtatServeur | null): string {
  if (etat?.imprimante_ticket === 'disponible') return b.imprimanteDisponible
  if (etat?.imprimante_ticket === 'indisponible') return b.imprimanteIndisponible
  return b.imprimanteInconnue
}

/**
 * Voyants utiles au poste (T-164, A12) : le serveur partout ; la bascule au poste de réception ; l'imprimante de tickets
 * au poste de réception, ou ailleurs quand une imprimante est liée au poste (« inconnue » : aucune n'est liée).
 * Campagne, poste et utilisateur sont dans la barre du haut : la barre d'état ne les répète pas.
 */
export function voyantsDuPoste(etat: EtatServeur | null, disponible: boolean, typePoste: TypePoste | null): { etat: EtatLampe; libelle: string }[] {
  const voyants: { etat: EtatLampe; libelle: string }[] = [
    { etat: !disponible ? 'erreur' : etat === null ? 'eteinte' : 'ok', libelle: libelleServeur(etat, disponible) },
  ]
  if (typePoste === 'reception') {
    voyants.push({ etat: etat?.bascule === 'indisponible' ? 'erreur' : etat?.bascule === 'automatique' ? 'ok' : 'alerte', libelle: libelleBascule(etat) })
  }
  const imprimante = etat?.imprimante_ticket ?? 'inconnue'
  if (typePoste === 'reception' || imprimante !== 'inconnue') {
    voyants.push({ etat: imprimante === 'disponible' ? 'ok' : imprimante === 'indisponible' ? 'erreur' : 'eteinte', libelle: libelleImprimante(etat) })
  }
  return voyants
}

/** La forme de `campagne` est fixée par une tâche ultérieure : on lit un libellé s'il existe. */
export function libelleCampagne(campagne: unknown): string {
  if (typeof campagne === 'string' && campagne !== '') return campagne
  if (typeof campagne === 'object' && campagne !== null) {
    const { libelle, nom, code } = campagne as Record<string, unknown>
    for (const candidat of [libelle, nom, code]) {
      if (typeof candidat === 'string' && candidat !== '') return candidat
    }
  }
  return b.aucuneCampagne
}
