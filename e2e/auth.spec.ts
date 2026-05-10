import { test, expect } from '@playwright/test'

test.describe('Authentication guard', () => {
  test('unauthenticated user is redirected to /login', async ({ page }) => {
    // Clear all cookies/storage to ensure unauthenticated state
    await page.context().clearCookies()

    // Try to access protected dashboard
    await page.goto('/dashboard')

    // Should be redirected to /login
    await expect(page).toHaveURL(/\/login/)

    // Login page should be visible
    await expect(page.locator('text=Connexion')).toBeVisible()
  })

  test('/login page renders correctly', async ({ page }) => {
    await page.goto('/login')

    await expect(page.locator('text=Ted Scale With Ouss')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })
})
