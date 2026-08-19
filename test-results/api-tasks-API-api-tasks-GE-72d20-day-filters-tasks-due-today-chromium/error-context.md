# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: api-tasks.spec.ts >> API /api/tasks >> GET /api/tasks?deadline=today filters tasks due today
- Location: e2e\api-tasks.spec.ts:40:7

# Error details

```
TimeoutError: page.waitForURL: Timeout 5000ms exceeded.
=========================== logs ===========================
waiting for navigation to "/today" until "load"
============================================================
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - heading "Ted Scale With Ouss" [level=1] [ref=e6]
      - generic [ref=e7]: TABLEAU DE BORD CGP
    - generic [ref=e8]:
      - generic [ref=e10]: Connexion
      - generic [ref=e11]:
        - generic [ref=e12]:
          - generic [ref=e13]: Email
          - textbox [ref=e14]: test@example.com
        - generic [ref=e15]:
          - generic [ref=e16]: Mot de passe
          - textbox [ref=e17]: testpass
        - generic [ref=e18]: Email ou mot de passe incorrect
        - button "Se connecter →" [ref=e19] [cursor=pointer]
    - generic [ref=e20]: Accès restreint · Ted Scale With Ouss
  - button "Open Next.js Dev Tools" [ref=e26] [cursor=pointer]:
    - img [ref=e27]
  - alert [ref=e30]
```

# Test source

```ts
  1  | /**
  2  |  * Test E2E pour /api/tasks avec filtres
  3  |  * Ce test vérifie que l'API tasks retourne les bonnes données avec les filtres urgency et deadline
  4  |  */
  5  | 
  6  | import { test, expect } from '@playwright/test'
  7  | 
  8  | test.describe('API /api/tasks', () => {
  9  |   test.beforeEach(async ({ page }) => {
  10 |     // Se connecter d'abord
  11 |     await page.goto('/login')
  12 |     // Assuming test credentials exist
  13 |     await page.fill('input[type="email"]', process.env.TEST_EMAIL || 'test@example.com')
  14 |     await page.fill('input[type="password"]', process.env.TEST_PASSWORD || 'testpass')
  15 |     await page.click('button[type="submit"]')
> 16 |     await page.waitForURL('/today', { timeout: 5000 })
     |                ^ TimeoutError: page.waitForURL: Timeout 5000ms exceeded.
  17 |   })
  18 | 
  19 |   test('GET /api/tasks without filters returns all tasks', async ({ page }) => {
  20 |     const response = await page.request.get('/api/tasks')
  21 |     expect(response.ok()).toBeTruthy()
  22 |     const json = await response.json()
  23 |     expect(json).toHaveProperty('success', true)
  24 |     expect(json).toHaveProperty('data')
  25 |     expect(Array.isArray(json.data)).toBeTruthy()
  26 |   })
  27 | 
  28 |   test('GET /api/tasks?urgency=urgent filters urgent tasks', async ({ page }) => {
  29 |     const response = await page.request.get('/api/tasks?urgency=urgent')
  30 |     expect(response.ok()).toBeTruthy()
  31 |     const json = await response.json()
  32 |     expect(json.success).toBe(true)
  33 |     expect(Array.isArray(json.data)).toBeTruthy()
  34 |     // Vérifier que toutes les tasks retournées sont urgentes
  35 |     json.data.forEach((task: any) => {
  36 |       expect(task.urgency).toBe('urgent')
  37 |     })
  38 |   })
  39 | 
  40 |   test('GET /api/tasks?deadline=today filters tasks due today', async ({ page }) => {
  41 |     const today = new Date().toISOString().split('T')[0]
  42 |     const response = await page.request.get('/api/tasks?deadline=today')
  43 |     expect(response.ok()).toBeTruthy()
  44 |     const json = await response.json()
  45 |     expect(json.success).toBe(true)
  46 |     expect(Array.isArray(json.data)).toBeTruthy()
  47 |     // Vérifier que toutes les tasks retournées ont deadline aujourd'hui
  48 |     json.data.forEach((task: any) => {
  49 |       expect(task.deadline).toBe(today)
  50 |     })
  51 |   })
  52 | 
  53 |   test('GET /api/tasks?urgency=urgent&deadline=today combines filters', async ({ page }) => {
  54 |     const today = new Date().toISOString().split('T')[0]
  55 |     const response = await page.request.get('/api/tasks?urgency=urgent&deadline=today')
  56 |     expect(response.ok()).toBeTruthy()
  57 |     const json = await response.json()
  58 |     expect(json.success).toBe(true)
  59 |     expect(Array.isArray(json.data)).toBeTruthy()
  60 |     // Vérifier que toutes les tasks retournées sont urgentes ET due aujourd'hui
  61 |     json.data.forEach((task: any) => {
  62 |       expect(task.urgency).toBe('urgent')
  63 |       expect(task.deadline).toBe(today)
  64 |     })
  65 |   })
  66 | })
  67 | 
```