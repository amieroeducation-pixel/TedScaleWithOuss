/**
 * Test helpers for E2E Playwright tests
 */

/**
 * Get test credentials from environment variables.
 * Falls back to documented test credentials if not set.
 *
 * SETUP: Create a test user in Supabase Dashboard with these credentials:
 * - Email: test@example.com
 * - Password: password123
 *
 * OR set custom credentials in .env.local:
 * - TEST_EMAIL=your-email@example.com
 * - TEST_PASSWORD=your-password
 */
export function getTestCredentials() {
  return {
    email: process.env.TEST_EMAIL || 'test@example.com',
    password: process.env.TEST_PASSWORD || 'password123',
  }
}

/**
 * Check if test credentials are configured.
 * Logs helpful message if not.
 */
export function ensureTestCredentials() {
  const { email, password } = getTestCredentials()

  const usingDefaults = email === 'test@example.com' && password === 'password123'

  if (usingDefaults) {
    console.warn(`
⚠️  Using default test credentials (test@example.com / password123)

If tests fail with auth errors:
1. Create test user in Supabase Dashboard > Authentication > Users
   - Email: test@example.com
   - Password: password123
2. OR set custom credentials in .env.local:
   - TEST_EMAIL=your-email@example.com
   - TEST_PASSWORD=your-password

See e2e/README.md for full setup instructions.
`)
  }

  return { email, password }
}
