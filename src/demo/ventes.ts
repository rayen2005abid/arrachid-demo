import { chercher, copie, entier, maintenant, refuser, suivant, type Donnees, type Ligne } from './modele'

// Calculs illustratifs des profils fictifs ; aucun document fiscal officiel n'est émis.
export function commandeVente(d: Donnees, chemin: string, c: Ligne): unknown {
  const preparation = d['/api/ventes-detail/preparation']
  if (!Array.isArray(c.lignes) || c.lignes.length === 0) refuser('Choisissez au moins un article.')
  const client = c.client_id ? chercher(d['/api/clients'], c.client_id) : null
  const profil = d['/api/profils-fiscaux'].profils.find((p: Ligne) => p.type_operation === 'vente_detail' && p.regime_tva_client === (client?.regime_tva ?? 'normal') && p.en_vigueur) ?? refuser('Profil fictif indisponible.')
  const articlesVus = new Set<number>(), besoinsCuves = new Map<number, number>()
  const lignes = c.lignes.map((saisie: Ligne) => {
    const a = chercher(preparation.articles, saisie.article_id)
    if (articlesVus.has(a.id)) refuser('Un article ne peut apparaître qu’une fois.')
    articlesVus.add(a.id)
    const q = entier(saisie.quantite, 'Quantité')
    if (!Number.isSafeInteger(q * a.prix_unitaire_millimes)) refuser('Quantité trop grande pour cette démonstration.')
    if (a.type_article === 'contenant' && q > a.stock) refuser('Stock de contenants insuffisant.')
    let cuve: Ligne | null = null
    if (a.type_article === 'huile') {
      cuve = chercher(preparation.cuves, saisie.cuve_id ?? c.cuve_id)
      if (cuve.qualite_affectee !== a.qualite_huile) refuser('Choisissez une cuve de la qualité vendue.')
      const total = (besoinsCuves.get(cuve.id) ?? 0) + q
      if (total > cuve.disponible_g) refuser('Stock d’huile disponible insuffisant.')
      besoinsCuves.set(cuve.id, total)
    }
    const ht = a.type_article === 'huile' ? Math.floor((q * a.prix_unitaire_millimes + 500) / 1000) : q * a.prix_unitaire_millimes
    const para = Math.floor((ht * profil.taux_parafiscal_ppm + 500000) / 1000000)
    const base = ht + (profil.parafiscal_dans_base_tva ? para : 0)
    const tva = Math.floor((base * profil.taux_tva_ppm + 500000) / 1000000)
    return { article_id: a.id, code: a.code, libelle: a.libelle, type_article: a.type_article, quantite: q, quantite_affichee: `${a.type_article === 'huile' ? q / 1000 : q} ${a.type_article === 'huile' ? 'kg' : 'pièce(s)'}`, cuve_id: cuve?.id ?? null, montant_ht_millimes: ht, montant_parafiscal_millimes: para, montant_tva_millimes: tva, base_tva_millimes: base, prix: a.prix_unitaire_millimes, ht, taux_tva_ppm: profil.taux_tva_ppm, taux_parafiscal_ppm: profil.taux_parafiscal_ppm }
  })
  const somme = (cle: string) => lignes.reduce((n: number, l: Ligne) => n + l[cle], 0)
  const totaux = { montant_ht_millimes: somme('montant_ht_millimes'), montant_tva_millimes: somme('montant_tva_millimes'), montant_parafiscal_millimes: somme('montant_parafiscal_millimes'), timbre_millimes: profil.timbre_millimes, montant_ttc_millimes: 0 }
  totaux.montant_ttc_millimes = totaux.montant_ht_millimes + totaux.montant_tva_millimes + totaux.montant_parafiscal_millimes + totaux.timbre_millimes
  if (chemin.endsWith('/apercu')) return { apercu: { lignes, totaux } }
  if (!['especes', 'cheque', 'virement'].includes(c.mode)) refuser('Choisissez le mode de règlement.')
  if (c.montant_ttc_attendu_millimes !== totaux.montant_ttc_millimes) refuser('Le montant a changé. Vérifiez l’aperçu avant de confirmer.')
  if (!d['/api/caisse/session'].session_caisse) refuser('Une caisse ouverte est nécessaire.')
  for (const l of lignes) {
    const a = chercher(preparation.articles, l.article_id)
    if (a.type_article === 'contenant') {
      a.stock -= l.quantite
      const reference = d['/api/articles'].articles.find((x: Ligne) => x.id === a.id)
      if (reference) reference.stock = a.stock
    }
  }
  for (const [id, q] of besoinsCuves) {
    chercher(preparation.cuves, id).disponible_g -= q
    const cuve = chercher(d['/api/cuves/registre'].cuves, id)
    cuve.stock_calcule_g -= q; cuve.stock_disponible_g -= q
    cuve.remplissage_centiemes = Math.floor(cuve.stock_calcule_g * 10000 / cuve.capacite_g)
    const qualite = d['/api/cuves/registre'].qualites.find((x: Ligne) => x.qualite === cuve.qualite_affectee)
    if (qualite) { qualite.stock_calcule_g -= q; qualite.stock_disponible_g -= q }
  }
  const ventes = d['/api/ventes-detail'].ventes
  const vente = { id: suivant(ventes), numero: 1000 + suivant(ventes), recu_id: 1000 + suivant(ventes), client_id: c.client_id ?? null, cree_le: maintenant(), mode: c.mode, statut: 'finalisee', montant_ttc_millimes: totaux.montant_ttc_millimes, lignes, totaux }
  ventes.unshift(vente)
  const resume = d['/api/caisse/resume'].resume
  if (c.mode === 'especes') { resume.entrees_especes_millimes += totaux.montant_ttc_millimes; resume.attendu_millimes += totaux.montant_ttc_millimes }
  else resume.autres_modes_millimes[c.mode] = (resume.autres_modes_millimes[c.mode] ?? 0) + totaux.montant_ttc_millimes
  d['/api/caisse/journal'].sections[0].lignes.push([new Date().toLocaleString('fr-FR'), 'Vente au détail (démo)', String(vente.numero), client?.nom ?? '', c.mode, '', `${(totaux.montant_ttc_millimes / 1000).toFixed(3)} DT`, '', 'Propriétaire Démo', 'Simulation'])
  return { vente: copie(vente) }
}
