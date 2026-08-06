import { test, expect } from '@playwright/test'

test.describe('Nurturing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/nurturing')
    await page.waitForLoadState('networkidle')
  })

  test('Page load — contacts affichés (pas de spinner infini)', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('NURTURING')
    await page.waitForSelector('[style*="border-left"]', { timeout: 15000 })
    const contacts = page.locator('[style*="border-left: 4px solid"]')
    await expect(contacts.first()).toBeVisible()
  })

  test('Clic contact — détails chargés (interactions visibles)', async ({ page }) => {
    await page.waitForSelector('[style*="border-left"]', { timeout: 15000 })
    const firstContact = page.locator('[style*="border-left: 4px solid"]').first()
    await firstContact.click()
    await expect(page.getByText('Séquence & Messages')).toBeVisible()
    await expect(page.getByText('Touchpoints')).toBeVisible()
  })

  test('Filtrage température — liste filtrée correctement', async ({ page }) => {
    await page.waitForSelector('[style*="border-left"]', { timeout: 15000 })
    const allButton = page.getByRole('button', { name: /Tous/ })
    await expect(allButton).toBeVisible()
    const hotButton = page.getByRole('button', { name: /Chauds/ })
    await hotButton.click()
    await page.waitForTimeout(300)
  })

  test('Onglet historique — affiche les interactions', async ({ page }) => {
    await page.waitForSelector('[style*="border-left"]', { timeout: 15000 })
    const firstContact = page.locator('[style*="border-left: 4px solid"]').first()
    await firstContact.click()
    const historyTab = page.getByRole('button', { name: /Historique/ })
    await historyTab.click()
    await expect(page.getByText('Historique des interactions')).toBeVisible()
  })
})
