import { chercher, entier, introuvable, liste, maintenant, refuser, suivant, utile, type Donnees, type Ligne } from './modele'

function occuper(d: Donnees, rec: Ligne, bacs: unknown) {
  if (!Array.isArray(bacs)) refuser('Choisissez les bacs de réception.')
  const choisis = (bacs as unknown[]).map(id => chercher(liste(d, '/api/bacs-reception/grille'), id))
  if (choisis.some(b => b.etat !== 'libre')) refuser('Un des bacs sélectionnés est déjà occupé.')
  rec.bacs = choisis.map(b => b.id)
  for (const b of choisis) { b.etat = 'occupe'; b.occupation = { bac_reception_id: 1000 + b.id, reception_id: rec.id, numero_reception: rec.numero, apporteur: rec.apporteur.nom, regime: rec.regime, occupe_le: maintenant() }; b.actions_possibles = ['liberer'] }
}
function ticket(d: Donnees, rec: Ligne) {
  const pieces = Object.entries(d).filter(([k]) => /^\/api\/pieces\/\d+$/.test(k)).map(([,v]) => v)
  const id = Math.max(100, suivant(pieces))
  const piece = { id, numero: id, numero_imprime: `DÉMO-${id}`, type_piece: 'ticket_reception', serie: 'demo', statut: 'emise', nombre_impressions: 0, emis_le: maintenant(), emis_par_nom: 'Propriétaire Démo', reception_id: rec.id, reception_numero: rec.numero, apporteur_nom: rec.apporteur.nom, net_kg: rec.net_kg, actions_possibles: ['imprimer'], impressions: [] }
  d[`/api/pieces/${id}`] = piece; d['/api/pieces/recents'].unshift(piece)
  rec.ticket = { piece_id: id, numero: id, statut: 'emise', nombre_impressions: 0 }
  rec.lot = { id: rec.id, numero: rec.numero, statut: 'a_analyser', poids_kg_cache: rec.net_kg }
  if (!liste(d, '/api/laboratoire/file').some(l => l.id === rec.id)) d['/api/laboratoire/file'].unshift({ id: rec.id, numero: rec.numero, statut: 'en_analyse', regime: rec.regime, apporteur: rec.apporteur.nom, net_kg: rec.net_kg, bacs: rec.bacs, ticket_le: maintenant(), etape: 'a_analyser', echantillon: null, actions_possibles: ['analyser'] })
  return { reception: rec, impression: { piece_id: id, statut: 'non_confirmee', message: 'Ticket de démonstration — aucune impression matérielle.', numero_impression: null, nombre_impressions: 0 } }
}
export function commandeReception(d: Donnees, chemin: string, c: Ligne): unknown {
  if (chemin === '/api/receptions' || chemin === '/api/receptions/pesee-directe') {
    const apporteur = chercher(liste(d, '/api/apporteurs'), c.apporteur_id)
    if (!['achat', 'facon', 'mixte'].includes(c.regime)) refuser('Choisissez le régime de réception.')
    const directe = chemin.endsWith('pesee-directe')
    const poids = entier(directe ? c.poids_kg ?? c.net_kg : c.poids_brut_kg, 'Poids')
    const ids = Object.keys(d).filter(k => /^\/api\/receptions\/\d+$/.test(k)).map(k => Number(k.split('/').pop()))
    const id = Math.max(100, ...ids) + 1
    const rec: Ligne = { ...utile(c), id, numero: id, statut: directe ? 'en_analyse' : 'pesee_brut', apporteur: { id: apporteur.id, nom: apporteur.nom, telephone: apporteur.telephone }, cree_le: maintenant(), poids_brut_kg: directe ? null : poids, poids_tare_kg: null, net_kg: directe ? poids : null, pesee_directe: directe, bacs: [], ticket: null, sms: null, cin_masquee: apporteur.cin_masquee, actions_possibles: directe ? ['annuler'] : ['decharger', 'annuler'], lot: null }
    if (directe) occuper(d, rec, c.bacs ?? [])
    d[`/api/receptions/${id}`] = rec
    if (!directe) d['/api/receptions/en-attente'].unshift(rec)
    d['/api/decomptes'].unshift({ reception_id: id, reception_numero: id, regime: rec.regime, statut_reception: rec.statut, apporteur: apporteur.nom, apporteur_id: apporteur.id, decompte_id: null, regle: 0, lot_statut: 'a_analyser', pret: false, attente_reglement: null })
    return directe ? ticket(d, rec) : { reception: rec }
  }
  const match = chemin.match(/^\/api\/receptions\/(\d+)\/(dechargement|pesee-tare|tare|annulation)$/)
  if (match) {
    const rec = d[`/api/receptions/${match[1]}`] ?? refuser('Réception introuvable.')
    if (match[2] === 'dechargement') {
      if (rec.statut !== 'pesee_brut') refuser('Cette réception ne peut plus être déchargée.')
      occuper(d, rec, c.bacs); rec.statut = 'versee'; rec.actions_possibles = ['tarer', 'annuler']
    } else if (match[2] === 'annulation') {
      refuser('L’annulation des faits métier reste en consultation dans cette démonstration.')
    } else {
      if (rec.statut !== 'versee') refuser('Déchargez la réception avant la tare.')
      const tare = entier(c.poids_tare_kg, 'Tare', true)
      if (tare >= rec.poids_brut_kg) refuser('La tare doit être inférieure au poids brut.')
      rec.poids_tare_kg = tare; rec.net_kg = rec.poids_brut_kg - tare; rec.statut = 'en_analyse'; rec.actions_possibles = ['annuler']
      d['/api/receptions/en-attente'] = liste(d, '/api/receptions/en-attente').filter(l => l.id !== rec.id)
      return ticket(d, rec)
    }
    d['/api/receptions/en-attente'] = liste(d, '/api/receptions/en-attente').map(l => l.id === rec.id ? rec : l)
    return { reception: rec }
  }
  if (chemin === '/api/echantillons-olive') {
    const rec = chercher(liste(d, '/api/laboratoire/file'), c.reception_id)
    const e = { id: suivant(d['/api/echantillons-olive']), reference: `DÉMO-E${rec.numero}`, reception: { id: rec.id, numero: rec.numero, regime: rec.regime, apporteur: rec.apporteur }, preleve_le: maintenant(), preleve_par: 'Propriétaire Démo', emplacement: c.emplacement ?? 'Étagère démo', date_fin_conservation: null, detruit_le: null, detruit_par: null, analyse_saisie: false, actions_possibles: [] }
    d['/api/echantillons-olive'].unshift(e); rec.echantillon = e; rec.etape = 'a_analyser'; rec.actions_possibles = ['analyser']
    return { echantillon: e }
  }
  if (chemin === '/api/analyses') {
    const e = c.echantillon_id ? chercher(d['/api/echantillons-olive'], c.echantillon_id) : null
    const rec = chercher(d['/api/laboratoire/file'], c.reception_id ?? e?.reception.id)
    if (rec.etape !== 'a_analyser') refuser('L’analyse de cette réception est déjà saisie.')
    for (const champ of ['acidite_centiemes', 'taux_huile_centiemes', 'rendement_prevu_centiemes', 'humidite_centiemes']) {
      const v = entier(c[champ], champ, true)
      if (v > 10000) refuser('Le pourcentage doit être compris entre 0 et 100 %.')
    }
    const analyse = { ...utile(c), id: suivant(d['/api/analyses']), reception: { id: rec.id, numero: rec.numero, apporteur: rec.apporteur, regime: rec.regime }, variete: liste(d, '/api/varietes').find(v => v.id === c.variete_id)?.libelle ?? null, analyseur: 'Analyseur simulé', saisi_par: 'Propriétaire Démo', saisi_le: maintenant(), reference: e?.reference ?? `DÉMO-E${rec.numero}`, etape: 'prix_attendu', corrections: 0, actions_possibles: [] }
    d['/api/analyses'].unshift(analyse)
    if (e) e.analyse_saisie = true
    rec.etape = rec.regime === 'facon' ? 'en_production' : 'prix_en_attente'; rec.actions_possibles = []
    if (rec.regime !== 'facon') d['/api/prix/en-attente'].unshift({ id: rec.id, numero: rec.numero, apporteur: rec.apporteur, regime: rec.regime, net_kg: rec.net_kg, unite_prix: 'kg_olives', partage: null, analyse: { ...analyse, inhabituelles: [] }, actions_possibles: ['fixer_prix', 'refuser_prix'] })
    return { analyse: { ...analyse, variete: liste(d, '/api/varietes').find(v => v.id === c.variete_id) ?? null, echantillon: { id: e?.id ?? rec.id, reference: analyse.reference }, reception: { ...analyse.reception, statut: 'en_analyse', analyse_prete: true } } }
  }
  return introuvable()
}
