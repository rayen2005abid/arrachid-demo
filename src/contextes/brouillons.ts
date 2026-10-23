/** Mémoire d'une seule personne sur un seul poste ; aucune persistance navigateur. */
export class Brouillons {
  private valeurs = new Map<string, unknown>()
  private ecouteurs = new Set<() => void>()

  lire<T>(cle: string, initiale: T): T {
    // Mémoriser aussi une valeur initiale jamais modifiée (notamment l'identifiant de commande).
    if (!this.valeurs.has(cle)) this.valeurs.set(cle, initiale)
    return this.valeurs.get(cle) as T
  }

  ecrire<T>(cle: string, valeur: T) {
    this.valeurs.set(cle, valeur)
    this.ecouteurs.forEach((ecouteur) => ecouteur())
  }

  effacer(...cles: string[]) {
    cles.forEach((cle) => this.valeurs.delete(cle))
    this.ecouteurs.forEach((ecouteur) => ecouteur())
  }

  vider() {
    this.valeurs.clear()
  }

  abonner = (ecouteur: () => void) => {
    this.ecouteurs.add(ecouteur)
    return () => { this.ecouteurs.delete(ecouteur) }
  }
}
