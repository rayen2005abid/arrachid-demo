import { test, expect } from '@playwright/test'
import { entreesVisibles } from '../src/navigation'
import { readFileSync } from 'node:fs'
import type { Role, TypePoste } from '../src/types'

test('les écrans propriétaire s’ouvrent sans connexion ni requête métier réseau', async ({ page }) => {
  test.setTimeout(90_000) // Toutes les routes du propriétaire sont visitées dans ce scénario.
  const erreurs: string[] = [], reseau: string[] = []
  page.on('pageerror', e => erreurs.push(e.message))
  page.on('request', r => { if (new URL(r.url()).pathname.startsWith('/api/')) reseau.push(r.url()) })
  const s = JSON.parse(readFileSync(new URL('../src/demo/donnees.json', import.meta.url), 'utf8'))['/api/session']
  const routes = entreesVisibles(s.permissions, s.utilisateur.role as Role, s.poste.type_poste as TypePoste)
  for (const entree of routes) {
    await page.goto(entree.chemin)
    await expect(page.locator('#contenu')).toBeVisible()
    await expect(page.getByText('Propriétaire Démo', { exact: true }).first()).toBeVisible()
    await page.waitForTimeout(100)
    expect(erreurs, entree.chemin).toEqual([])
    await expect(page.getByText('Cette opération n’est pas simulée', { exact: false }), entree.chemin).toHaveCount(0)
  }
  expect(reseau).toEqual([])
})

test('un apporteur créé persiste et la réinitialisation restaure les exemples', async ({ page }) => {
  await page.goto('/apporteurs')
  await page.getByRole('button', { name: /Nouvel apporteur/ }).first().click()
  const dialogue = page.getByRole('dialog')
  await dialogue.locator('#nom').fill('Visiteur de la démonstration')
  await dialogue.locator('#cin').fill('00123456')
  await dialogue.locator('#telephone').fill('20123456')
  await dialogue.getByRole('button', { name: /Enregistrer|Créer/ }).last().click()
  await expect(dialogue).toHaveCount(0)
  await expect(page.getByText('Visiteur de la démonstration', { exact: true }).first()).toBeVisible()
  await page.reload()
  await page.locator('#recherche').fill('Visiteur de la démonstration')
  await expect(page.getByText('Visiteur de la démonstration', { exact: true }).first()).toBeVisible()
  page.once('dialog', d => d.accept())
  await page.getByRole('button', { name: 'Réinitialiser la démo', exact: true }).click()
  await expect(page).toHaveURL(/tableau-de-bord/)
  await page.goto('/apporteurs')
  await page.locator('#recherche').fill('Visiteur de la démonstration')
  await expect(page.getByText('Visiteur de la démonstration', { exact: true })).toHaveCount(0)
})

test('le guide et le tableau de bord se consultent sur un téléphone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page).toHaveURL(/tableau-de-bord/)
  await page.getByRole('button', { name: 'Guide démo' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Commencer la visite' }).click()
  await expect(page.locator('#contenu')).toBeVisible()
})

test('le propriétaire enregistre une analyse et un apport de fonds sans PIN', async ({ page }) => {
  const erreurs: string[] = []
  page.on('pageerror', e => erreurs.push(e.message))
  await page.goto('/laboratoire/analyses')
  await page.getByLabel('Acidité (%)').fill('0,45')
  await page.getByLabel('Teneur en huile (%)').fill('18,5')
  await page.getByLabel('Rendement prévu (%)').fill('16,2')
  await page.getByLabel('Humidité (%)').fill('52')
  await page.keyboard.press('F8')
  await expect(page.getByText(/Analyse enregistrée/).first()).toBeVisible()
  expect(erreurs).toEqual([])
  await page.goto('/bureau/caisse')
  await page.getByRole('button', { name: 'Apport de fonds', exact: true }).click()
  await page.getByLabel('Montant (DT)', { exact: true }).fill('100')
  await page.getByRole('button', { name: 'Retrait à la banque', exact: true }).click()
  await page.getByRole('button', { name: 'Continuer', exact: true }).click()
  await page.getByRole('button', { name: 'Enregistrer l’apport', exact: true }).click()
  await expect(page.getByText('Apport de 100,000 DT enregistré.')).toBeVisible()
  expect(erreurs).toEqual([])
})

test('les paramètres se modifient et une vente de détail peut être essayée', async ({ page }) => {
  await page.goto('/administration/parametres')
  await page.getByRole('cell', { name: 'Pas de la bascule (kg)', exact: true }).click()
  await page.getByRole('button', { name: 'Nouvelle valeur', exact: true }).click()
  const tiroir = page.getByRole('dialog')
  await tiroir.locator('[id^="valeur-"]').fill('10')
  await tiroir.locator('[id^="motif-"]').fill('Essai de la démo')
  await tiroir.getByRole('button', { name: /Enregistrer/ }).click()
  await expect(tiroir).toHaveCount(0)
  await page.goto('/bureau/ventes-detail')
  await page.getByLabel(/Bouteille verre 1 L/).fill('2')
  await expect(page.getByText(/5,708/).first()).toBeVisible()
  await page.getByRole('button', { name: /Encaisser/ }).click()
  await expect(page.getByText(/Vente.*encaissée|Vente.*enregistrée/).first()).toBeVisible()
})

test('une pesée directe crée un ticket fictif puis un lot à analyser', async ({ page }) => {
  const erreurs: string[] = []
  page.on('pageerror', e => erreurs.push(e.message))
  await page.goto('/receptions')
  await page.getByRole('button', { name: /Pesée directe/ }).first().click()
  await page.getByLabel('Apporteur', { exact: true }).fill('Hédi')
  await page.getByRole('option', { name: /Hédi Ben Salah/ }).click()
  await page.getByRole('radio', { name: /Achat/ }).click()
  await page.getByRole('button', { name: /Sélectionner.*Bac/ }).first().click()
  await page.getByLabel('Poids sur la balance (kg)', { exact: true }).fill('150')
  await page.getByRole('button', { name: 'Enregistrer et imprimer le ticket', exact: true }).click()
  await expect(page.getByText('Ticket émis', { exact: true })).toBeVisible()
  await expect(page.getByText(/Réception n° 101/).first()).toBeVisible()
  expect(erreurs).toEqual([])
  await page.goto('/laboratoire/analyses')
  await expect(page.getByRole('cell', { name: '101', exact: true }).first()).toBeVisible()
  expect(erreurs).toEqual([])
})
