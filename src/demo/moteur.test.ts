import { describe, expect, it } from 'vitest'
import { creerMoteur } from './moteur'

function stockageMemoire() {
  const valeurs = new Map<string, string>()
  return { getItem: (cle: string) => valeurs.get(cle) ?? null, setItem: (cle: string, valeur: string) => { valeurs.set(cle, valeur) }, removeItem: (cle: string) => { valeurs.delete(cle) } }
}
type Fiche = Record<string, unknown> & { id: number }
describe('Démo autonome du propriétaire', () => {
  it('ouvre directement une session propriétaire avec les vrais droits métier', () => {
    const m = creerMoteur(stockageMemoire())
    const s = m.executer('GET', '/api/session') as { utilisateur: { role: string }; permissions: string[] }
    expect(s.utilisateur.role).toBe('proprietaire')
    expect(s.permissions).toContain('gerer_parametres')
    expect(s.permissions).not.toContain('administrer_technique')
  })
  it('crée un apporteur, le retrouve après rechargement puis restaure les exemples', () => {
    const stockage = stockageMemoire()
    const m = creerMoteur(stockage)
    const avant = (m.executer('GET', '/api/apporteurs') as Fiche[]).length
    const creation = m.executer('POST', '/api/apporteurs', { nom: 'Visiteur Démo', type_apporteur: 'personne', cin: '00000123', telephone: '20000123', commande_id: 'unique-1' }) as { apporteur: Fiche }
    expect(creation.apporteur.nom).toBe('Visiteur Démo')
    m.executer('POST', '/api/apporteurs', { nom: 'Visiteur Démo', type_apporteur: 'personne', commande_id: 'unique-1' })
    expect((m.executer('GET', '/api/apporteurs') as Fiche[]).length).toBe(avant + 1)
    const recharge = creerMoteur(stockage)
    expect((recharge.executer('GET', '/api/apporteurs?q=Visiteur') as Fiche[]).map(a => a.nom)).toEqual(['Visiteur Démo'])
    recharge.reinitialiser()
    expect((recharge.executer('GET', '/api/apporteurs') as Fiche[]).length).toBe(avant)
  })
  it('conserve les changements même si le stockage navigateur est indisponible', () => {
    const m = creerMoteur({ getItem: () => { throw Error('bloqué') }, setItem: () => { throw Error('plein') }, removeItem: () => {} })
    m.executer('POST', '/api/clients', { nom: 'Client local', type_client: 'personne', cin: '00000124' })
    expect((m.executer('GET', '/api/clients?q=Client%20local') as Fiche[])[0].nom).toBe('Client local')
  })
  it('refuse les commandes inconnues sans modifier les données', () => {
    const m = creerMoteur(stockageMemoire())
    const avant = m.executer('GET', '/api/apporteurs')
    expect(() => m.executer('POST', '/api/inconnu', {})).toThrow(/démonstration/)
    expect(m.executer('GET', '/api/apporteurs')).toEqual(avant)
  })
  it('refuse un montant négatif et conserve la caisse', () => {
    const m = creerMoteur(stockageMemoire())
    const avant = m.executer('GET', '/api/caisse/session')
    expect(() => m.executer('POST', '/api/caisse/apport-fonds', { montant_millimes: -1, motif: 'Essai' })).toThrow()
    expect(m.executer('GET', '/api/caisse/session')).toEqual(avant)
  })
  it('refuse une pesée directe négative et ajoute un lot valide au laboratoire', () => {
    const m = creerMoteur(stockageMemoire())
    const a = (m.executer('GET', '/api/apporteurs') as Fiche[])[0]
    expect(() => m.executer('POST', '/api/receptions/pesee-directe', { apporteur_id: a.id, poids_net_kg: -2, bacs: [] })).toThrow()
    const r = m.executer('POST', '/api/receptions/pesee-directe', { apporteur_id: a.id, net_kg: 150, regime: 'achat', bacs: [] }) as { reception: Fiche }
    expect(r.reception.net_kg).toBe(150)
    expect((m.executer('GET', '/api/laboratoire/file') as Fiche[]).some(l => l.id === r.reception.id)).toBe(true)
  })
  it('récupère un état initial si les données sauvegardées sont illisibles', () => {
    const m = creerMoteur({ getItem: () => '{invalide', setItem: () => {}, removeItem: () => {} })
    expect((m.executer('GET', '/api/apporteurs') as Fiche[]).length).toBeGreaterThan(0)
  })
  it('enregistre un apport de fonds avec le contrat du formulaire et actualise le montant attendu', () => {
    const m = creerMoteur(stockageMemoire())
    const avant = m.executer('GET', '/api/caisse/resume') as { resume: { attendu_millimes: number } }
    const r = m.executer('POST', '/api/caisse/apport', { montant_millimes: 10000, motif: 'Essai' }) as { mouvement: { sens: string } }
    expect(r.mouvement.sens).toBe('apport')
    expect((m.executer('GET', '/api/caisse/resume') as typeof avant).resume.attendu_millimes).toBe(avant.resume.attendu_millimes + 10000)
  })
  it('fixe un prix depuis le formulaire et retire le lot des prix en attente', () => {
    const m = creerMoteur(stockageMemoire())
    const lot = (m.executer('GET', '/api/prix/en-attente') as Fiche[])[0]
    const r = m.executer('POST', '/api/prix', { reception_id: lot.id, prix_unitaire_millimes_kg: 1500 }) as { prix: { reception: { numero: number }; montant_millimes: number } }
    expect(r.prix.reception.numero).toBe(lot.numero)
    expect(r.prix.montant_millimes).toBe(Number(lot.net_kg) * 1500)
    expect((m.executer('GET', '/api/prix/en-attente') as Fiche[]).some(x => x.id === lot.id)).toBe(false)
  })
  it('vend des articles fictifs et met à jour le stock, la caisse et l’historique', () => {
    const m = creerMoteur(stockageMemoire())
    const p = m.executer('GET', '/api/ventes-detail/preparation') as { articles: Fiche[] }
    const article = p.articles.find(a => a.code === 'BOU1')!
    const c = { lignes: [{ article_id: article.id, quantite: 2 }], mode: 'especes' }
    const apercu = m.executer('POST', '/api/ventes-detail/apercu', c) as { apercu: { totaux: { montant_ttc_millimes: number } } }
    expect(apercu.apercu.totaux.montant_ttc_millimes).toBe(5708)
    const r = m.executer('POST', '/api/ventes-detail', { ...c, montant_ttc_attendu_millimes: 5708 }) as { vente: Fiche }
    expect(r.vente.montant_ttc_millimes).toBe(5708)
    expect((m.executer('GET', '/api/ventes-detail/preparation') as typeof p).articles.find(a => a.id === article.id)?.stock).toBe(Number(article.stock) - 2)
    expect((m.executer('GET', '/api/ventes-detail') as { ventes: Fiche[] }).ventes[0].id).toBe(r.vente.id)
  })
  it('renvoie le détail attendu par la confirmation d’analyse', () => {
    const m = creerMoteur(stockageMemoire())
    const lot = (m.executer('GET', '/api/laboratoire/file') as Fiche[]).find(l => l.etape === 'a_analyser')!
    const e = lot.echantillon as { id: number; reference: string }
    const r = m.executer('POST', '/api/analyses', { echantillon_id: e.id, acidite_centiemes: 45, taux_huile_centiemes: 1850, rendement_prevu_centiemes: 1620, humidite_centiemes: 5200 }) as { analyse: { echantillon: { reference: string }; reception: { analyse_prete: boolean } } }
    expect(r.analyse.echantillon?.reference).toBe(e.reference)
    expect(r.analyse.reception.analyse_prete).toBe(true)
  })
  it('modifie un article sans perdre le catalogue existant', () => {
    const m = creerMoteur(stockageMemoire())
    const avant = m.executer('GET', '/api/articles') as { articles: Fiche[] }
    const id = avant.articles[0].id
    m.executer('POST', `/api/articles/${id}/modification`, { libelle: 'Article modifié en démo' })
    const apres = m.executer('GET', '/api/articles') as typeof avant
    expect(apres.articles.length).toBe(avant.articles.length)
    expect(apres.articles.find(a => a.id === id)?.libelle).toBe('Article modifié en démo')
  })
  it('rend un nouveau bac utilisable depuis la réception', () => {
    const m = creerMoteur(stockageMemoire())
    const r = m.executer('POST', '/api/bacs', { numero: 41, libelle: 'Bac visiteur' }) as { bac: Fiche }
    expect((m.executer('GET', '/api/bacs-reception/grille') as Fiche[]).find(b => b.numero === 41)?.etat).toBe('libre')
    const a = (m.executer('GET', '/api/apporteurs') as Fiche[])[0]
    m.executer('POST', '/api/receptions/pesee-directe', { apporteur_id: a.id, regime: 'achat', poids_kg: 100, bacs: [r.bac.id] })
    expect((m.executer('GET', '/api/bacs-reception/grille') as Fiche[]).find(b => b.numero === 41)?.etat).toBe('occupe')
  })
  it('retrouve un apporteur sans accent et conserve son identité dans les doublons', () => {
    const m = creerMoteur(stockageMemoire())
    const trouves = m.executer('GET', '/api/apporteurs?q=Hedi') as Fiche[]
    expect(trouves.some(a => a.nom === 'Hédi Ben Salah')).toBe(true)
    const a = trouves[0]
    const doublons = m.executer('GET', `/api/apporteurs/doublons?cin=${a.cin}`) as Fiche[]
    expect(doublons[0].id).toBe(a.id)
    expect(doublons[0].raisons).toContain('cin')
  })
  it('affiche la fiche du lot demandé, y compris après une nouvelle réception', () => {
    const m = creerMoteur(stockageMemoire())
    const recherche = m.executer('GET', '/api/documents/fiche-lot/recherche?texte=12') as { resultats: { numero: number }[] }
    expect(recherche.resultats.map(x => x.numero)).toEqual([12])
    const doc = m.executer('GET', '/api/documents/fiche-lot?numero=12') as { titre: string }
    expect(doc.titre).toContain('12')
  })
})
