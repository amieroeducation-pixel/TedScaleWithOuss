/**
 * Test E2E pour /api/tasks avec filtres
 * Ce test vérifie que l'API tasks retourne les bonnes données avec les filtres urgency et deadline
 */

import { test, expect } from '@playwright/test'

test.describe('API /api/tasks', () => {
  test.beforeEach(async ({ page }) => {
    // Se connecter d'abord
    await page.goto('/login')
    // Assuming test credentials exist
    await page.fill('input[type="email"]', process.env.TEST_EMAIL || 'test@example.com')
    await page.fill('input[type="password"]', process.env.TEST_PASSWORD || 'testpass')
    await page.click('button[type="submit"]')
    await page.waitForURL('/today', { timeout: 5000 })
  })

  test('GET /api/tasks without filters returns all tasks', async ({ page }) => {
    const response = await page.request.get('/api/tasks')
    expect(response.ok()).toBeTruthy()
    const json = await response.json()
    expect(json).toHaveProperty('success', true)
    expect(json).toHaveProperty('data')
    expect(Array.isArray(json.data)).toBeTruthy()
  })

  test('GET /api/tasks?urgency=urgent filters urgent tasks', async ({ page }) => {
    const response = await page.request.get('/api/tasks?urgency=urgent')
    expect(response.ok()).toBeTruthy()
    const json = await response.json()
    expect(json.success).toBe(true)
    expect(Array.isArray(json.data)).toBeTruthy()
    // Vérifier que toutes les tasks retournées sont urgentes
    json.data.forEach((task: any) => {
      expect(task.urgency).toBe('urgent')
    })
  })

  test('GET /api/tasks?deadline=today filters tasks due today', async ({ page }) => {
    const today = new Date().toISOString().split('T')[0]
    const response = await page.request.get('/api/tasks?deadline=today')
    expect(response.ok()).toBeTruthy()
    const json = await response.json()
    expect(json.success).toBe(true)
    expect(Array.isArray(json.data)).toBeTruthy()
    // Vérifier que toutes les tasks retournées ont deadline aujourd'hui
    json.data.forEach((task: any) => {
      expect(task.deadline).toBe(today)
    })
  })

  test('GET /api/tasks?urgency=urgent&deadline=today combines filters', async ({ page }) => {
    const today = new Date().toISOString().split('T')[0]
    const response = await page.request.get('/api/tasks?urgency=urgent&deadline=today')
    expect(response.ok()).toBeTruthy()
    const json = await response.json()
    expect(json.success).toBe(true)
    expect(Array.isArray(json.data)).toBeTruthy()
    // Vérifier que toutes les tasks retournées sont urgentes ET due aujourd'hui
    json.data.forEach((task: any) => {
      expect(task.urgency).toBe('urgent')
      expect(task.deadline).toBe(today)
    })
  })
})
