// État El Fatoora d'une facture, en mots simples (CONTEXTE §24).
const LIBELLES: Record<string, string> = {
  a_envoyer: 'À envoyer',
  envoyee: 'Envoyée',
  acceptee: 'Acceptée',
  rejetee: 'Rejetée',
}

export function libelleElFatoora(statut: string, erreur: string | null = null): string {
  const libelle = LIBELLES[statut] ?? statut
  if (statut === 'rejetee' && erreur) return `${libelle} — ${erreur} La facture reste émise ; prévenez le comptable.`
  if (statut === 'a_envoyer' && erreur) return `${libelle} — dernier essai : ${erreur}`
  return libelle
}
