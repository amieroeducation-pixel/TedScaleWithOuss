# Tests Phase 0 + Phase 1

**Date**: 2026-08-11
**Serveur**: http://localhost:3003
**Status**: Tests partiels (limitation auth)

---

## Contexte

Tests des fonctionnalités implémentées en:

### Phase 0 — 6 Quick Wins
- s06-tns : Retrait tabs retirés/nouveaux
- s03-crm : UUID universels + scroll fluide
- s02-today : Ouverture agenda Fantastical

### Phase 1A — s01-menu
- Migration DB : colonne `menu_sections_visible` (text[])
- TabMenu Settings : sélection sections visibles
- Filtrage `NAV_SECTIONS` : affichage conditionnel sidebar

### Phase 1B — s04-tasks
- Checkbox persistence : debounce 300ms + retry 3x
- Drag-drop : dnd-kit vertical + persistance ordre

---

## Résultats

### ✅ Serveur

```bash
curl -I http://localhost:3003/
```

**Résultat**:
```
HTTP/1.1 307 Temporary Redirect
location: /login
Date: Tue, 11 Aug 2026 10:59:56 GMT
```

**Status**: ✅ OK
- Le serveur répond correctement
- Redirect non-authentifié → `/login` fonctionne (middleware)

---

### 🔒 s01-menu (Phase 1A)

#### GET /api/settings

**Endpoint**: `GET /api/settings`
**Attendu**: Retourne objet avec `menu_sections_visible`

**Status**: 🔒 Authentification requise
- Le middleware redirige vers `/login`
- Impossible de tester sans session Supabase valide

**Code test préparé** (voir `e2e/phase0-1-test.spec.ts` ligne 34):
```typescript
const response = await page.request.get('/api/settings')
expect(response.ok()).toBeTruthy()

const data = await response.json()
expect(data).toHaveProperty('menu_sections_visible')
```

**Actions manuelles pour valider**:
1. Ouvrir http://localhost:3003/login
2. Se connecter avec credentials Supabase
3. Ouvrir DevTools Console
4. Exécuter:
   ```javascript
   fetch('/api/settings')
     .then(r => r.json())
     .then(d => console.log('menu_sections_visible' in d ? '✅ OK' : '❌ ABSENT', d))
   ```

---

#### PATCH /api/settings

**Endpoint**: `PATCH /api/settings`
**Body**: `{ menu_sections_visible: string[] }`
**Attendu**: Sauvegarde en DB + retourne settings mis à jour

**Status**: 🔒 Authentification requise

**Code test préparé** (voir `e2e/phase0-1-test.spec.ts` ligne 46):
```typescript
const testData = { menu_sections_visible: ['dashboard', 'today', 'revenue'] }

const response = await page.request.patch('/api/settings', {
  data: testData,
})

expect(response.ok()).toBeTruthy()
const updated = await response.json()
expect(updated.menu_sections_visible).toEqual(testData.menu_sections_visible)
```

**Actions manuelles pour valider**:
1. Authentifié sur http://localhost:3003
2. Aller dans `/settings`
3. Modifier les sections visibles dans l'onglet "Préférences"
4. Recharger la page → vérifier que les changements persistent

---

### 🔒 s04-tasks (Phase 1B)

#### GET /api/tasks

**Endpoint**: `GET /api/tasks`
**Attendu**: Array de tâches `[{ id, title, done, order, ... }]`

**Status**: 🔒 Authentification requise

**Code test préparé** (voir `e2e/phase0-1-test.spec.ts` ligne 67):
```typescript
const response = await page.request.get('/api/tasks')
expect(response.ok()).toBeTruthy()

const tasks = await response.json()
expect(Array.isArray(tasks)).toBeTruthy()
```

**Actions manuelles pour valider**:
1. Authentifié sur http://localhost:3003
2. DevTools Console:
   ```javascript
   fetch('/api/tasks')
     .then(r => r.json())
     .then(tasks => console.log(`✅ ${tasks.length} tâches`, tasks))
   ```

---

#### PATCH /api/tasks/:id

**Endpoint**: `PATCH /api/tasks/:id`
**Body**: `{ done: boolean }` ou `{ order: number }`
**Attendu**: Persistence immédiate avec debounce + retry

**Status**: 🔒 Authentification requise

**Code test préparé** (voir `e2e/phase0-1-test.spec.ts` ligne 77):
```typescript
const task = tasks[0]
const newDone = !task.done

const response = await page.request.patch(`/api/tasks/${task.id}`, {
  data: { done: newDone },
})

expect(response.ok()).toBeTruthy()
const updated = await response.json()
expect(updated.done).toBe(newDone)
```

**Actions manuelles pour valider**:
1. Authentifié sur http://localhost:3003/tasks
2. Cocher/décocher une checkbox → vérifier toast "Tâche mise à jour"
3. Recharger la page → vérifier que l'état persiste
4. Drag-drop une tâche → vérifier toast + persistence après reload

---

## Fichiers de test créés

### 1. Script Node.js

**Fichier**: `test-phase0-1.mjs`
**Usage**:
```bash
node test-phase0-1.mjs
```

**Limitations**:
- Teste uniquement GET / (serveur)
- Endpoints API nécessitent session Supabase
- Nécessiterait extension avec sign-in programmatique

**Résultat actuel**:
```json
{
  "server": {
    "status": 200,
    "ok": true,
    "redirected": true,
    "url": "http://localhost:3003/login"
  }
}
```

---

### 2. Tests Playwright E2E

**Fichier**: `e2e/phase0-1-test.spec.ts`
**Usage**:
```bash
# Avec credentials dans .env
TEST_EMAIL=ton@email.com TEST_PASSWORD=motdepasse npx playwright test phase0-1-test

# Ou mode UI
npx playwright test phase0-1-test --ui
```

**Tests inclus**:
1. ✅ GET / → serveur répond
2. 🔒 GET /api/settings → menu_sections_visible
3. 🔒 PATCH /api/settings → sauvegarde
4. 🔒 GET /api/tasks → liste
5. 🔒 PATCH /api/tasks/:id → persistence checkbox

**Prérequis pour exécuter**:
- Ajouter `TEST_EMAIL` et `TEST_PASSWORD` dans `.env.local`
- Ou hardcoder dans `e2e/phase0-1-test.spec.ts` ligne 20-21

---

## Conclusion

### ✅ Validé

| Item | Description | Méthode |
|------|-------------|---------|
| Serveur | Répond sur localhost:3003 | curl -I |
| Middleware auth | Redirect → /login si non-auth | curl / |

### 🔒 À valider manuellement

| Item | Description | Action |
|------|-------------|--------|
| GET /api/settings | menu_sections_visible présent | DevTools Console |
| PATCH /api/settings | Sauvegarde sections visibles | Settings UI → reload |
| GET /api/tasks | Liste des tâches | DevTools Console |
| PATCH /api/tasks/:id | Checkbox persistence | Cocher → reload |
| PATCH /api/tasks/:id | Drag-drop persistence | Drag → reload |

### 📋 Prochaines étapes

1. **Configurer credentials de test**:
   - Créer un user Supabase dédié aux tests
   - Ajouter dans `.env.local`:
     ```
     TEST_EMAIL=test@tedscale.com
     TEST_PASSWORD=TestPassword123!
     ```

2. **Exécuter les tests Playwright**:
   ```bash
   npx playwright test phase0-1-test
   ```

3. **Validation manuelle complète**:
   - Se connecter sur http://localhost:3003
   - Tester chaque endpoint via DevTools Console (snippets fournis ci-dessus)
   - Documenter résultats réels ici

4. **Tests automatisés futurs**:
   - Ajouter auth setup dans Playwright (`auth.setup.ts`)
   - Seed data pour tests reproductibles
   - CI/CD avec tests E2E

---

## Statut global

**Niveau de confiance**: ⚠️ **Moyen**

- ✅ Infrastructure OK (serveur + middleware)
- 🔒 Endpoints API non testés (besoin auth)
- 📝 Tests E2E prêts mais nécessitent config

**Recommandation**: Effectuer validation manuelle des 5 endpoints API via navigateur + DevTools avant de considérer Phase 0+1 complète.

---

**Durée**: 15 minutes (création infrastructure test + rapport)
**Dernière mise à jour**: 2026-08-11 11:05 UTC
