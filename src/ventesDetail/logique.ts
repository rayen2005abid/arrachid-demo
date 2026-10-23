// Ventes au détail : lignes envoyées au serveur, litres indicatifs (affichage) et saisie de l'huile en litres.
import { uniteExacte } from '../format/saisie'

export interface ArticleDetail {
  id: number; code: string; libelle: string; type_article: 'huile' | 'contenant' | 'service'
  qualite_huile: string | null; prix_unitaire_millimes: number; stock: number
}

export interface LigneVente { article_id: number; quantite: number; litres_saisis_ml?: number; cuve_id?: number }

/** Unité tapée pour une huile ; le kg reste l'unité stockée et facturée. */
export type UniteHuile = 'kg' | 'L'

/** Même règle que le serveur (calculs/litres.py) : volume tronqué au millilitre, « environ ». */
export function litresIndicatifs(grammes: number, densiteGL: number): string {
  const millilitres = Math.floor((grammes * 1000) / densiteGL)
  return `${Math.floor(millilitres / 1000)},${String(millilitres % 1000).padStart(3, '0')}`
}

/** Même règle que le serveur (calculs/litres.py) : litres × densité, au gramme près, demi vers le haut. */
export function convertirLitres(texte: string, densiteGL: number): { millilitres: number; grammes: number } | null {
  const millilitres = uniteExacte(texte, 3)
  if (millilitres === null || millilitres <= 0 || densiteGL <= 0) return null
  const grammes = Math.floor((millilitres * densiteGL + 500) / 1000)
  return grammes > 0 ? { millilitres, grammes } : null
}

/** 9160 → « 9,160 ». */
export function formaterKg(grammes: number): string {
  return `${Math.floor(grammes / 1000)},${String(grammes % 1000).padStart(3, '0')}`
}

/** 10000 → « 10 » ; 10500 → « 10,5 » (comme le reçu). */
export function formaterLitres(millilitres: number): string {
  return `${Math.floor(millilitres / 1000)},${String(millilitres % 1000).padStart(3, '0')}`.replace(/0+$/, '').replace(/,$/, '')
}

/**
 * Huile en kg (grammes envoyés) ou en litres (grammes convertis avec la densité d'affichage, litres tapés joints),
 * contenants et services en pièces. Extra vierge et vierge peuvent être vendues ensemble, chacune de sa cuve.
 */
export function lignesVente(
  articles: readonly ArticleDetail[],
  quantites: Record<number, string>,
  unites: Record<number, UniteHuile> = {},
  densiteGL: number | null = null,
): { lignes?: LigneVente[]; erreur?: string } {
  const lignes: LigneVente[] = []
  for (const article of articles) {
    const brut = (quantites[article.id] ?? '').trim()
    if (!brut) continue
    const invalide = { erreur: `Quantité invalide pour « ${article.libelle} ».` }
    if (article.type_article === 'huile' && unites[article.id] === 'L') {
      if (densiteGL === null || densiteGL <= 0) return { erreur: 'La densité d’affichage manque : saisissez l’huile en kg.' }
      const conversion = convertirLitres(brut, densiteGL)
      if (conversion === null) return invalide
      lignes.push({ article_id: article.id, quantite: conversion.grammes, litres_saisis_ml: conversion.millilitres })
      continue
    }
    const quantite = uniteExacte(brut, article.type_article === 'huile' ? 3 : 0)
    if (quantite === null || quantite <= 0 || (article.type_article === 'contenant' && quantite > article.stock)) return invalide
    lignes.push({ article_id: article.id, quantite })
  }
  if (!lignes.length) return { erreur: 'Indiquez la quantité d’au moins un article.' }
  return { lignes }
}

/** Chaque huile sort de sa cuve : la cuve choisie est jointe à sa ligne ; null tant qu'une huile n'en a pas. */
export function joindreCuves(articles: readonly ArticleDetail[], lignes: readonly LigneVente[], cuves: Record<number, string>): LigneVente[] | null {
  const resultat: LigneVente[] = []
  for (const ligne of lignes) {
    if (articles.find((a) => a.id === ligne.article_id)?.type_article !== 'huile') { resultat.push(ligne); continue }
    const cuve = cuves[ligne.article_id] ?? ''
    if (cuve === '') return null
    resultat.push({ ...ligne, cuve_id: Number(cuve) })
  }
  return resultat
}
