---
story: s03-crm-kanban-fiabilisation
validated: yes
created: 2026-08-17
complexity: 2
estimate: 4-5h
---

# Plan: s03-crm-kanban-fiabilisation

**Story**: docs/stories/s03-crm-kanban-fiabilisation/story.md  
**Design**: docs/designs/s03-crm-kanban-fiabilisation.md  
**Research**: docs/research/s03-crm-kanban-fiabilisation.md

---

## Objectif

Fiabiliser le CRM Kanban avec 3 nouveaux composants UI et amélioration du drag-drop :
1. **ProspectDeleteDialog** — Confirmation avant suppression
2. **InteractionTimeline** — Historique des interactions dans la fiche prospect
3. **AddInteractionModal** — Ajout d'interaction (note, call, meeting)
4. **Drag-drop rollback** — Gestion d'erreur avec retour optimiste
5. **Suppression données mock** — Utiliser API uniquement

---

## Acceptance Criteria

1. ✅ Le drag-drop d'un prospect entre colonnes met à jour le `pipeline_stage` en DB (optimistic UI + rollback si erreur)
2. ✅ Un clic sur un prospect ouvre une fiche modifiable (nom, téléphone, email, métier, ville, notes) — sauvegarde PATCH
3. ✅ Le bouton "Nouveau prospect" ouvre un formulaire et crée le prospect via POST `/api/prospects`
4. ✅ Les numéros de téléphone et métiers affichés correspondent aux données DB (pas de données hardcodées)
5. ✅ La recherche et le filtre par tag fonctionnent sur les données réelles

---

## Pre-requisites

- ✅ API routes existent et fonctionnent (`/api/prospects`, `/api/pipeline/move`, `/api/interactions`)
- ✅ ProspectEditForm existe et fonctionne
- ✅ Schemas Zod existent dans les API routes
- ✅ Design system PSG Cosmos documenté
- ✅ Playwright configuré avec exemples E2E

---

## Tasks (TDD order)

### Task 1: Centraliser les schemas Zod (30min) ✅

**Pourquoi en premier**: Schemas nécessaires pour validation client + tests unitaires.

**Fichier à créer**:
- `src/lib/schemas/crm.ts`

**Contenu**:
```typescript
import { z } from 'zod'

// Prospect schemas
export const createProspectSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().min(10).optional(),
  profession: z.string().optional(),
  company: z.string().optional(),
  city: z.string().optional(),
  source: z.enum(['tns', 'chefs_entreprise', 'particuliers', 'recommandation', 'linkedin', 'autre']),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
})

export const updateProspectSchema = z.object({
  full_name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  profession: z.string().optional(),
  company: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  next_action_date: z.string().optional(),
})

export const moveProspectSchema = z.object({
  prospect_id: z.string().uuid(),
  from_stage: z.enum(['a_contacter', 'rdv1', 'rdv2', 'rdv3', 'converti', 'perdu']),
  to_stage: z.enum(['a_contacter', 'rdv1', 'rdv2', 'rdv3', 'converti', 'perdu']),
})

// Interaction schemas
export const createInteractionSchema = z.object({
  prospect_id: z.string().uuid(),
  type: z.enum(['appel', 'rdv1', 'rdv2', 'rdv3', 'email', 'sms', 'whatsapp', 'linkedin', 'interpro', 'autre']),
  occurred_at: z.string().datetime(),
  duration_min: z.number().int().positive().optional(),
  notes: z.string().optional(),
  is_honored: z.boolean().optional(),
})

// TypeScript types (inferred)
export type CreateProspectInput = z.infer<typeof createProspectSchema>
export type UpdateProspectInput = z.infer<typeof updateProspectSchema>
export type MoveProspectInput = z.infer<typeof moveProspectSchema>
export type CreateInteractionInput = z.infer<typeof createInteractionSchema>
```

**Fichiers à modifier**:
- `src/app/api/prospects/route.ts` — importer `createProspectSchema`
- `src/app/api/prospects/[id]/route.ts` — importer `updateProspectSchema`
- `src/app/api/pipeline/move/route.ts` — importer `moveProspectSchema`
- `src/app/api/interactions/route.ts` — importer `createInteractionSchema`

**Tests à écrire**:
- `tests/unit/schemas/crm.test.ts` — Vitest unit tests
  - Test valid inputs pass validation
  - Test invalid inputs fail with correct error messages
  - Test optional fields
  - Test enum constraints

**Critère de succès**:
- `npm run test:unit` passe
- Aucun import cassé dans les API routes

---

### Task 2: ProspectDeleteDialog component (45min) ✅

**Pourquoi maintenant**: Composant isolé, pas de dépendance complexe.

**Fichier à créer**:
- `src/components/crm/ProspectDeleteDialog.tsx`

**Props**:
```typescript
interface ProspectDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prospect: {
    id: string
    full_name: string
  }
  interactionCount: number
  onDeleteSuccess: () => void
}
```

**Implémentation**:
- Utiliser `@radix-ui/react-dialog` (pattern existant dans codebase)
- Design strict selon `docs/designs/s03-crm-kanban-fiabilisation.md` Screen 1
- États: default, loading (API call), error, success
- API call: `DELETE /api/prospects/${prospect.id}`
- Toast success/error via `sonner` (déjà installé)

**Styles (inline CSS avec C.xxx)**:
- Container: width 460px, background C.surface1, border 1px C.line, borderRadius 12px, padding 20px
- Header: icon 🗑️ + title "Supprimer ce prospect ?" (Oswald 600, 14px, textHi)
- Body: nom prospect (gold, 13px, bold) + warning texte (textMid, 10px) + interaction count (warn, 9px)
- Actions: bouton "Annuler" (secondary) + bouton "Supprimer définitivement" (danger magenta/cyan)

**Tests E2E** (partie de `e2e/s03-crm-kanban.spec.ts`):
- Scénario 1: Ouvrir modal, cliquer Annuler → modal se ferme
- Scénario 2: Ouvrir modal, cliquer Supprimer → prospect disparu, toast success
- Scénario 3: Simuler erreur API → toast error, modal reste ouvert

**Critère de succès**:
- Composant rendable sans crash
- Clics Annuler/Supprimer déclenchent les bonnes actions
- Design match mockup HTML pixel-perfect

---

### Task 3: Drag-drop rollback logic (1h) ✅

**Pourquoi maintenant**: Fonctionnalité critique, doit être testée avant d'ajouter plus de UI.

**Fichier à modifier**:
- `src/app/(dashboard)/crm/page.tsx` — fonction `handleDragEnd`

**Pattern actuel** (ligne ~1300):
```typescript
async function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event
  if (!over) return
  
  // Optimistic update (immediate UI change)
  setProspects(prev => /* move prospect */)
  
  // API call
  await fetch('/api/pipeline/move', { ... })
  
  // ⚠️ PROBLÈME: Pas de rollback si erreur
}
```

**Nouveau pattern** (avec rollback):
```typescript
async function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event
  if (!over) return
  
  const prospectId = active.id as string
  const toStage = over.id as string
  
  // Save old state for rollback
  const oldProspect = prospects.find(p => p.id === prospectId)
  if (!oldProspect) return
  const fromStage = oldProspect.pipeline_stage
  
  // Optimistic update
  setProspects(prev => prev.map(p =>
    p.id === prospectId ? { ...p, pipeline_stage: toStage } : p
  ))
  
  try {
    // API call
    const res = await fetch('/api/pipeline/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prospect_id: prospectId,
        from_stage: fromStage,
        to_stage: toStage,
      })
    })
    
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Erreur déplacement')
    }
    
    // Success toast
    toast.success(`Prospect déplacé vers ${toStage}`)
    
  } catch (error) {
    // ROLLBACK: revert to old stage
    setProspects(prev => prev.map(p =>
      p.id === prospectId ? { ...p, pipeline_stage: fromStage } : p
    ))
    
    // Error toast
    toast.error(error instanceof Error ? error.message : 'Erreur lors du déplacement')
  }
}
```

**Tests E2E**:
- Scénario 4: Drag prospect entre colonnes → vérifier nouvelle position + toast success
- Scénario 5: Simuler erreur réseau (offline) → vérifier rollback + toast error
- Scénario 6: Drag vers même colonne → pas d'API call

**Critère de succès**:
- Drag-drop fonctionne en mode normal
- En cas d'erreur, prospect revient à sa colonne d'origine
- Toast correct affiché dans les deux cas

---

### Task 4: InteractionTimeline component (1h)

**Pourquoi maintenant**: Composant UI pur, peut être développé en parallèle.

**Fichier à créer**:
- `src/components/crm/InteractionTimeline.tsx`

**Props**:
```typescript
interface InteractionTimelineProps {
  prospectId: string
  onAddClick: () => void
}
```

**Implémentation**:
- Fetch `GET /api/interactions?prospect_id=${prospectId}` au mount
- États: loading (skeleton), error (retry button), loaded (liste)
- Empty state: icon 📭 + message "Aucune interaction enregistrée"
- Timeline item: icon (type-based emoji) + type label + date/time + notes + duration

**Type-to-emoji mapping**:
```typescript
const INTERACTION_ICONS: Record<string, string> = {
  appel: '📞',
  rdv1: '📅',
  rdv2: '📅',
  rdv3: '📅',
  email: '✉️',
  whatsapp: '💬',
  linkedin: '💼',
  autre: '📝',
}
```

**Styles (selon design Screen 2)**:
- Container: padding 16px 20px, borderTop 1px solid C.line, maxHeight 300px (scrollable)
- Header: "HISTORIQUE INTERACTIONS" (JetBrains Mono, 9px, textLo, uppercase, letterSpacing 1px) + count badge
- Timeline line: 1px C.lineSoft, vertical between items
- Action button: "➕ Ajouter une interaction" (9px, Oswald 600, cyan)

**Tests E2E**:
- Scénario 7: Ouvrir fiche prospect avec interactions → timeline affichée
- Scénario 8: Ouvrir fiche prospect sans interactions → empty state
- Scénario 9: Cliquer "Ajouter interaction" → modal s'ouvre

**Critère de succès**:
- Liste des interactions affichée correctement
- Emojis correspondent aux types
- Dates formatées en français (ex: "12 août 2026, 14h30")
- Scrollable si > 10 interactions

---

### Task 5: AddInteractionModal component (1h)

**Pourquoi maintenant**: Dépend du schema (Task 1), peut être testé isolément.

**Fichier à créer**:
- `src/components/crm/AddInteractionModal.tsx`

**Props**:
```typescript
interface AddInteractionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prospectId: string
  prospectName: string
  onSuccess: () => void
}
```

**Implémentation**:
- Formulaire avec React Hook Form + Zod resolver
- Champs: type (required), date/time (required, default now), duration (optional si appel/rdv), notes (optional)
- Type selector: 3 quick buttons ("📝 Note", "📞 Appel", "📅 Rendez-vous") + toggle "Autres types..."
- Mapping user-friendly → API types:
  - "Note" → type: 'autre'
  - "Appel" → type: 'appel'
  - "Rendez-vous" → type: 'rdv1'
- API call: `POST /api/interactions` avec body validé par `createInteractionSchema`
- Success: ferme modal, toast success, callback `onSuccess()` pour refresh timeline

**Styles (selon design Screen 3)**:
- Container: width 520px, background C.surface1, border 1px C.line, borderRadius 12px, padding 20px
- Header: icon ➕ + title "Ajouter une interaction" (Oswald 600, 14px, textHi) + close button ✕
- Form fields: labels (JetBrains Mono, 8px, textLo), inputs (background C.surface2)
- Actions: bouton "Annuler" (secondary) + bouton "Enregistrer" (success green)

**Validation**:
- Type required (disabled submit si non sélectionné)
- Date/time required (pas de date future si type = Appel)
- Duration optionnel (visible si type = Appel ou RDV)

**Tests E2E**:
- Scénario 10: Ouvrir modal, remplir formulaire Note, sauvegarder → timeline updated
- Scénario 11: Ouvrir modal, sélectionner Appel avec durée 30min, sauvegarder → interaction créée

**Critère de succès**:
- Formulaire valide les champs selon schema Zod
- API call réussit avec données correctes
- Timeline se rafraîchit après ajout
- Toast success affiché

---

### Task 6: Intégrer timeline + delete dans ProspectDetailModal (45min)

**Pourquoi maintenant**: Composants unitaires testés, on assemble.

**Fichier à modifier**:
- `src/app/(dashboard)/crm/page.tsx` — ProspectDetailModal (lignes 441-735)

**Modifications**:
1. Ajouter section "Historique interactions" après "Séquences"
2. Intégrer `<InteractionTimeline prospectId={selectedProspect.id} onAddClick={() => setShowAddInteraction(true)} />`
3. Ajouter `<AddInteractionModal open={showAddInteraction} onOpenChange={setShowAddInteraction} prospectId={selectedProspect.id} prospectName={selectedProspect.full_name} onSuccess={handleInteractionAdded} />`
4. Ajouter bouton "🗑️ Supprimer" dans footer (position: absolute bottom 20px left 20px)
5. Intégrer `<ProspectDeleteDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm} prospect={selectedProspect} interactionCount={interactionCount} onDeleteSuccess={handleDeleteSuccess} />`

**Layout adjustments**:
- Modal maxHeight: 85vh → 90vh
- OverflowY: auto

**States à ajouter**:
```typescript
const [showAddInteraction, setShowAddInteraction] = useState(false)
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
const [interactionCount, setInteractionCount] = useState(0)
```

**Tests E2E**:
- Scénario 12: Ouvrir fiche prospect → timeline visible + bouton delete visible
- Scénario 13: Cliquer delete → confirmation modal → confirmer → prospect disparu

**Critère de succès**:
- Timeline affichée dans modal
- Bouton delete fonctionnel
- Modal scrollable avec nouveau contenu
- Pas de régression sur edit form existant

---

### Task 7: Supprimer données mock (30min)

**Pourquoi maintenant**: Nettoyage final après validation des fonctionnalités réelles.

**Fichier à modifier**:
- `src/app/(dashboard)/crm/page.tsx`

**Changements**:
1. Supprimer array `INITIAL_PROSPECTS` (lignes 71-169)
2. Modifier `useState<Prospect[]>([])` — pas de fallback mock
3. Implémenter proper loading state (skeleton cards)
4. Implémenter empty state ("Aucun prospect. Cliquez 'Nouveau prospect' pour commencer.")

**Loading state**:
```typescript
{isLoading && (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
    {[...Array(6)].map((_, i) => (
      <div key={i} style={{
        background: C.surface1,
        height: 200,
        borderRadius: 10,
        animation: 'pulse 1.5s infinite'
      }} />
    ))}
  </div>
)}
```

**Empty state**:
```typescript
{prospects.length === 0 && !isLoading && (
  <div style={{
    textAlign: 'center',
    padding: 60,
    color: C.textMid,
  }}>
    <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Aucun prospect</div>
    <div style={{ fontSize: 10, marginBottom: 16 }}>Cliquez "Nouveau prospect" pour commencer.</div>
  </div>
)}
```

**Critère de succès**:
- Aucun `INITIAL_PROSPECTS` dans le code
- Loading state visible au chargement
- Empty state visible si DB vide
- Pas de données hardcodées affichées

---

### Task 8: Tests E2E complets (1.5h)

**Pourquoi à la fin**: Nécessite toutes les fonctionnalités implémentées.

**Fichier à créer**:
- `e2e/s03-crm-kanban.spec.ts`

**11 scénarios** (couvrant tous les AC):

1. **Drag-drop success**: Drag prospect "À contacter" → "RDV1" → vérifie colonne + toast
2. **Drag-drop rollback**: Simulate offline → drag → vérifie rollback + toast error
3. **Edit prospect**: Clic prospect → edit form → change nom → save → vérifie DB updated
4. **Delete prospect**: Clic prospect → delete button → confirm → vérifie disparu + toast
5. **Delete cascade**: Créer prospect + 3 interactions → delete → vérifie interactions supprimées
6. **Add interaction note**: Ouvrir fiche → add interaction → type Note → save → vérifie timeline
7. **Add interaction call**: Add interaction → type Appel → durée 30min → save → vérifie timeline
8. **Timeline display**: Prospect avec 5 interactions → ouvrir fiche → vérifie 5 items affichés
9. **Timeline empty**: Prospect sans interactions → ouvrir fiche → vérifie empty state
10. **Search prospects**: Search input "Dupont" → vérifie filtre appliqué
11. **Filter by tag**: Clic tag chip "VIP" → vérifie seuls prospects VIP affichés

**Pattern Playwright**:
```typescript
import { test, expect } from '@playwright/test'

test.describe('s03-crm-kanban-fiabilisation', () => {
  test.beforeEach(async ({ page }) => {
    // Login + navigate to CRM
    await page.goto('/login')
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
    await page.goto('/dashboard/crm')
    await page.waitForLoadState('networkidle')
  })

  test('Scénario 1: Drag-drop success', async ({ page }) => {
    // Test implementation...
  })

  // ... 10 autres scénarios
})
```

**Critère de succès**:
- `npx playwright test e2e/s03-crm-kanban.spec.ts` → 11/11 pass
- Aucun test flaky (relancer 3x pour confirmer)
- Coverage: drag-drop, CRUD, interactions, delete cascade

---

### Task 9: Documentation technique (30min)

**Pourquoi à la fin**: Documenter les décisions et patterns une fois stabilisés.

**Fichier à créer**:
- `docs/stories/s03-crm-kanban-fiabilisation/IMPLEMENTATION.md`

**Contenu**:
```markdown
# Implementation: s03-crm-kanban-fiabilisation

## Summary
Fiabilisation du CRM Kanban avec ajout de 3 composants UI et amélioration drag-drop.

## Components created
- `src/components/crm/ProspectDeleteDialog.tsx` (120 lignes)
- `src/components/crm/InteractionTimeline.tsx` (180 lignes)
- `src/components/crm/AddInteractionModal.tsx` (240 lignes)

## Schema centralization
- Created `src/lib/schemas/crm.ts` (80 lignes)
- Extracted 4 schemas from API routes
- Added TypeScript types via `z.infer`

## Drag-drop rollback pattern
Location: `src/app/(dashboard)/crm/page.tsx` function `handleDragEnd`
- Save old state before optimistic update
- Try-catch around API call
- Rollback to old state on error
- Toast feedback in both cases

## Mock data removed
- Deleted `INITIAL_PROSPECTS` array (99 lignes removed)
- Implemented loading state (skeleton cards)
- Implemented empty state ("Aucun prospect")

## Tests
- Unit tests: `tests/unit/schemas/crm.test.ts` (4 suites, 16 tests)
- E2E tests: `e2e/s03-crm-kanban.spec.ts` (11 scénarios)
- Coverage: drag-drop, CRUD, interactions, delete cascade

## API endpoints used
- GET /api/prospects
- POST /api/prospects
- PATCH /api/prospects/[id]
- DELETE /api/prospects/[id]
- POST /api/pipeline/move
- GET /api/interactions?prospect_id=xxx
- POST /api/interactions

## Design system compliance
All components follow PSG Cosmos design system:
- Inline CSS with `C.xxx` tokens
- Typography: Oswald headers, Inter body, JetBrains Mono data
- Colors: bgDeep, surface1-2, gold, cyan, textHi/Mid/Lo
- Spacing: 4px base unit, consistent padding/gaps
- Border radius: 6-12px selon size

## Known limitations
- Timeline limited to last 20 interactions (API limit)
- Delete is hard delete (no soft delete)
- Interaction type mapping simplified (Note → 'autre', Call → 'appel', Meeting → 'rdv1')

## Migration notes
None. No database changes required.

## Performance
- Page load: ~800ms (with 50 prospects)
- Drag-drop: instant (optimistic UI)
- Timeline load: ~200ms (join query)

## Future enhancements
- Paginate timeline (show more button)
- Edit existing interactions
- Delete individual interactions
- Filter timeline by type
- Soft delete with recovery
```

**Critère de succès**:
- Doc complète et précise
- Couvre tous les composants créés
- Patterns documentés pour réutilisation

---

## Files manifest

### To CREATE (9 files):
- `src/lib/schemas/crm.ts` — Centralized Zod schemas
- `src/components/crm/ProspectDeleteDialog.tsx` — Delete confirmation modal
- `src/components/crm/InteractionTimeline.tsx` — Interaction history display
- `src/components/crm/AddInteractionModal.tsx` — Add interaction form
- `tests/unit/schemas/crm.test.ts` — Unit tests for schemas
- `e2e/s03-crm-kanban.spec.ts` — E2E tests (11 scénarios)
- `docs/stories/s03-crm-kanban-fiabilisation/IMPLEMENTATION.md` — Documentation

### To MODIFY (5 files):
- `src/app/(dashboard)/crm/page.tsx` — Remove mock data, refactor handleDragEnd, integrate components
- `src/app/api/prospects/route.ts` — Import schema from central location
- `src/app/api/prospects/[id]/route.ts` — Import schema from central location
- `src/app/api/pipeline/move/route.ts` — Import schema from central location
- `src/app/api/interactions/route.ts` — Import schema from central location

**Total**: 14 fichiers (9 créés, 5 modifiés)

---

## Risk mitigation

### Risk 1: Story budget trop serré (4-5h pour 9 tasks)
**Mitigation**: Tasks optimisées, parallélisation possible (schemas + components indépendants).

### Risk 2: Drag-drop rollback casse comportement existant
**Mitigation**: Tests E2E avant/après, keep old code commented, test offline mode.

### Risk 3: E2E tests flaky (timing issues)
**Mitigation**: `waitForLoadState('networkidle')`, proper selectors, retry config.

### Risk 4: Mock data removal → page blanche
**Mitigation**: Implémenter loading/empty states AVANT de supprimer mock data.

---

## Success criteria checklist

Avant de marquer story DONE:

- [ ] `npm run build` passe sans erreurs
- [ ] `npm run lint` passe
- [ ] `npx playwright test e2e/s03-crm-kanban.spec.ts` → 11/11 pass
- [ ] `npm run test:unit` → tous tests schemas pass
- [ ] Manuel: drag prospect offline → rollback + toast error
- [ ] Manuel: delete prospect avec 5 interactions → cascade + warning
- [ ] Manuel: add 3 interactions (note, call, meeting) → timeline updated
- [ ] Manuel: edit prospect → persisted après reload
- [ ] Manuel: DB vide → empty state (pas mock data)
- [ ] Manuel: search "dupont" → filtre fonctionne
- [ ] Code review: aucun `INITIAL_PROSPECTS`
- [ ] Code review: tous schemas importés de `src/lib/schemas/crm.ts`
- [ ] Doc: `IMPLEMENTATION.md` créé et complet

---

## Estimation breakdown

| Task | Durée | Dépendances |
|------|-------|-------------|
| 1. Centraliser schemas Zod | 30min | - |
| 2. ProspectDeleteDialog | 45min | Task 1 |
| 3. Drag-drop rollback | 1h | - |
| 4. InteractionTimeline | 1h | Task 1 |
| 5. AddInteractionModal | 1h | Task 1 |
| 6. Intégration modal | 45min | Tasks 2, 4, 5 |
| 7. Supprimer mock data | 30min | Tasks 3, 6 |
| 8. Tests E2E | 1.5h | All tasks |
| 9. Documentation | 30min | All tasks |

**Total séquentiel**: 7h  
**Total optimisé** (parallélisation Tasks 2-5): **4-5h** ✅

---

## Execution order (optimized)

**Phase 1** (30min): Task 1 (schemas) — BLOQUANT pour le reste

**Phase 2** (2h, parallèle possible):
- Task 2 (ProspectDeleteDialog)
- Task 3 (Drag-drop rollback)
- Task 4 (InteractionTimeline)
- Task 5 (AddInteractionModal)

**Phase 3** (45min): Task 6 (Integration) — nécessite Phase 2 complète

**Phase 4** (30min): Task 7 (Supprimer mock) — nécessite Phase 3

**Phase 5** (2h, fin): Tasks 8-9 (Tests E2E + Doc) — nécessite tout le reste

---

**Plan prêt pour validation.**
