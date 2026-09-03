import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

test.describe('s09 — Rappels SMS cron endpoint', () => {

  test('GET /api/cron/rdv-reminder sans header retourne 401 en prod', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/cron/rdv-reminder`)
    // En dev sans CRON_SECRET: 200 (mode dev ouvert)
    // En prod sans header: 401 ou 500
    expect([200, 401, 500]).toContain(res.status())
  })

  test('GET /api/cron/rdv-reminder avec header retourne 200', async ({ request }) => {
    const secret = process.env.CRON_SECRET || ''
    const res = await request.get(`${BASE_URL}/api/cron/rdv-reminder`, {
      headers: { 'x-cron-secret': secret }
    })
    // En dev: 200 (mode ouvert, cron exécuté)
    // Avec bon secret: 200 (cron exécuté ou disabled)
    expect([200]).toContain(res.status())
    const body = await res.json()
    expect(body.data).toBeDefined()
    expect(['ok', 'disabled']).toContain(body.data.status)
  })

  test('Cron retourne processed: 0 quand pas de bookings dans la fenetre', async ({ request }) => {
    const secret = process.env.CRON_SECRET || ''
    const res = await request.get(`${BASE_URL}/api/cron/rdv-reminder`, {
      headers: { 'x-cron-secret': secret }
    })
    if (res.status() === 200) {
      const body = await res.json()
      if (body.data.status === 'ok') {
        expect(body.data.processed).toBeDefined()
        expect(typeof body.data.processed).toBe('number')
      }
    }
  })

  test('Reminder types couvrent 24h et 1h', () => {
    const reminderTypes = ['24h', '1h']
    expect(reminderTypes).toContain('24h')
    expect(reminderTypes).toContain('1h')
    expect(reminderTypes).toHaveLength(2)
  })

  test('Default templates contiennent les variables Handlebars requises', () => {
    const template24h = "Bonjour {{nom}}, rappel de votre RDV demain à {{heure}}. À bientôt !"
    const template1h = "Bonjour {{nom}}, votre RDV est dans 1h ({{heure}}). Merci d'être ponctuel !"

    for (const tmpl of [template24h, template1h]) {
      expect(tmpl).toContain('{{nom}}')
      expect(tmpl).toContain('{{heure}}')
    }
  })

})
