import { test, expect } from '@playwright/test'

/**
 * Tests Phase 0 + Phase 1
 *
 * Prérequis:
 * - Un user Supabase configuré (utilise les credentials dans .env ou hardcodé)
 * - Serveur dev sur port 3000 (configuré dans playwright.config.ts)
 */

test.describe('Phase 0 + Phase 1 Tests', () => {
  // Avant chaque test, se connecter
  test.beforeEach(async ({ page }) => {
    // Aller sur la page de login
    await page.goto('/login')

    // TODO: Remplacer par tes vraies credentials de test
    const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com'
    const TEST_PASSWORD = process.env.TEST_PASSWORD || 'password123'

    // Remplir le formulaire
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)

    // Cliquer sur submit
    await page.click('button[type="submit"]')

    // Attendre redirect vers dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 10000 })
  })

  test('1. GET / - Serveur répond', async ({ page }) => {
    // Le beforeEach vérifie déjà que le serveur répond via login → dashboard
    await page.goto('/')

    // Doit être redirigé vers dashboard si authentifié
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('2. GET /api/settings - menu_sections_visible existe', async ({ page }) => {
    const response = await page.request.get('/api/settings')

    expect(response.ok()).toBeTruthy()

    const data = await response.json()
    expect(data).toHaveProperty('menu_sections_visible')

    console.log('menu_sections_visible:', data.menu_sections_visible)
  })

  test('3. PATCH /api/settings - Sauvegarde menu_sections_visible', async ({ page }) => {
    // D'abord récupérer l'état actuel
    const getResponse = await page.request.get('/api/settings')
    const currentSettings = await getResponse.json()

    // Modifier menu_sections_visible
    const testData = {
      menu_sections_visible: ['dashboard', 'today', 'revenue']
    }

    const patchResponse = await page.request.patch('/api/settings', {
      data: testData,
    })

    expect(patchResponse.ok()).toBeTruthy()

    const updatedSettings = await patchResponse.json()
    expect(updatedSettings).toHaveProperty('menu_sections_visible')
    expect(updatedSettings.menu_sections_visible).toEqual(testData.menu_sections_visible)

    // Restaurer l'état original
    await page.request.patch('/api/settings', {
      data: { menu_sections_visible: currentSettings.menu_sections_visible },
    })

    console.log('✅ Sauvegarde menu_sections_visible OK')
  })

  test('4. GET /api/tasks - Liste des tâches', async ({ page }) => {
    const response = await page.request.get('/api/tasks')

    expect(response.ok()).toBeTruthy()

    const tasks = await response.json()
    expect(Array.isArray(tasks)).toBeTruthy()

    console.log(`✅ ${tasks.length} tâches récupérées`)
  })

  test('5. PATCH /api/tasks/:id - Persistence checkbox done', async ({ page }) => {
    // Récupérer les tâches
    const listResponse = await page.request.get('/api/tasks')
    const tasks = await listResponse.json()

    if (!Array.isArray(tasks) || tasks.length === 0) {
      console.log('⚠️ Aucune tâche disponible pour tester PATCH')
      test.skip()
      return
    }

    const task = tasks[0]
    const originalDone = task.done
    const newDone = !originalDone

    console.log(`Tâche test: ${task.id} - ${task.title}`)
    console.log(`done: ${originalDone} → ${newDone}`)

    // Modifier le statut
    const patchResponse = await page.request.patch(`/api/tasks/${task.id}`, {
      data: { done: newDone },
    })

    expect(patchResponse.ok()).toBeTruthy()

    const updatedTask = await patchResponse.json()
    expect(updatedTask.done).toBe(newDone)

    // Vérifier la persistence en récupérant à nouveau
    const getResponse = await page.request.get(`/api/tasks/${task.id}`)
    const fetchedTask = await getResponse.json()
    expect(fetchedTask.done).toBe(newDone)

    // Restaurer l'état original
    await page.request.patch(`/api/tasks/${task.id}`, {
      data: { done: originalDone },
    })

    console.log('✅ Persistence checkbox OK')
  })
})
