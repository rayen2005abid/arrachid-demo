// Formes des réponses du serveur consommées par la coquille.

export type Role = 'operateur' | 'responsable' | 'proprietaire' | 'administrateur'
export type TypePoste = 'reception' | 'laboratoire' | 'production' | 'bureau'

export interface UtilisateurListe {
  id: number
  nom: string
  role: Role
}

export interface Poste {
  id: number
  code: string
  libelle: string
  type_poste: TypePoste
}

export interface DescriptionSession {
  utilisateur: UtilisateurListe
  poste: Poste
  permissions: string[]
}

export interface EtatServeur {
  serveur: string
  base: string
  bascule: 'manuel' | 'automatique' | 'indisponible'
  imprimante_ticket: 'disponible' | 'indisponible' | 'inconnue'
  campagne: unknown
}

/** Preuve de PIN frais d'un responsable ou propriétaire, jointe aux commandes sensibles. */
export interface Validation {
  utilisateur_id: number
  pin: string
}
