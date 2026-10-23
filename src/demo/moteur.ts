import instantanes from './donnees.json'
import { commandeGestion } from './gestion'
import { commandeReception } from './receptions'
import { commandeVente } from './ventes'
import { copie, introuvable, liste, refuser, type Donnees, type Ligne } from './modele'

type Stockage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
export const CLE_DEMO = 'arrachid.demo.v1'
function stockageNavigateur(): Stockage | undefined { try { return globalThis.localStorage } catch { return undefined } }
const origine = 'https://demo.invalid'
const normaliser = (v: string) => v.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('fr')
function initialiser(): Donnees {
  const d: Donnees = {}
  for (const [chemin, valeur] of Object.entries(instantanes)) if (!chemin.includes('?')) d[chemin] = copie(valeur)
  d['/api/pieces/recents'] = Object.entries(d).filter(([k]) => /^\/api\/pieces\/\d+$/.test(k)).map(([,v]) => v).filter(v => v.type_piece === 'ticket_reception' && v.statut === 'emise').reverse()
  return d
}
export function creerMoteur(stockage: Stockage | undefined = stockageNavigateur()) {
  let d = initialiser()
  const commandes: Record<string, unknown> = {}
  try {
    const texte = stockage?.getItem(CLE_DEMO)
    if (texte) {
      const s = JSON.parse(texte)
      if (s.version === 1 && s.donnees && Object.keys(d).every(cle => cle in s.donnees) && s.donnees['/api/session']?.utilisateur?.role === 'proprietaire' && Array.isArray(s.donnees['/api/apporteurs'])) { d = s.donnees; Object.assign(commandes, s.commandes ?? {}) }
    }
  } catch { /* Stockage bloqué ou illisible : exemples en mémoire. */ }
  const sauvegarder = () => { try { stockage?.setItem(CLE_DEMO, JSON.stringify({ version: 1, donnees: d, commandes })) } catch { /* Continuer en mémoire. */ } }
  function lire(chemin: string): unknown {
    const url = new URL(chemin, origine), p = url.pathname
    if (p.endsWith('/doublons')) {
      return liste(d, p.replace('/doublons', '')).filter(x => String(x.id) !== url.searchParams.get('sauf_id')).map(x => ({ ...x, raisons: ['cin', 'telephone', 'matricule_fiscal'].filter(cle => url.searchParams.get(cle) && String(x[cle]) === url.searchParams.get(cle)) })).filter(x => x.raisons.length > 0)
    }
    const receptions = () => Object.entries(d).filter(([k]) => /^\/api\/receptions\/\d+$/.test(k)).map(([,v]) => v)
    if (p === '/api/documents/fiche-lot/recherche') {
      const texte = normaliser(url.searchParams.get('texte') ?? '')
      const rs = receptions().filter(r => /^\d+$/.test(texte) ? r.numero === Number(texte) : normaliser(r.apporteur.nom).includes(texte))
      return { complet: true, resultats: rs.map(r => ({ reception_id: r.id, numero: r.numero, statut: r.statut, regime: r.regime, cree_le: r.cree_le, apporteur_nom: r.apporteur.nom, net_kg: r.net_kg, tickets: r.ticket ? [{ numero: r.ticket.numero, numero_imprime: `DÉMO-${r.ticket.numero}`, statut: r.ticket.statut }] : [], trouve_par: /^\d+$/.test(texte) ? 'reception' : 'nom' })) }
    }
    if (p === '/api/documents/fiche-lot') {
      const rec = receptions().find(r => r.numero === Number(url.searchParams.get('numero'))) ?? refuser('Lot introuvable dans les exemples de démonstration.')
      return { type: 'fiche_lot', titre: `Fiche lot de démonstration n° ${rec.numero}`, entete: ['Données fictives — sans valeur comptable', rec.apporteur.nom], edite_le: new Date().toISOString(), edite_par: 'Propriétaire Démo', sections: [{ titre: 'Réception', colonnes: ['Information', 'Valeur'], lignes: [['Numéro', String(rec.numero)], ['Régime', rec.regime], ['État', rec.statut], ['Poids net (kg)', String(rec.net_kg ?? 'En attente')], ['Bacs', rec.bacs.join(', ')]], vide: '' }] }
    }
    if (p === '/api/receptions/tare') {
      const texte = url.searchParams.get('cin') ?? url.searchParams.get('texte') ?? ''
      const trouves = liste(d, '/api/receptions/en-attente').filter(r => !texte || JSON.stringify(r).includes(texte))
      return { a_tarer: trouves.filter(r => r.statut === 'versee'), a_decharger: trouves.filter(r => r.statut === 'pesee_brut') }
    }
    if (/^\/api\/historique\//.test(p) || /\/historique$/.test(p)) return { table: p.split('/')[2], ligne_id: Number(p.split('/')[3]), ligne: {}, historique: [] }
    if (p === '/api/parametres' || p === '/api/parametres/plages' || p === '/api/profils-fiscaux') return { ...d[p], heure_serveur: new Date().toISOString(), valide_du_minimum: new Date().toISOString() }
    if (p in d) {
      let valeur = d[p]
      const texte = normaliser(url.searchParams.get('q') ?? url.searchParams.get('texte') ?? '')
      if (Array.isArray(valeur) && texte) valeur = valeur.filter((x: Ligne) => normaliser(JSON.stringify(x)).includes(texte))
      if (p === '/api/clients' && !['1', 'true'].includes(url.searchParams.get('inactifs') ?? '')) valeur = valeur.filter((x: Ligne) => x.actif)
      if (p === '/api/pieces') valeur = liste(d, '/api/pieces/recents').filter(x => !texte || normaliser(JSON.stringify(x)).includes(texte))
      return valeur
    }
    return introuvable()
  }
  return {
    executer(methode: 'GET' | 'POST', chemin: string, corps: Ligne = {}): unknown {
      if (methode === 'GET') return copie(lire(chemin))
      const cle = typeof corps.commande_id === 'string' ? `${chemin}:${corps.commande_id}` : null
      if (cle && cle in commandes) return copie(commandes[cle])
      const avant = copie(d)
      try {
        const p = new URL(chemin, origine).pathname
        const resultat = p.startsWith('/api/ventes-detail') ? commandeVente(d, p, corps) : /^\/api\/(receptions|echantillons-olive|analyses)(\/|$)/.test(p) ? commandeReception(d, p, corps) : commandeGestion(d, p, corps)
        if (cle) commandes[cle] = copie(resultat)
        sauvegarder(); return copie(resultat)
      } catch (e) { d = avant; throw e }
    },
    reinitialiser() { d = initialiser(); for (const cle of Object.keys(commandes)) delete commandes[cle]; try { stockage?.removeItem(CLE_DEMO) } catch { /* Pas de stockage. */ } },
  }
}
export const moteur = creerMoteur()
