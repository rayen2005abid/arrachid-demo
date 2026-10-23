// Logique pure de la reprise de la fiche papier de vente VEN (T6.9). Le prix et le montant tapés
// ne servent qu'à vérifier : le serveur reprend le prix du catalogue et recalcule le total.
import { entierPositif, uniteExacte } from '../format/saisie'
import type { EnTeteFiche } from './logiqueProduction'
import { corpsReferencesPapier } from '../caisse/references'

export const CHEMIN_VEN = '/api/saisie-differee/ventes'

export type ModePapier = 'especes' | 'cheque' | 'virement'
export type Echantillon = '' | 'present' | 'absent'

export interface ArticlePapier { id: number; libelle: string; type_article: 'huile' | 'contenant' | 'service' }
export interface LignePapier { articleId: string; quantite: string; prix: string }

export interface SaisieVen extends EnTeteFiche {
  clientId: string
  // Partie « Chargement citerne » : vide si la fiche n'en porte pas.
  contratId: string
  cuveChargement: string
  vide: string
  heureVide: string
  plein: string
  heurePlein: string
  prixChargement: string
  echantillon: Echantillon
  // Partie « Vente au détail ».
  cuveDetail: string
  lignes: LignePapier[]
  montant: string
  mode: ModePapier
  /** Numéro du chèque (ou référence du virement) et banque, s'ils sont notés sur la fiche (T-203). */
  referencePaiement: string
  banquePaiement: string
  heurePaiement: string
}

type Resultat = { corps: Record<string, unknown> | null; erreur: string | null }
const refuse = (erreur: string): Resultat => ({ corps: null, erreur })

export const ligneVide = (): LignePapier => ({ articleId: '', quantite: '', prix: '' })

export function saisieVenVide(): SaisieVen {
  return {
    numeroPapier: '', heure: '', observations: '', operateur: '', clientId: '',
    contratId: '', cuveChargement: '', vide: '', heureVide: '', plein: '', heurePlein: '', prixChargement: '', echantillon: '',
    cuveDetail: '', lignes: [ligneVide()], montant: '', mode: 'especes', referencePaiement: '', banquePaiement: '', heurePaiement: '',
  }
}

function chargement(s: SaisieVen): Record<string, unknown> | null | string {
  const rempli = [s.contratId, s.cuveChargement, s.vide, s.plein].some((v) => v.trim() !== '')
  if (!rempli) return null
  const contrat = entierPositif(s.contratId)
  const cuve = entierPositif(s.cuveChargement)
  const vide = entierPositif(s.vide)
  const plein = entierPositif(s.plein)
  if (contrat === null || cuve === null) return 'Chargement : choisissez le contrat et la cuve.'
  if (vide === null || plein === null || plein <= vide) return 'Chargement : poids vide et plein en kg entiers, le plein au-dessus du vide.'
  let prix: number | null = null
  if (s.prixChargement.trim()) {
    prix = uniteExacte(s.prixChargement, 3)
    if (prix === null) return 'Chargement : prix illisible, en DT par kg (par exemple 12,500).'
  }
  return {
    contrat_id: contrat, cuve_id: cuve, poids_vide_kg: vide, poids_plein_kg: plein,
    heure_vide: s.heureVide || null, heure_plein: s.heurePlein || null,
    prix_unitaire_millimes_kg: prix, acheteur_present: s.echantillon === '' ? null : s.echantillon === 'present',
  }
}

function detail(s: SaisieVen, articles: readonly ArticlePapier[]): Record<string, unknown> | null | string {
  const remplies = s.lignes.filter((l) => l.articleId || l.quantite.trim() || l.prix.trim())
  if (remplies.length === 0 && !s.montant.trim()) return null
  const lignes = []
  for (const [rang, ligne] of remplies.entries()) {
    const article = articles.find((a) => String(a.id) === ligne.articleId)
    const quantite = article ? uniteExacte(ligne.quantite, article.type_article === 'huile' ? 3 : 0) : null
    const prix = uniteExacte(ligne.prix, 3)
    if (!article || quantite === null || quantite === 0 || prix === null) {
      return `Ligne ${rang + 1} : article, quantité (kg pour l’huile, pièces sinon) et prix en DT.`
    }
    lignes.push({ article_id: article.id, quantite, prix_unitaire_millimes: prix })
  }
  if (lignes.length === 0) return 'Vente au détail : recopiez au moins une ligne d’article.'
  const huile = lignes.some((l) => articles.find((a) => a.id === l.article_id)?.type_article === 'huile')
  const cuve = entierPositif(s.cuveDetail)
  if (huile && cuve === null) return 'Vente au détail : choisissez la cuve de l’huile.'
  const montant = uniteExacte(s.montant, 3)
  if (montant === null || montant === 0) return 'Vente au détail : montant reçu illisible, en DT avec 3 décimales.'
  return {
    cuve_id: huile ? cuve : null, lignes,
    paiement: {
      montant_millimes: montant, mode: s.mode, horodatage: s.heurePaiement || null,
      ...corpsReferencesPapier(s.mode, { reference: s.referencePaiement, banque: s.banquePaiement }),
    },
  }
}

/** Corps de la commande : un client existant, un chargement, une vente au détail, ou les deux. */
export function construireCorpsVen(s: SaisieVen, articles: readonly ArticlePapier[]): Resultat {
  if (!s.numeroPapier.trim() || !s.heure) return refuse('Indiquez le numéro de la fiche et son heure.')
  const partieChargement = chargement(s)
  if (typeof partieChargement === 'string') return refuse(partieChargement)
  const partieDetail = detail(s, articles)
  if (typeof partieDetail === 'string') return refuse(partieDetail)
  if (partieChargement === null && partieDetail === null) return refuse('Cette fiche ne contient rien à enregistrer : recopiez-en une partie.')
  const client = entierPositif(s.clientId)
  if (partieChargement !== null && client === null) return refuse('Un chargement exige le client du contrat.')
  return {
    corps: {
      numero_papier: s.numeroPapier.trim().toUpperCase(), horodatage_metier: s.heure,
      observations: s.observations.trim() || null, operateur_id: entierPositif(s.operateur),
      client_id: client, chargement: partieChargement, detail: partieDetail,
    },
    erreur: null,
  }
}
