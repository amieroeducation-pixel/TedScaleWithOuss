#!/usr/bin/env node
/**
 * Script de test des endpoints Phase 0 + Phase 1
 *
 * Usage: node test-phase0-1.mjs
 *
 * Prérequis:
 * - Serveur dev en cours sur http://localhost:3003
 * - User Supabase configuré (email/password)
 */

import { createClient } from '@supabase/supabase-js'

const BASE_URL = 'http://localhost:3003'
const SUPABASE_URL = 'https://vqtzcxvmzznbepyvlcut.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxdHpjeHZtenpuYmVweXZsY3V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzOTU0NzcsImV4cCI6MjA5Mzk3MTQ3N30.8p2-9Sw_BGaO8Ig03rSr5R63Wmph-DRE3QurA7Hq38o'

// Créer client Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Résultats des tests
const results = {
  server: null,
  s01_menu_get: null,
  s01_menu_patch: null,
  s04_tasks_get: null,
  s04_tasks_patch: null,
}

console.log('🧪 Tests Phase 0 + Phase 1\n')
console.log('Base URL:', BASE_URL)
console.log('Supabase URL:', SUPABASE_URL)
console.log('')

/**
 * Helper pour faire des requêtes authentifiées
 */
async function authFetch(url, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('❌ Pas de session Supabase active')
  }

  const headers = {
    'Content-Type': 'application/json',
    'Cookie': `sb-access-token=${session.access_token}; sb-refresh-token=${session.refresh_token}`,
    ...options.headers,
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  return response
}

/**
 * Test 1: Vérifier que le serveur répond
 */
async function testServer() {
  console.log('📌 Test 1: GET / (serveur répond)')
  try {
    const response = await fetch(`${BASE_URL}/`)
    results.server = {
      status: response.status,
      ok: response.ok,
      redirected: response.redirected,
      url: response.url,
    }

    if (response.status === 200 || response.redirected) {
      console.log('✅ Serveur répond (status:', response.status, ')')
      return true
    } else {
      console.log('⚠️ Statut inattendu:', response.status)
      return false
    }
  } catch (error) {
    console.log('❌ Erreur:', error.message)
    results.server = { error: error.message }
    return false
  }
}

/**
 * Test 2: GET /api/settings
 */
async function testSettingsGet() {
  console.log('\n📌 Test 2: GET /api/settings (menu_sections_visible)')
  try {
    const response = await authFetch(`${BASE_URL}/api/settings`)
    const data = await response.json()

    results.s01_menu_get = {
      status: response.status,
      hasMenuSections: 'menu_sections_visible' in data,
      data: data,
    }

    if (response.ok && 'menu_sections_visible' in data) {
      console.log('✅ menu_sections_visible présent:', data.menu_sections_visible)
      return true
    } else {
      console.log('⚠️ menu_sections_visible absent')
      console.log('Données reçues:', data)
      return false
    }
  } catch (error) {
    console.log('❌ Erreur:', error.message)
    results.s01_menu_get = { error: error.message }
    return false
  }
}

/**
 * Test 3: PATCH /api/settings
 */
async function testSettingsPatch() {
  console.log('\n📌 Test 3: PATCH /api/settings (sauvegarder menu_sections_visible)')
  try {
    const testData = {
      menu_sections_visible: ['dashboard', 'today', 'revenue']
    }

    const response = await authFetch(`${BASE_URL}/api/settings`, {
      method: 'PATCH',
      body: JSON.stringify(testData),
    })

    const data = await response.json()

    results.s01_menu_patch = {
      status: response.status,
      ok: response.ok,
      data: data,
    }

    if (response.ok) {
      console.log('✅ Sauvegarde OK')
      return true
    } else {
      console.log('⚠️ Échec:', data)
      return false
    }
  } catch (error) {
    console.log('❌ Erreur:', error.message)
    results.s01_menu_patch = { error: error.message }
    return false
  }
}

/**
 * Test 4: GET /api/tasks
 */
async function testTasksGet() {
  console.log('\n📌 Test 4: GET /api/tasks (liste tâches)')
  try {
    const response = await authFetch(`${BASE_URL}/api/tasks`)
    const data = await response.json()

    results.s04_tasks_get = {
      status: response.status,
      ok: response.ok,
      tasksCount: Array.isArray(data) ? data.length : 0,
      data: Array.isArray(data) ? data.slice(0, 2) : data, // Premiers items seulement
    }

    if (response.ok && Array.isArray(data)) {
      console.log('✅ Liste OK:', data.length, 'tâches')
      return true
    } else {
      console.log('⚠️ Format inattendu:', data)
      return false
    }
  } catch (error) {
    console.log('❌ Erreur:', error.message)
    results.s04_tasks_get = { error: error.message }
    return false
  }
}

/**
 * Test 5: PATCH /api/tasks/:id
 */
async function testTasksPatch() {
  console.log('\n📌 Test 5: PATCH /api/tasks/:id (persistence checkbox)')

  // D'abord récupérer une tâche existante
  try {
    const listResponse = await authFetch(`${BASE_URL}/api/tasks`)
    const tasks = await listResponse.json()

    if (!Array.isArray(tasks) || tasks.length === 0) {
      console.log('⚠️ Aucune tâche disponible pour tester PATCH')
      results.s04_tasks_patch = { skipped: 'no tasks available' }
      return false
    }

    const task = tasks[0]
    const newDoneValue = !task.done

    console.log('   Tâche test:', task.id, '-', task.title)
    console.log('   done:', task.done, '→', newDoneValue)

    const response = await authFetch(`${BASE_URL}/api/tasks/${task.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ done: newDoneValue }),
    })

    const data = await response.json()

    results.s04_tasks_patch = {
      status: response.status,
      ok: response.ok,
      taskId: task.id,
      originalDone: task.done,
      newDone: newDoneValue,
      data: data,
    }

    if (response.ok) {
      console.log('✅ Persistence OK')

      // Restaurer l'état original
      await authFetch(`${BASE_URL}/api/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ done: task.done }),
      })
      console.log('   État restauré')

      return true
    } else {
      console.log('⚠️ Échec:', data)
      return false
    }
  } catch (error) {
    console.log('❌ Erreur:', error.message)
    results.s04_tasks_patch = { error: error.message }
    return false
  }
}

/**
 * Fonction principale
 */
async function main() {
  // Vérifier si une session existe déjà
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    console.log('⚠️ Aucune session Supabase active')
    console.log('')
    console.log('Pour tester les endpoints authentifiés:')
    console.log('1. Ouvre http://localhost:3003/login dans un navigateur')
    console.log('2. Connecte-toi avec tes credentials Supabase')
    console.log('3. Récupère le access_token depuis les cookies du navigateur')
    console.log('4. Ajoute-le à ce script ou utilise Playwright pour les tests E2E')
    console.log('')
    console.log('Test limité au serveur uniquement...\n')

    await testServer()

    console.log('\n' + '='.repeat(60))
    console.log('Résultats:')
    console.log(JSON.stringify(results, null, 2))
    return
  }

  console.log('✅ Session Supabase active:', session.user.email)
  console.log('')

  // Exécuter tous les tests
  await testServer()
  await testSettingsGet()
  await testSettingsPatch()
  await testTasksGet()
  await testTasksPatch()

  // Afficher résumé
  console.log('\n' + '='.repeat(60))
  console.log('RÉSULTATS:')
  console.log('='.repeat(60))

  const passed = Object.values(results).filter(r => r && (r.ok || r.status === 200)).length
  const total = Object.keys(results).length

  console.log(`\n${passed}/${total} tests réussis\n`)
  console.log(JSON.stringify(results, null, 2))
}

// Exécuter
main().catch(console.error)
