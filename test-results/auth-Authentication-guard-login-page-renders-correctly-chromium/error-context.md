# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Authentication guard >> /login page renders correctly
- Location: e2e\auth.spec.ts:18:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Ted Scale With Ouss')
Expected: visible
Error: strict mode violation: locator('text=Ted Scale With Ouss') resolved to 2 elements:
    1) <h1>Ted Scale With Ouss</h1> aka getByRole('heading', { name: 'Ted Scale With Ouss' })
    2) <div>Accès restreint · Ted Scale With Ouss</div> aka getByText('Accès restreint · Ted Scale')

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Ted Scale With Ouss')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - heading "Ted Scale With Ouss" [level=1] [ref=e6]
    - generic [ref=e7]: TABLEAU DE BORD CGP
  - generic [ref=e8]:
    - generic [ref=e10]: Connexion
    - generic [ref=e11]:
      - generic [ref=e12]:
        - generic [ref=e13]: Email
        - textbox [ref=e14]
      - generic [ref=e15]:
        - generic [ref=e16]: Mot de passe
        - textbox [ref=e17]
      - button "Se connecter →" [ref=e18] [cursor=pointer]
  - generic [ref=e19]: Accès restreint · Ted Scale With Ouss
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test'
  2  | 
  3  | test.describe('Authentication guard', () => {
  4  |   test('unauthenticated user is redirected to /login', async ({ page }) => {
  5  |     // Clear all cookies/storage to ensure unauthenticated state
  6  |     await page.context().clearCookies()
  7  | 
  8  |     // Try to access protected dashboard
  9  |     await page.goto('/dashboard')
  10 | 
  11 |     // Should be redirected to /login
  12 |     await expect(page).toHaveURL(/\/login/)
  13 | 
  14 |     // Login page should be visible
  15 |     await expect(page.locator('text=Connexion')).toBeVisible()
  16 |   })
  17 | 
  18 |   test('/login page renders correctly', async ({ page }) => {
  19 |     await page.goto('/login')
  20 | 
> 21 |     await expect(page.locator('text=Ted Scale With Ouss')).toBeVisible()
     |                                                            ^ Error: expect(locator).toBeVisible() failed
  22 |     await expect(page.locator('input[type="email"]')).toBeVisible()
  23 |     await expect(page.locator('input[type="password"]')).toBeVisible()
  24 |     await expect(page.locator('button[type="submit"]')).toBeVisible()
  25 |   })
  26 | })
  27 | 
```