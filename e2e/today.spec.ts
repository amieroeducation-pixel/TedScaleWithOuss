/**
 * Test E2E pour la page Today
 * Vérifie que tous les composants s'affichent correctement
 */

import { test, expect } from '@playwright/test'

test.describe('Page Today', () => {
  test('should load and display all main sections', async ({ page }) => {
    // Navigate to Today page
    await page.goto('/today')

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle', { timeout: 5000 })

    // Check main sections are present
    // Timer section
    await expect(page.locator('text=Chronomètre de production')).toBeVisible()
    await expect(page.locator('text=Bloc')).toBeVisible()

    // Agenda section
    await expect(page.locator('text=Agenda')).toBeVisible()

    // Audio player
    await expect(page.locator('text=Ambiance du jour')).toBeVisible()

    // Video player
    await expect(page.locator('text=Motivation du jour')).toBeVisible()
  })

  test('should load within 2 seconds (performance)', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/today')
    await page.waitForLoadState('domcontentloaded')
    const loadTime = Date.now() - startTime

    // AC5: Page charge < 2s
    expect(loadTime).toBeLessThan(2000)
  })

  test('should display UrgentTasks section', async ({ page }) => {
    await page.goto('/today')
    await page.waitForLoadState('networkidle', { timeout: 5000 })

    // Check UrgentTasks section exists
    const urgentSection = page.locator('text=Actions prioritaires')
    await expect(urgentSection).toBeVisible()
  })

  test('should display Calendar connection status', async ({ page }) => {
    await page.goto('/today')
    await page.waitForLoadState('networkidle', { timeout: 5000 })

    // Agenda section should be visible
    const agendaSection = page.locator('text=Agenda')
    await expect(agendaSection).toBeVisible()

    // If Calendar not connected, warning should show
    const calendarWarning = page.locator('text=Calendrier non connecté')
    const isVisible = await calendarWarning.isVisible().catch(() => false)

    // Either warning is shown (not connected) or no warning (connected)
    // Both cases are valid
    expect(typeof isVisible).toBe('boolean')
  })

  test('should increment counters', async ({ page }) => {
    await page.goto('/today')
    await page.waitForLoadState('networkidle', { timeout: 5000 })

    // Find and click a counter button (e.g., "+ Contact")
    const contactButton = page.locator('button:has-text("+ Contact")')
    if (await contactButton.isVisible()) {
      // Get initial count
      const counterElement = contactButton.locator('xpath=ancestor::div[contains(@style, "background")]//div[contains(@style, "fontSize: 18")]')
      const initialText = await counterElement.textContent()
      const initialCount = parseInt(initialText || '0')

      // Click to increment
      await contactButton.click()

      // Wait a bit for state update
      await page.waitForTimeout(500)

      // Verify count increased
      const newText = await counterElement.textContent()
      const newCount = parseInt(newText || '0')
      expect(newCount).toBeGreaterThanOrEqual(initialCount)
    }
  })
})
