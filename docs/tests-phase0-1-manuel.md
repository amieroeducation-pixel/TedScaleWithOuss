# Guide de Test Manuel — Phase 0 + Phase 1

**Durée estimée**: 5 minutes
**Prérequis**: Serveur dev lancé sur http://localhost:3003

---

## Étape 1 : Se connecter

1. Ouvre **http://localhost:3003/login**
2. Entre tes credentials Supabase
3. Clique **Se connecter**
4. Tu dois arriver sur `/dashboard`

✅ **Si tu vois le dashboard** → Auth OK, passe à l'étape 2

---

## Étape 2 : Ouvrir DevTools

1. Appuie sur **F12** (ou **Ctrl+Shift+I** / **Cmd+Option+I**)
2. Clique sur l'onglet **Console**
3. Tu vas copier-coller des commandes JavaScript pour tester les endpoints

---

## Étape 3 : Tester GET /api/settings

**But**: Vérifier que `menu_sections_visible` existe

**Action**: Copie-colle dans la Console et appuie sur **Entrée**:

```javascript
fetch('/api/settings')
  .then(r => r.json())
  .then(d => {
    if ('menu_sections_visible' in d) {
      console.log('✅ menu_sections_visible présent:', d.menu_sections_visible)
    } else {
      console.log('❌ menu_sections_visible ABSENT')
    }
    console.log('Données complètes:', d)
  })
```

**Résultat attendu**:
```
✅ menu_sections_visible présent: ["dashboard", "today", ...]
```

📝 **Note le résultat** (✅ ou ❌)

---

## Étape 4 : Tester PATCH /api/settings

**But**: Vérifier que la sauvegarde fonctionne

**Action**: Copie-colle dans la Console:

```javascript
fetch('/api/settings', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    menu_sections_visible: ['dashboard', 'today', 'revenue']
  })
})
  .then(r => r.json())
  .then(d => {
    console.log('✅ Sauvegarde OK:', d.menu_sections_visible)
  })
  .catch(e => console.log('❌ Erreur:', e))
```

**Résultat attendu**:
```
✅ Sauvegarde OK: ["dashboard", "today", "revenue"]
```

📝 **Note le résultat** (✅ ou ❌)

---

## Étape 5 : Tester GET /api/tasks

**But**: Récupérer la liste des tâches

**Action**: Copie-colle dans la Console:

```javascript
fetch('/api/tasks')
  .then(r => r.json())
  .then(tasks => {
    console.log(`✅ ${tasks.length} tâches récupérées`)
    console.log('Première tâche:', tasks[0])
    
    // Sauvegarder l'ID de la première tâche pour l'étape suivante
    window.testTaskId = tasks[0]?.id
  })
```

**Résultat attendu**:
```
✅ 5 tâches récupérées
Première tâche: { id: "...", title: "...", done: false, ... }
```

📝 **Note le résultat** (✅ ou ❌)

---

## Étape 6 : Tester PATCH /api/tasks/:id

**But**: Modifier une tâche et vérifier la persistence

**Action**: Copie-colle dans la Console:

```javascript
if (!window.testTaskId) {
  console.log('⚠️ Lance d\'abord l\'étape 5 pour récupérer un ID de tâche')
} else {
  fetch(`/api/tasks/${window.testTaskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ done: true })
  })
    .then(r => r.json())
    .then(task => {
      console.log('✅ Tâche mise à jour:', task.done)
      
      // Restaurer l'état original
      return fetch(`/api/tasks/${window.testTaskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: false })
      })
    })
    .then(() => console.log('✅ État restauré'))
}
```

**Résultat attendu**:
```
✅ Tâche mise à jour: true
✅ État restauré
```

📝 **Note le résultat** (✅ ou ❌)

---

## Étape 7 : Test visuel (checkbox + drag-drop)

### 7A : Checkbox persistence

1. Va sur **http://localhost:3003/tasks**
2. **Coche** une tâche
3. Tu dois voir un **toast** : "Tâche mise à jour"
4. **Recharge la page** (F5)
5. La tâche doit rester cochée

📝 **Résultat** : ✅ ou ❌

---

### 7B : Drag-drop persistence

1. Sur **http://localhost:3003/tasks**
2. **Drag une tâche** vers le haut ou le bas
3. Tu dois voir un **toast** : "Ordre sauvegardé"
4. **Recharge la page** (F5)
5. L'ordre doit rester identique

📝 **Résultat** : ✅ ou ❌

---

## Récapitulatif

Une fois tous les tests effectués, remplis ce tableau:

| # | Test | Status |
|---|------|--------|
| 1 | Connexion → Dashboard | ✅ / ❌ |
| 2 | GET /api/settings → menu_sections_visible | ✅ / ❌ |
| 3 | PATCH /api/settings → sauvegarde | ✅ / ❌ |
| 4 | GET /api/tasks → liste | ✅ / ❌ |
| 5 | PATCH /api/tasks/:id → update | ✅ / ❌ |
| 6 | Checkbox persistence (visuel) | ✅ / ❌ |
| 7 | Drag-drop persistence (visuel) | ✅ / ❌ |

**Total** : __ / 7

---

## En cas d'erreur

### ❌ `fetch is not defined` dans la Console

→ Tu es peut-être dans un onglet Node.js. Assure-toi d'être dans l'onglet **Console** du navigateur (pas Sources).

### ❌ `401 Unauthorized` ou redirect vers `/login`

→ Ta session a expiré. Reconnecte-toi sur http://localhost:3003/login et recommence.

### ❌ `404 Not Found` sur `/api/settings` ou `/api/tasks`

→ Vérifie que le serveur tourne bien sur **localhost:3003** (pas 3000).

### ❌ Toast "Erreur de mise à jour"

→ Regarde les logs du serveur (`npm run dev`) pour voir l'erreur exacte.

---

## Après les tests

Une fois tous les tests effectués, **mets à jour** le fichier:

📄 `docs/tests-phase0-1-resultats.md`

Section **Conclusion** → remplace 🔒 par ✅ ou ❌ selon tes résultats.

---

**Temps total** : ~5 minutes  
**Date** : 2026-08-11
