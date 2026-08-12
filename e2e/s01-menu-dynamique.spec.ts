import { test, expect } from '@playwright/test'

/**
 * Tests Story s01-menu-dynamique
 *
 * User flow complet: Settings → Toggle section OFF → Disparition menu → Toggle ON → Réapparition
 *
 * Prérequis:
 * - Serveur dev sur port 3000
 * - User test authentifié
 */

test.describe('s01-menu-dynamique - Menu sections visibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')

    const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com'
    const TEST_PASSWORD = process.env.TEST_PASSWORD || 'password123'

    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/dashboard/, { timeout: 10000 })
  })

  test('Task 7: Toggle section OFF → disparaît du menu → Toggle ON → réapparaît', async ({ page }) => {
    // 1. Naviguer vers Settings
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    // 2. Cliquer sur l'onglet "📂 Menu"
    const menuTab = page.locator('text=📂 Menu')
    await expect(menuTab).toBeVisible()
    await menuTab.click()

    // 3. Vérifier que 5 toggles sont présents
    const toggles = page.locator('[role="switch"]')
    await expect(toggles).toHaveCount(5)

    // 4. Identifier le toggle "Clients" et vérifier qu'il est ON
    const clientsRow = page.locator('text=Clients').locator('..').locator('..')
    const clientsToggle = clientsRow.locator('[role="switch"]')

    // Vérifier état initial ON
    const initialState = await clientsToggle.getAttribute('aria-checked')
    expect(initialState).toBe('true')

    // 5. Toggle OFF la section "Clients"
    await clientsToggle.click()

    // Attendre que le toggle change d'état
    await expect(clientsToggle).toHaveAttribute('aria-checked', 'false')

    // Attendre la requête PATCH (debounced save)
    await page.waitForResponse(response =>
      response.url().includes('/api/settings') && response.request().method() === 'PATCH',
      { timeout: 5000 }
    )

    // 6. Naviguer vers Dashboard et vérifier que "Clients" est absent
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Vérifier que la section "Clients" n'apparaît pas dans le menu latéral
    const clientsSection = page.locator('nav').locator('text=Clients').first()
    await expect(clientsSection).not.toBeVisible()

    // Vérifier que les autres sections sont toujours visibles
    await expect(page.locator('nav').locator('text=Principal').first()).toBeVisible()
    await expect(page.locator('nav').locator('text=Acquisition').first()).toBeVisible()

    // 7. Retourner dans Settings et toggle ON "Clients"
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    await page.locator('text=📂 Menu').click()

    const clientsRowAgain = page.locator('text=Clients').locator('..').locator('..')
    const clientsToggleAgain = clientsRowAgain.locator('[role="switch"]')

    // Vérifier que le toggle est OFF
    await expect(clientsToggleAgain).toHaveAttribute('aria-checked', 'false')

    // Toggle ON
    await clientsToggleAgain.click()
    await expect(clientsToggleAgain).toHaveAttribute('aria-checked', 'true')

    // Attendre PATCH
    await page.waitForResponse(response =>
      response.url().includes('/api/settings') && response.request().method() === 'PATCH',
      { timeout: 5000 }
    )

    // 8. Recharger Dashboard et vérifier réapparition de "Clients"
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    const clientsSectionRestored = page.locator('nav').locator('text=Clients').first()
    await expect(clientsSectionRestored).toBeVisible()

    console.log('✅ Test s01-menu-dynamique complet: toggle OFF → disparition → toggle ON → réapparition')
  })

  test('Task 7 Edge case: Toutes les sections peuvent être masquées', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    await page.locator('text=📂 Menu').click()

    // Masquer toutes les 5 sections
    const sections = ['Principal', 'Clients', 'Acquisition', 'Outils', 'Pilotage']

    for (const sectionName of sections) {
      const row = page.locator(`text=${sectionName}`).locator('..').locator('..')
      const toggle = row.locator('[role="switch"]')

      const isChecked = await toggle.getAttribute('aria-checked')
      if (isChecked === 'true') {
        await toggle.click()
        await expect(toggle).toHaveAttribute('aria-checked', 'false')
      }
    }

    // Attendre sauvegarde
    await page.waitForTimeout(1500)

    // Naviguer dashboard
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Vérifier qu'aucune section n'est visible dans le nav
    for (const sectionName of sections) {
      const section = page.locator('nav').locator(`text=${sectionName}`).first()
      await expect(section).not.toBeVisible()
    }

    // Restaurer toutes les sections (cleanup)
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    await page.locator('text=📂 Menu').click()

    for (const sectionName of sections) {
      const row = page.locator(`text=${sectionName}`).locator('..').locator('..')
      const toggle = row.locator('[role="switch"]')

      const isChecked = await toggle.getAttribute('aria-checked')
      if (isChecked === 'false') {
        await toggle.click()
        await expect(toggle).toHaveAttribute('aria-checked', 'true')
      }
    }

    await page.waitForTimeout(1500)

    console.log('✅ Edge case: toutes sections masquées → menu vide')
  })

  test('Task 7 Persistence: Settings persistent après reload', async ({ page }) => {
    // 1. Toggle OFF "Outils"
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    await page.locator('text=📂 Menu').click()

    const outilsRow = page.locator('text=Outils').locator('..').locator('..')
    const outilsToggle = outilsRow.locator('[role="switch"]')

    await outilsToggle.click()
    await expect(outilsToggle).toHaveAttribute('aria-checked', 'false')
    await page.waitForTimeout(1500) // Attendre save async

    // 2. Recharger la page entière (hard reload)
    await page.reload()
    await page.waitForLoadState('networkidle')

    // 3. Retourner dans onglet Menu
    await page.locator('text=📂 Menu').click()

    // 4. Vérifier que "Outils" est toujours OFF
    const outilsRowReload = page.locator('text=Outils').locator('..').locator('..')
    const outilsToggleReload = outilsRowReload.locator('[role="switch"]')
    await expect(outilsToggleReload).toHaveAttribute('aria-checked', 'false')

    // 5. Vérifier dans Dashboard aussi
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    const outilsSection = page.locator('nav').locator('text=Outils').first()
    await expect(outilsSection).not.toBeVisible()

    // Cleanup: restaurer Outils ON
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    await page.locator('text=📂 Menu').click()
    const outilsRowCleanup = page.locator('text=Outils').locator('..').locator('..')
    const outilsToggleCleanup = outilsRowCleanup.locator('[role="switch"]')
    await outilsToggleCleanup.click()
    await expect(outilsToggleCleanup).toHaveAttribute('aria-checked', 'true')
    await page.waitForTimeout(1500)

    console.log('✅ Persistence: settings conservés après reload')
  })
})
