---
story: s01-menu-dynamique
date: 2026-08-12
status: shipped
commit: 57c73a9
---

# Research — s01-menu-dynamique

**Story shipped**: Ce document capture l'état ACTUEL de l'implémentation déjà livrée (commit 57c73a9).

## Story Goal

Permettre à l'utilisateur de masquer/afficher les 5 grandes sections du menu latéral (Principal, Clients, Acquisition, Outils, Pilotage) via la page Settings, pour personnaliser son interface selon son usage.

## Acceptance Criteria (from docs/stories.md)

1. ✅ Menu latéral organisé en 5 sections visibles par défaut (Principal, Clients, Acquisition, Outils, Pilotage)
2. ✅ Nouvel onglet "Menu" dans Settings avec toggle ON/OFF pour chaque section
3. ✅ Persistance dans `user_settings.menu_sections_visible` (JSONB)
4. ✅ Application immédiate des changements (optimistic update + save API)
5. ✅ Sections masquées disparaissent complètement du menu latéral

## Files Involved

### 1. Database Migration

**File**: `supabase/migrations/20260811_add_menu_visibility.sql`
- **Lines**: 13 lignes
- **Purpose**: Ajoute colonne `menu_sections_visible` (JSONB) à `user_settings`
- **Default**: Toutes sections activées
```sql
menu_sections_visible jsonb DEFAULT '{
  "principal": true,
  "clients": true,
  "acquisition": true,
  "outils": true,
  "pilotage": true
}'::jsonb
```

### 2. Menu Component (TabMenu)

**File**: `src/app/(dashboard)/settings/shared.tsx`
- **Lines**: 153-194 (42 lignes)
- **Component**: `TabMenu`
- **State**: `visible: Record<string, boolean>` — État local synchronisé avec settings
- **Sections**: 5 sections configurables (principal, clients, acquisition, outils, pilotage)
- **UI**: `SectionPanel` + `SetRow` + `Toggle` pour chaque section
- **Persistence**: `handleToggle()` → optimistic update + `save({ menu_sections_visible })`

**Behavior**:
- Lit `settings.menu_sections_visible` via props
- Affiche toggle pour chaque section avec label + description
- Sauvegarde immédiate via `save()` (hook fourni par page Settings)

### 3. Layout Integration

**File**: `src/app/(dashboard)/layout.tsx`
- **Lines**: 77-83, 100-109, 222-224 (état + fetch + filter)
- **State**: `menuVisibility: Record<string, boolean>` — État récupéré via `/api/settings`
- **Effect**: Fetch GET `/api/settings` au mount → extraction `data.menu_sections_visible`
- **Filter**: Lignes 222-224 filtre `NAV_SECTIONS` selon `menuVisibility[key] !== false`

**Current Structure**:
```typescript
NAV_SECTIONS = [
  { label: 'Principal', items: [...] },
  { label: 'Clients', items: [...] },
  { label: 'Acquisition', items: [...] },
  { label: 'Outils', items: [...] },
  { label: 'Pilotage', items: [...] }
]
```

**Filter Logic**:
```typescript
NAV_SECTIONS.filter(section => {
  const key = section.label.toLowerCase()
  return menuVisibility[key] !== false
}).map(section => ...)
```

Si `menuVisibility.clients === false`, la section "Clients" est masquée du DOM.

### 4. Settings API

**File**: `src/app/api/settings/route.ts` (referenced, not modified for s01)
- **GET**: Retourne `user_settings` complet incluant `menu_sections_visible`
- **PATCH**: Accepte `{ menu_sections_visible: {...} }` et persiste en DB

### 5. useUserSettings Hook

**File**: `src/hooks/useUserSettings.ts` (referenced)
- Type `UserSettings` inclut `menu_sections_visible?: Record<string, boolean>`
- Hook utilisé par `settings/page.tsx` pour fournir `save()` à `TabMenu`

## Architecture Notes

### Conventions Respectées

1. **Inline CSS** : Tous les styles via `C` object (theme.ts) — aucune classe Tailwind
2. **Component Pattern** : Réutilise `SectionPanel`, `SetRow`, `SetLabel`, `Toggle` de `settings/shared.tsx`
3. **Persistence JSONB** : Nouveau champ DB stocke objet JSON flat (5 clés booléennes)
4. **Optimistic Update** : UI réactive immédiatement, sauvegarde async en arrière-plan
5. **SSR-safe** : Layout fetch côté client (useEffect) — pas de server component fetch

### API Flow

```
[User clicks Toggle in Settings]
       ↓
handleToggle() — optimistic setVisible()
       ↓
save({ menu_sections_visible: next })
       ↓
PATCH /api/settings → UPDATE user_settings
       ↓
[User reloads OR navigates]
       ↓
layout.tsx useEffect → GET /api/settings
       ↓
setMenuVisibility(data.menu_sections_visible)
       ↓
NAV_SECTIONS.filter(section => menuVisibility[key] !== false)
       ↓
Render filtered sidebar
```

### Known Limitations

1. **No Real-Time Sync**: Si l'utilisateur change settings dans un onglet, il doit recharger l'autre onglet pour voir le menu mis à jour (pas de WebSocket/polling)
2. **Case Sensitivity**: Filter utilise `section.label.toLowerCase()` pour matcher keys — si label change, mapping casse
3. **Default Fallback**: `menuVisibility[key] !== false` signifie que si clé absente, section reste visible (safe default)
4. **Root Layout Unchanged**: `src/app/layout.tsx` (root) ne touche pas au menu — seul `(dashboard)/layout.tsx` est modifié

## Testing Notes

### Checklist Manuel (from Phase 0-1)

**Action 1**: Naviguer Settings → onglet "📂 Menu"
- ✅ Onglet visible dans TABS array
- ✅ TabMenu component mounted avec 5 toggles

**Action 2**: Désactiver section "Clients"
- ✅ Toggle OFF → `visible.clients = false`
- ✅ PATCH `/api/settings` appelé avec payload
- ✅ DB updated (vérifié via Supabase)

**Action 3**: Recharger page Dashboard
- ✅ Layout fetch GET `/api/settings`
- ✅ `menuVisibility.clients === false`
- ✅ Section "Clients" absente du menu latéral (filter l'exclut)

**Action 4**: Réactiver section
- ✅ Toggle ON → sauvegarde → section réapparaît après reload

### E2E Test

**File**: `e2e/phase0-1-test.spec.ts` (lines 248-293)
- Test Playwright vérifie TabMenu, toggles, persistence
- ✅ Passed (selon docs/tests-phase0-1-resultats.md)

## Dependencies

**Requires**:
- Migration `20260811_add_menu_visibility.sql` appliquée
- API `/api/settings` GET + PATCH fonctionnels
- `useUserSettings` hook avec type `menu_sections_visible`

**Depends on**:
- Aucune autre story — s01 est première story killer-saas

**Depended by**:
- Stories futures (s02-s09) utilisent ce menu comme base UI

## Complexity Score

**Scored**: 2/5
- Simple CRUD settings + filter UI
- Pas d'API externe, pas de logique métier complexe
- JSONB column + state sync standard Next.js

## Traps & Edge Cases

1. **Key Mismatch**: Si `NAV_SECTIONS` label change (ex: "Outils" → "Tools"), le filter casse. **Solution actuelle**: Hard-coded lowercase match — fragile mais simple.

2. **Migration Idempotence**: Migration utilise `ADD COLUMN IF NOT EXISTS` — safe pour réapplication.

3. **Null/Undefined Handling**: Filter `!== false` traite `null`/`undefined` comme `true` — sections apparaissent par défaut si clé manquante.

4. **Settings Page Isolation**: `TabMenu` ne connaît pas `layout.tsx` — pas de live preview du menu pendant édition. User doit recharger pour voir effet.

5. **Race Condition**: Si user toggle rapidement 5 sections, plusieurs PATCHs concurrents. Supabase last-write-wins, mais optimistic UI peut desync. **Mitigé**: User rarely toggles 5x in <1s.

## Open Questions

✅ **Résolu** — Story complète et shippée. Aucune question ouverte pour s01.

## References

- **Commit**: `57c73a9` — "Phase 0-1: Menu dynamique + sections sommeil"
- **Docs**: `docs/diagnostique-s01-menu-tableau-ascii.md` (5 actions documentées)
- **Tests**: `docs/tests-phase0-1-resultats.md` (E2E passed)
- **Related Files**: 
  - `src/app/(dashboard)/settings/page.tsx` (mount TabMenu)
  - `src/app/(dashboard)/settings/shared.tsx` (TabMenu component)
  - `src/app/(dashboard)/layout.tsx` (consume menuVisibility)
  - `supabase/migrations/20260811_add_menu_visibility.sql`

---

**Next Step**: `/ks-plan s01-menu-dynamique` (si on veut rétro-plan) OU `/ks-research s02-...` (pour story suivante)
