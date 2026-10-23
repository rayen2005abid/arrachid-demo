import { chercher, copie, entier, introuvable, liste, maintenant, refuser, suivant, utile, type Donnees, type Ligne } from './modele'

const REFERENTIELS = ['bacs', 'tampons', 'cuves', 'varietes', 'lignes-trituration', 'equipements', 'articles', 'utilisateurs']
export function commandeGestion(d: Donnees, chemin: string, c: Ligne): unknown {
  const parties = chemin.split('/').filter(Boolean)
  const domaine = parties[1]
  if (['apporteurs', 'clients', ...REFERENTIELS].includes(domaine) && (parties.length === 2 || parties[3] === 'modification')) {
    const base = `/api/${domaine}`, collection: Ligne[] = domaine === 'articles' ? d[base].articles : liste(d, base)
    const cle = ({ apporteurs: 'apporteur', clients: 'client', varietes: 'variete', cuves: 'cuve', bacs: 'bac', tampons: 'tampon', 'lignes-trituration': 'ligne', equipements: 'equipement', articles: 'article', utilisateurs: 'utilisateur' } as Record<string,string>)[domaine]
    if (parties.length === 2 && !String(c.nom ?? c.libelle ?? c.code ?? '').trim()) refuser('Saisissez un nom ou un libellé.')
    let fiche: Ligne
    if (parties.length === 2) {
      fiche = { id: suivant(collection), cin: null, cin_masquee: null, matricule_fiscal: null, telephone: null, adresse: null, localite: null, actif: 1, active: 1, regime_tva: 'normal', en_usage: false, cree_le: maintenant(), actions_possibles: ['modifier', 'desactiver'], ...utile(c) }
      collection.unshift(fiche)
      if (domaine === 'articles') d[base].articles = collection
      else d[base] = collection
    } else { fiche = chercher(collection, parties[2]); Object.assign(fiche, utile(c)) }
    if (fiche.cin) fiche.cin_masquee = `•••${String(fiche.cin).slice(-3)}`
    if (domaine === 'clients') fiche.actions_possibles = ['modifier', 'changer_regime_tva', fiche.actif ? 'desactiver' : 'reactiver']
    d[`${base}/${fiche.id}`] = { [cle]: fiche }
    if (domaine === 'cuves') { const ligne = d['/api/cuves/registre'].cuves.find((x: Ligne) => x.id === fiche.id); if (ligne) Object.assign(ligne, { libelle: fiche.libelle, capacite_g: fiche.capacite_g, active: Boolean(fiche.active) }) }
    if (domaine === 'articles') d['/api/ventes-detail/preparation'].articles = copie(collection)
    if (domaine === 'bacs') {
      const grille = d['/api/bacs-reception/grille'] as Ligne[]
      const bac = grille.find(b => b.id === fiche.id)
      if (bac) Object.assign(bac, { numero: fiche.numero, libelle: fiche.libelle })
      else grille.push({ id: fiche.id, numero: fiche.numero, libelle: fiche.libelle, etat: 'libre', occupation: null, actions_possibles: [] })
    }
    return { [cle]: fiche }
  }
  const parametre = chemin.match(/^\/api\/parametres\/([^/]+)\/valeurs$/)
  if (parametre) {
    const p = d['/api/parametres'].parametres.find((x: Ligne) => x.cle === parametre[1]) ?? refuser('Paramètre inconnu.')
    if (String(c.valeur ?? '').trim() === '') refuser('Saisissez une valeur.')
    if (p.type_valeur === 'entier' && !/^\d+$/.test(String(c.valeur))) refuser('Ce paramètre attend un entier positif ou nul.')
    const version = { id: suivant(p.versions), valeur: String(c.valeur), valide_du: c.valide_du ?? maintenant(), valide_au: null, auteur: { id: 1, nom: 'Propriétaire Démo' }, motif: c.motif ?? 'Essai de démonstration', cree_le: maintenant() }
    p.versions.unshift(version); p.valeur_actuelle = { id: version.id, valeur: version.valeur }
    return { parametre: p, valeur: version }
  }
  if (['/api/caisse/apport', '/api/caisse/sortie', '/api/caisse/apport-fonds', '/api/caisse/sortie-fonds'].includes(chemin)) {
    const montant = entier(c.montant_millimes, 'Montant')
    if (!d['/api/caisse/session'].session_caisse) refuser('Ouvrez une caisse de démonstration.')
    if (!String(c.motif ?? '').trim()) refuser('Indiquez une raison.')
    const apport = chemin.endsWith('apport-fonds') || chemin.endsWith('/apport'), resume = d['/api/caisse/resume'].resume
    if (!apport && montant > resume.attendu_millimes) refuser('La sortie dépasse les espèces disponibles dans cette caisse de démonstration.')
    resume[apport ? 'entrees_especes_millimes' : 'sorties_especes_millimes'] += montant
    resume.attendu_millimes += apport ? montant : -montant
    const mouvement = { id: Date.now(), sens: apport ? 'apport' : 'sortie', type: apport ? 'apport_fonds' : 'sortie_fonds', montant_millimes: montant, motif: c.motif, cree_le: maintenant(), mode: 'especes' }
    d['/api/caisse/journal'].sections[0].lignes.push([new Date().toLocaleString('fr-FR'), apport ? 'Apport de fonds (démo)' : 'Sortie de fonds (démo)', '', '', 'Espèces', '', apport ? `${(montant/1000).toFixed(3)} DT` : '', apport ? '' : `${(montant/1000).toFixed(3)} DT`, 'Propriétaire Démo', c.motif])
    return { mouvement }
  }
  if (chemin === '/api/prix') {
    const attente = chercher(d['/api/prix/en-attente'], c.reception_id)
    const montant = entier(c.prix_unitaire_millimes_kg, 'Prix')
    d['/api/prix/en-attente'] = d['/api/prix/en-attente'].filter((x: Ligne) => x.id !== attente.id)
    const rec = d[`/api/receptions/${attente.id}`]; rec.etat_prix = 'accepte'; rec.prix_unitaire_millimes = montant
    const prix = { id: Date.now(), statut: 'accepte', unite_prix: attente.unite_prix, prix_unitaire_millimes_kg: montant, suite_refus: null, poids_retour_kg: null, motif: null, net_kg: attente.net_kg, montant_millimes: attente.unite_prix === 'kg_olives' ? attente.net_kg * montant : null, ticket: rec.ticket, valide_par: 'Propriétaire Démo', valide_le: maintenant(), reception: { id: rec.id, numero: rec.numero, statut: rec.statut, regime: rec.regime, apporteur: rec.apporteur.nom } }
    const laboratoire = d['/api/laboratoire/file'].find((l: Ligne) => l.id === rec.id)
    if (laboratoire) laboratoire.etape = 'en_production'
    for (const a of liste(d, '/api/analyses')) if (a.reception.id === rec.id) a.etape = 'prix_fixe'
    const plan = d['/api/planification'].lots_a_planifier.find((l: Ligne) => l.id === rec.id)
    if (plan) plan.prix_en_attente = false
    else d['/api/planification'].lots_a_planifier.push({ id: rec.id, numero: rec.numero, apporteur: rec.apporteur.nom, regime: rec.regime, net_kg: rec.net_kg, reste_kg: rec.net_kg, arrivee: rec.cree_le, prix_en_attente: false })
    return { reception: rec, prix }
  }
  const impression = chemin.match(/^\/api\/pieces\/(\d+)\/impression$/)
  if (impression) {
    const p = d[`/api/pieces/${impression[1]}`] ?? refuser('Pièce inconnue.')
    p.nombre_impressions += 1
    p.impressions.unshift({ numero_impression: p.nombre_impressions, resultat: 'reussie', imprime_le: maintenant(), imprime_par_nom: 'Propriétaire Démo', poste_libelle: 'Simulation navigateur' })
    return { piece: p, impression: { resultat: 'reussie', numero_impression: p.nombre_impressions }, resultat: 'reussie', simulation: true }
  }
  return introuvable()
}
