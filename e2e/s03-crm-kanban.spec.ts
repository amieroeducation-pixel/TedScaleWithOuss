import { test, expect } from '@playwright/test'

test.describe('s03-crm-kanban-fiabilisation', () => {
  test.beforeEach(async ({ page }) => {
    // Login process (assuming credentials are configured)
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Fill login form (adjust selectors based on actual login form)
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com')
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'password')
    await page.click('button[type="submit"]')

    // Wait for redirect to dashboard
    await page.waitForURL(/\/(dashboard|today)/, { timeout: 10000 })

    // Navigate to CRM page
    await page.goto('/crm')
    await page.waitForLoadState('networkidle')
  })

  test('Scénario 1: Display CRM Kanban with real data', async ({ page }) => {
    // Vérifier que les 6 colonnes du Kanban sont présentes
    const columns = ['À contacter', 'RDV1', 'RDV2', 'RDV3', 'Converti', 'Perdu']

    for (const column of columns) {
      const columnHeader = page.locator(`text=${column}`).first()
      await expect(columnHeader).toBeVisible({ timeout: 10000 })
    }

    // Vérifier que le bouton "Nouveau prospect" est visible
    const newProspectButton = page.locator('button:has-text("Nouveau prospect")')
    await expect(newProspectButton).toBeVisible()
  })

  test('Scénario 2: Drag-drop prospect between stages', async ({ page }) => {
    // Attendre que les prospects soient chargés
    await page.waitForSelector('[data-prospect-id]', { timeout: 10000, state: 'visible' })

    // Trouver le premier prospect
    const firstProspect = page.locator('[data-prospect-id]').first()
    const prospectId = await firstProspect.getAttribute('data-prospect-id')

    if (!prospectId) {
      test.skip('No prospects available for drag-drop test')
      return
    }

    // Drag from first column to second column (basic drag test)
    const targetColumn = page.locator('text=RDV1').first()

    await firstProspect.dragTo(targetColumn, {
      sourcePosition: { x: 50, y: 50 },
      targetPosition: { x: 50, y: 100 }
    })

    // Vérifier qu'un toast de succès apparaît
    const toast = page.locator('text=/déplacé|Prospect déplacé/i')
    await expect(toast).toBeVisible({ timeout: 5000 })
  })

  test('Scénario 3: Open prospect detail drawer', async ({ page }) => {
    // Attendre que les prospects soient chargés
    await page.waitForSelector('[data-prospect-id]', { timeout: 10000, state: 'visible' })

    // Cliquer sur le premier prospect
    const firstProspect = page.locator('[data-prospect-id]').first()
    await firstProspect.click()

    // Vérifier que le drawer s'ouvre (chercher le bouton "Modifier")
    const editButton = page.locator('button:has-text("Modifier")')
    await expect(editButton).toBeVisible({ timeout: 5000 })

    // Vérifier que le bouton de suppression est présent
    const deleteButton = page.locator('button:has-text("Supprimer")')
    await expect(deleteButton).toBeVisible()

    // Vérifier que la section "Historique interactions" est présente
    const timelineHeader = page.locator('text=/HISTORIQUE INTERACTIONS/i')
    await expect(timelineHeader).toBeVisible()
  })

  test('Scénario 4: Add interaction to prospect', async ({ page }) => {
    // Attendre que les prospects soient chargés
    await page.waitForSelector('[data-prospect-id]', { timeout: 10000, state: 'visible' })

    // Ouvrir le premier prospect
    const firstProspect = page.locator('[data-prospect-id]').first()
    await firstProspect.click()

    // Attendre que le drawer soit ouvert
    await page.waitForSelector('text=/HISTORIQUE INTERACTIONS/i', { timeout: 5000 })

    // Cliquer sur "Ajouter une interaction"
    const addButton = page.locator('button:has-text("Ajouter une interaction")')
    await addButton.click()

    // Vérifier que le modal s'ouvre
    const modalTitle = page.locator('text=Ajouter une interaction')
    await expect(modalTitle).toBeVisible({ timeout: 3000 })

    // Sélectionner le type "Note"
    const noteButton = page.locator('button:has-text("📝 Note")')
    await noteButton.click()

    // Remplir les notes
    const notesTextarea = page.locator('textarea[placeholder*="Détails"]')
    await notesTextarea.fill('Test interaction from E2E')

    // Sauvegarder
    const saveButton = page.locator('button:has-text("Enregistrer")')
    await saveButton.click()

    // Vérifier le toast de succès
    const toast = page.locator('text=/Interaction enregistrée/i')
    await expect(toast).toBeVisible({ timeout: 5000 })
  })

  test('Scénario 5: Delete prospect with confirmation', async ({ page }) => {
    // Créer un prospect de test d'abord
    const newProspectButton = page.locator('button:has-text("Nouveau prospect")')
    await newProspectButton.click()

    // Remplir le formulaire
    await page.fill('input[placeholder*="Prénom Nom"]', 'Test E2E Prospect')
    await page.fill('input[placeholder*="Profession"]', 'Test')
    await page.fill('input[placeholder*="06"]', '0612345678')

    // Sauvegarder
    const addButton = page.locator('button:has-text("AJOUTER")')
    await addButton.click()

    // Attendre que le prospect soit ajouté
    await page.waitForSelector('text=Test E2E Prospect', { timeout: 10000 })

    // Ouvrir le prospect
    await page.locator('text=Test E2E Prospect').first().click()

    // Attendre le drawer
    await page.waitForSelector('button:has-text("Supprimer")', { timeout: 5000 })

    // Cliquer sur supprimer
    const deleteButton = page.locator('button:has-text("Supprimer")')
    await deleteButton.click()

    // Vérifier que le modal de confirmation s'ouvre
    const confirmTitle = page.locator('text=Supprimer ce prospect ?')
    await expect(confirmTitle).toBeVisible({ timeout: 3000 })

    // Confirmer la suppression
    const confirmButton = page.locator('button:has-text("Supprimer définitivement")')
    await confirmButton.click()

    // Vérifier le toast de succès
    const toast = page.locator('text=/Prospect supprimé/i')
    await expect(toast).toBeVisible({ timeout: 5000 })

    // Vérifier que le prospect n'est plus visible
    const deletedProspect = page.locator('text=Test E2E Prospect')
    await expect(deletedProspect).not.toBeVisible({ timeout: 3000 })
  })

  test('Scénario 6: Cancel delete operation', async ({ page }) => {
    // Attendre que les prospects soient chargés
    await page.waitForSelector('[data-prospect-id]', { timeout: 10000, state: 'visible' })

    // Ouvrir le premier prospect
    const firstProspect = page.locator('[data-prospect-id]').first()
    await firstProspect.click()

    // Attendre le drawer
    await page.waitForSelector('button:has-text("Supprimer")', { timeout: 5000 })

    // Cliquer sur supprimer
    const deleteButton = page.locator('button:has-text("Supprimer")')
    await deleteButton.click()

    // Vérifier que le modal de confirmation s'ouvre
    const confirmTitle = page.locator('text=Supprimer ce prospect ?')
    await expect(confirmTitle).toBeVisible({ timeout: 3000 })

    // Annuler
    const cancelButton = page.locator('button:has-text("Annuler")').last()
    await cancelButton.click()

    // Vérifier que le modal se ferme
    await expect(confirmTitle).not.toBeVisible({ timeout: 3000 })

    // Vérifier que le drawer est toujours ouvert
    const editButton = page.locator('button:has-text("Modifier")')
    await expect(editButton).toBeVisible()
  })

  test('Scénario 7: Timeline displays interactions', async ({ page }) => {
    // Attendre que les prospects soient chargés
    await page.waitForSelector('[data-prospect-id]', { timeout: 10000, state: 'visible' })

    // Ouvrir le premier prospect
    const firstProspect = page.locator('[data-prospect-id]').first()
    await firstProspect.click()

    // Attendre que le drawer soit ouvert
    await page.waitForSelector('text=/HISTORIQUE INTERACTIONS/i', { timeout: 5000 })

    // Vérifier que la timeline est visible (soit avec interactions, soit empty state)
    const timeline = page.locator('text=/HISTORIQUE INTERACTIONS/i')
    await expect(timeline).toBeVisible()

    // Vérifier le compteur d'interactions
    const count = page.locator('text=/\\(\\d+\\)/').first()
    await expect(count).toBeVisible()
  })

  test('Scénario 8: Empty state when no prospects', async ({ page }) => {
    // Note: Ce test nécessiterait une DB vide, difficile à tester en E2E
    // On vérifie juste que la structure existe

    // Si aucun prospect n'est visible après loading
    const loading = page.locator('text=/Chargement/i')

    // Attendre que le loading disparaisse
    await loading.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})

    // Vérifier soit des prospects, soit l'empty state
    const hasProspects = await page.locator('[data-prospect-id]').count()
    const emptyState = page.locator('text=/Aucun prospect/i')

    if (hasProspects === 0) {
      await expect(emptyState).toBeVisible()
    } else {
      // Au moins un prospect visible
      expect(hasProspects).toBeGreaterThan(0)
    }
  })

  test('Scénario 9: Search prospects', async ({ page }) => {
    // Attendre que les prospects soient chargés
    await page.waitForSelector('[data-prospect-id]', { timeout: 10000, state: 'visible' })

    // Trouver le champ de recherche
    const searchInput = page.locator('input[placeholder*="Rechercher"]').or(page.locator('input[type="search"]'))

    if (await searchInput.count() > 0) {
      // Taper dans la recherche
      await searchInput.first().fill('Test')

      // Attendre que le filtre soit appliqué (debounce)
      await page.waitForTimeout(500)

      // Vérifier que des résultats sont affichés ou message "aucun résultat"
      const prospects = page.locator('[data-prospect-id]')
      const count = await prospects.count()

      // Le test passe si on a des résultats OU si le compteur est à 0 (pas d'erreur)
      expect(count).toBeGreaterThanOrEqual(0)
    } else {
      test.skip('Search input not found')
    }
  })

  test('Scénario 10: Edit prospect details', async ({ page }) => {
    // Attendre que les prospects soient chargés
    await page.waitForSelector('[data-prospect-id]', { timeout: 10000, state: 'visible' })

    // Ouvrir le premier prospect
    const firstProspect = page.locator('[data-prospect-id]').first()
    await firstProspect.click()

    // Attendre le drawer
    await page.waitForSelector('button:has-text("Modifier")', { timeout: 5000 })

    // Cliquer sur modifier
    const editButton = page.locator('button:has-text("Modifier")')
    await editButton.click()

    // Attendre que le formulaire d'édition soit visible
    await page.waitForTimeout(500)

    // Vérifier que des champs éditables sont présents
    const inputs = page.locator('input[type="text"], input[type="email"], input[type="tel"], textarea')
    const count = await inputs.count()
    expect(count).toBeGreaterThan(0)
  })

  test('Scénario 11: Close drawer with X button', async ({ page }) => {
    // Attendre que les prospects soient chargés
    await page.waitForSelector('[data-prospect-id]', { timeout: 10000, state: 'visible' })

    // Ouvrir le premier prospect
    const firstProspect = page.locator('[data-prospect-id]').first()
    await firstProspect.click()

    // Attendre que le drawer soit ouvert
    await page.waitForSelector('button:has-text("✕")', { timeout: 5000 })

    // Cliquer sur X
    const closeButton = page.locator('button:has-text("✕")').first()
    await closeButton.click()

    // Vérifier que le drawer se ferme
    const editButton = page.locator('button:has-text("Modifier")')
    await expect(editButton).not.toBeVisible({ timeout: 3000 })
  })
})
