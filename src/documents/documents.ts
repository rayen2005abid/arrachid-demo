/** Documents édités à la demande (T5.6) : le serveur envoie des sections déjà mises en forme. */

export interface SectionDocument {
  titre: string
  colonnes: string[]
  lignes: string[][]
  vide: string
}

export interface DocumentEdite {
  type: 'fiche_lot' | 'registre_journalier' | 'rapport_corrections' | 'journal_caisse'
  titre: string
  entete: string[]
  edite_le: string
  edite_par: string
  sections: SectionDocument[]
}

/** Requête d'un document : `?numero=12` ou `?date=2026-10-25` ; sans valeur, rien n'est demandé. */
export function cheminDocument(base: string, cle: 'numero' | 'date', valeur: string, pdf = false): string | null {
  const propre = valeur.trim()
  if (propre === '') return null
  return `${base}${pdf ? '/pdf' : ''}?${cle}=${encodeURIComponent(propre)}`
}
