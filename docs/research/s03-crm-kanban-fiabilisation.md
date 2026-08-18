# Research: s03-crm-kanban-fiabilisation

**Date**: 2026-08-17  
**Story**: docs/stories/s03-crm-kanban-fiabilisation/story.md  
**Target**: CRM Kanban 100% opérationnel avec drag-drop, CRUD prospects, interactions timeline

---

## 1. Story isolation & acceptance criteria

### Story objective
Fiabiliser le CRM Kanban avec drag-and-drop complet et gestion des prospects (CRUD + interactions).

### Acceptance criteria (from docs/stories.md ligne 50-60)
1. Le drag-drop d'un prospect entre colonnes met à jour le `pipeline_stage` en DB (optimistic UI + rollback si erreur)
2. Un clic sur un prospect ouvre une fiche modifiable (nom, téléphone, email, métier, ville, notes) — sauvegarde PATCH
3. Le bouton "Nouveau prospect" ouvre un formulaire et crée le prospect via POST `/api/prospects`
4. Les numéros de téléphone et métiers affichés correspondent aux données DB (pas de données hardcodées)
5. La recherche et le filtre par tag fonctionnent sur les données réelles

### Deliverables (from story.md)
1. Schemas Zod centralisés pour validation
2. ProspectDeleteDialog component avec confirmation
3. Rollback drag-drop amélioré (optimistic UI + error handling)
4. InteractionTimeline component (affichage historique)
5. AddInteractionModal component (ajout notes/calls/meetings)
6. Integration timeline dans ProspectDetailModal
7. Tests unitaires (Vitest) pour schemas + utils
8. Tests E2E (Playwright) - 11 scénarios complets
9. Documentation technique

---

## 2. Current state — files involved

### Main CRM page
**File**: `src/app/(dashboard)/crm/page.tsx` (1882 lignes)

**Current state**:
- Uses `@dnd-kit/core` v6.3.1 (NOT react-beautiful-dnd as story mentions — this is correct)
- `@dnd-kit/sortable` v10.0.0
- `@dnd-kit/utilities` v3.2.2
- INITIAL_PROSPECTS hardcoded array (lignes 71-169) — contains 16 mock prospects
- Uses optimistic UI for drag-drop but NO rollback mechanism detected
- ProspectDetailModal component (lignes 441-735) — shows prospect details but editing is PARTIAL
- ProspectEditForm imported from `@/components/prospects/ProspectEditForm.tsx`

**Key functions**:
- `handleDragEnd` (ligne ~1300) — handles drag-drop, calls `/api/pipeline/move`
- `handleStageChange` — updates pipeline stage manually
- `handleProspectUpdated` — callback after edit

**Issues detected**:
- Mock data `INITIAL_PROSPECTS` is still present — needs to be removed and replaced by API fetch
- No delete dialog component exists
- No interaction timeline component exists
- No add interaction modal exists
- Drag-drop error handling is minimal

### API routes (existing and functional)

**Prospects CRUD**:
- `src/app/api/prospects/route.ts` (126 lignes) — GET + POST
  - GET: filters by stage, source, search (ligne 20-55)
  - POST: validation Zod, phone normalization, duplicate check (ligne 71-125)
  - Schema: `createProspectSchema` (ligne 6-18) — already centralized
- `src/app/api/prospects/[id]/route.ts` (115 lignes) — GET + PATCH + DELETE
  - GET: returns prospect with interactions join (ligne 24-41)
  - PATCH: `updateProspectSchema` (ligne 6-22) — validation Zod
  - DELETE: hard delete (ligne 98-114)
  - Audit trail: logs interaction when stage changes (ligne 85-93)

**Pipeline move**:
- `src/app/api/pipeline/move/route.ts` (134 lignes)
  - POST: updates `pipeline_stage`, logs to `pipeline_events` table
  - Triggers sequence auto-start via `triggerSequenceForStage` (ligne 65-70)
  - Auto-conversion to client when stage = 'converti' (ligne 73-130)
  - Schema: `moveSchema` (ligne 7-11)

**Interactions**:
- `src/app/api/interactions/route.ts` (82 lignes) — GET + POST
  - GET: returns last 20 interactions for a prospect (ligne 18-36)
  - POST: creates interaction, updates prospect.last_contact_at (ligne 38-81)
  - Schema: `PostSchema` (ligne 8-16)
  - Types: `['appel', 'rdv1', 'rdv2', 'rdv3', 'email', 'sms', 'whatsapp', 'linkedin', 'interpro', 'autre']`

### Components (existing)

**ProspectEditForm**:
- `src/components/prospects/ProspectEditForm.tsx` (162 lignes)
- Editable fields: full_name, phone, email, profession, city, company
- Calls PATCH `/api/prospects/${prospectId}`
- PSG Cosmos styled (inline CSS with C.xxx)
- Working and functional

**ProspectCard**:
- `src/components/prospects/ProspectCard.tsx` (exists but not analyzed in detail)

**Missing components** (to create):
- `ProspectDeleteDialog` — confirmation modal before delete
- `InteractionTimeline` — displays interaction history
- `AddInteractionModal` — form to add note/call/meeting
- Integration of timeline in ProspectDetailModal

### Database schema (from migrations)

**Table: prospects** (migration 001_init_schema.sql ligne 75-110)
```sql
CREATE TABLE prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Identity
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  phone_normalized TEXT, -- E.164 format for dedup
  profession TEXT,
  company TEXT,
  address TEXT,
  city TEXT,
  department VARCHAR(3),
  
  -- Pipeline
  pipeline_stage pipeline_stage NOT NULL DEFAULT 'a_contacter',
  status prospect_status NOT NULL DEFAULT 'non_contacte',
  source prospect_source NOT NULL DEFAULT 'autre',
  
  -- Scoring
  lead_score INTEGER CHECK (lead_score >= 0 AND lead_score <= 100),
  
  -- Timing
  last_contact_at TIMESTAMPTZ,
  next_action_date DATE,
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  linkedin_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

**Table: interactions** (migration 001_init_schema.sql ligne 121-138)
```sql
CREATE TABLE interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE NOT NULL,
  
  type interaction_type NOT NULL,
  is_honored BOOLEAN DEFAULT TRUE,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  calendar_event_id TEXT, -- Google Calendar event ID
  duration_min INTEGER,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

**Enums**:
- `pipeline_stage`: `'a_contacter' | 'rdv1' | 'rdv2' | 'rdv3' | 'converti' | 'perdu'`
- `interaction_type`: `'appel' | 'rdv1' | 'rdv2' | 'rdv3' | 'email' | 'whatsapp' | 'linkedin' | 'autre'`
- `prospect_source`: `'tns' | 'chefs_entreprise' | 'particuliers' | 'recommandation' | 'linkedin' | 'autre'`

**Additional tables**:
- `pipeline_events` — logs stage changes (referenced in /api/pipeline/move)

---

## 3. APIs, functions, patterns — verified existence

### API routes (all exist and work)
✅ `GET /api/prospects` — list prospects with filters  
✅ `POST /api/prospects` — create prospect with Zod validation  
✅ `GET /api/prospects/[id]` — get prospect with interactions  
✅ `PATCH /api/prospects/[id]` — update prospect  
✅ `DELETE /api/prospects/[id]` — hard delete prospect  
✅ `POST /api/pipeline/move` — move prospect between stages  
✅ `GET /api/interactions?prospect_id=xxx` — list interactions  
✅ `POST /api/interactions` — create interaction  

### Zod schemas (centralized in API routes)
✅ `createProspectSchema` — in `/api/prospects/route.ts` ligne 6  
✅ `updateProspectSchema` — in `/api/prospects/[id]/route.ts` ligne 6  
✅ `moveSchema` — in `/api/pipeline/move/route.ts` ligne 7  
✅ `PostSchema` (interactions) — in `/api/interactions/route.ts` ligne 8  

**Note**: Story asks for "Schemas Zod centralisés" — they ARE centralized in API routes but could be extracted to `src/lib/schemas/crm.ts` for reuse in client-side validation + tests.

### Supabase patterns (verified in codebase)
✅ `createSupabaseServerClient()` — defined in `src/lib/supabase/server.ts`  
✅ Auth pattern: `const { data: { user } } = await supabase.auth.getUser(); if (!user) return apiUnauthorized()`  
✅ API helpers: `apiSuccess(data, status)`, `apiError(message, status)`, `apiUnauthorized()` — in `src/lib/api.ts`  

### Design system
✅ `import { C } from '@/lib/theme'` — PSG Cosmos palette  
✅ Inline CSS pattern with `style={{ background: C.bgDeep, color: C.gold }}`  
✅ NO Tailwind for colors (only layout utilities)  

### Drag-and-drop (dnd-kit)
✅ `DndContext` from `@dnd-kit/core`  
✅ `SortableContext` + `useSortable` from `@dnd-kit/sortable`  
✅ `closestCenter` collision detection  
✅ `PointerSensor` + `useSensor` for mouse/touch  

**Current implementation** (ligne 1291-1299):
```tsx
<DndContext
  sensors={sensors}
  collisionDetection={closestCenter}
  onDragStart={handleDragStart}
  onDragEnd={handleDragEnd}
>
```

**Missing**: Rollback mechanism when API call fails. Current code does NOT revert optimistic update on error.

### Phone normalization
✅ `normalizePhoneFr()` — defined inline in `/api/prospects/route.ts` ligne 57-69  
❌ NOT centralized in `src/lib/phone.ts` — but AGENTS.md mentions `libphonenumber-js` should be used  

**Trap**: The inline `normalizePhoneFr` is basic. Story should use `libphonenumber-js` from package.json for proper validation (mentioned in AGENTS.md ligne 145-147).

---

## 4. Traps & dependencies

### Trap 1: Mock data still present
**Location**: `src/app/(dashboard)/crm/page.tsx` ligne 71-169  
**Issue**: `INITIAL_PROSPECTS` array contains 16 hardcoded prospects  
**Impact**: If API fails or returns empty, page shows mock data instead of empty state  
**Solution**: Remove mock data, implement proper loading/empty states, fetch from API only  

### Trap 2: No rollback on drag-drop error
**Location**: `handleDragEnd` function in crm/page.tsx  
**Issue**: Optimistic UI updates state immediately, but if API fails, state is NOT reverted  
**Impact**: User sees prospect in new column even if backend rejected the move  
**Solution**: Implement rollback pattern:
```tsx
const oldStage = prospects.find(p => p.id === prospectId).stage
// Optimistic update
setProspects(prev => /* move prospect */)
// API call
const res = await fetch('/api/pipeline/move', { ... })
if (!res.ok) {
  // Rollback
  setProspects(prev => /* revert prospect to oldStage */)
  toast.error('Erreur déplacement')
}
```

### Trap 3: Interaction types mismatch
**API**: `/api/interactions/route.ts` ligne 6 defines `['appel', 'rdv1', 'rdv2', 'rdv3', 'email', 'sms', 'whatsapp', 'linkedin', 'interpro', 'autre']`  
**Story requirement**: AddInteractionModal should support `notes`, `calls`, `meetings`  
**Solution**: Map user-friendly labels to API types:
- "Note" → type: 'autre'
- "Call" → type: 'appel'
- "Meeting" → type: 'rdv1' (or add new type if needed)

### Trap 4: Design system import path
**Story says**: `import { C } from '@/styles/theme'`  
**Reality**: `import { C } from '@/lib/theme'` (verified in existing components)  
**Solution**: Use correct import path `@/lib/theme`

### Trap 5: Tests framework
**Story says**: "Tests E2E (Playwright) - 11 scénarios complets"  
**Reality**: Playwright v1.59.1 installed, config exists, examples in `e2e/nurturing.spec.ts`  
**Pattern verified**: 
```tsx
test.beforeEach(async ({ page }) => {
  await page.goto('/crm')
  await page.waitForLoadState('networkidle')
})
```

### Trap 6: ProspectDetailModal size
**Current**: Modal component is inline in crm/page.tsx (lignes 441-735) — 294 lines  
**Issue**: When adding InteractionTimeline + AddInteractionModal, modal will exceed 500 lines  
**Solution**: Extract modal to separate component file `src/components/crm/ProspectDetailModal.tsx`

### Trap 7: Delete cascade
**Database**: `prospects` table has `ON DELETE CASCADE` for `user_id`  
**Database**: `interactions` table has `ON DELETE CASCADE` for `prospect_id`  
**Impact**: Deleting a prospect will auto-delete all interactions — good for data integrity  
**UI**: ProspectDeleteDialog should warn user "Cela supprimera aussi X interactions associées"

### Trap 8: Existing tests
**Location**: `e2e/auth.spec.ts`, `e2e/nurturing.spec.ts`, `e2e/today.spec.ts`, `e2e/s01-menu-dynamique.spec.ts`  
**Impact**: Running `npx playwright test` will execute existing tests  
**Solution**: Create `e2e/s03-crm-kanban.spec.ts` with 11 scenarios as required

---

## 5. Known bugs (from memory)

**From**: `memory/dashboard/bugs-list-2026-06-25.md` (42 days old — may be outdated)

**Relevant to this story**:
- Bug #2: Numéros TNS toujours identiques dans Today (pas de renouvellement)  
- Bug #3: Certains numéros incorrects  
- Bug #4: Métiers incorrects (ex: kiné au lieu d'infirmière)  
- Bug #5: Métiers manquants dans la liste TNS  
- Bug #6: Fiches prospects non modifiables  

**Verified against current code**:
- Bug #6 is PARTIALLY FIXED: ProspectEditForm exists and works (PATCH API functional)
- Bugs #2-5 are related to prospection TNS, NOT CRM Kanban directly — may be upstream data issues

**Action**: This story should focus on CRM functionality. TNS data issues are tracked in s06-prospection-tns-fiabilisation.

---

## 6. Dependencies between modules

### Upstream dependencies
- **Prospection TNS** (`/prospection/tns`) → enriches prospects → CRM Kanban  
  - If TNS data is bad (wrong phone/profession), it propagates to CRM  
  - Solution: This story fixes CRM edit capability, but TNS fixes are in s06

- **Sequences** (`/api/crm/sequences/`) → triggered when prospect moves to RDV1/RDV2/RDV3  
  - `/api/pipeline/move` calls `triggerSequenceForStage` (ligne 65-70)  
  - This is ASYNC (fire-and-forget via `void`) — should NOT block drag-drop

### Downstream dependencies
- **Nurturing** (`/nurturing`) → uses prospects table, adds interactions  
  - Interaction types overlap between CRM and Nurturing  
  - Schema compatibility: OK (both use same `interactions` table)

- **Today** (`/today`) → shows today's prospects with next_action_date = today  
  - Relies on `prospects.next_action_date` being updated  
  - `/api/interactions POST` updates this field (ligne 69)

### Touched by previous stories
- **s01-menu-dynamique**: Modified layout.tsx sidebar — does NOT affect CRM page  
- **s05-nurturing-consolidation**: Fixed sequences executor, temperature calc — may affect CRM if prospects have active sequences  

**Conflict risk**: LOW — CRM Kanban is relatively isolated, only shares `prospects` and `interactions` tables.

---

## 7. Open questions

### Q1: Delete confirmation text
**Question**: What should ProspectDeleteDialog show?  
**Options**:
1. Simple: "Supprimer [Nom] ? Cette action est irréversible."  
2. Detailed: "Supprimer [Nom] et ses X interactions ? Cette action est irréversible."  
**Recommendation**: Option 2 (show interaction count) — more transparent

### Q2: Interaction modal — which types?
**Story says**: "ajout notes/calls/meetings"  
**API supports**: 10 types including `appel`, `rdv1-3`, `email`, `whatsapp`, etc.  
**Question**: Should modal support ALL types or just 3 main ones?  
**Recommendation**: Start with 3 (note, call, meeting), add "Advanced" toggle for full list

### Q3: Timeline display — limit?
**API**: `GET /api/interactions` limits to 20 (ligne 32)  
**Question**: Show all 20 or paginate?  
**Recommendation**: Show last 10 in modal, add "Voir tout" button to load more

### Q4: Rollback toast message
**Question**: What to show when drag-drop fails?  
**Options**:
1. Generic: "Erreur lors du déplacement"  
2. Specific: "Impossible de déplacer vers [Stage] : [error]"  
**Recommendation**: Option 2 with error message from API response

### Q5: Search implementation
**Story AC #5**: "La recherche et le filtre par tag fonctionnent sur les données réelles"  
**Current**: No search input visible in crm/page.tsx (only filter chips ligne 1234-1242)  
**Question**: Should we add search input or rely on existing filters?  
**Recommendation**: Add search input (already supported by API `?search=xxx`)

### Q6: Schema extraction location
**Story**: "Schemas Zod centralisés"  
**Current**: Schemas are in API route files  
**Question**: Extract to `src/lib/schemas/crm.ts` or leave in API files?  
**Recommendation**: Extract to `src/lib/schemas/crm.ts` for:
- Reuse in client-side validation (React Hook Form)
- Easier unit testing
- Single source of truth

---

## 8. Execution sequence recommendation

Based on TDD requirements and dependencies:

### Phase 1: Schema centralization (1h)
1. Create `src/lib/schemas/crm.ts`
2. Extract all Zod schemas from API routes
3. Update API routes to import from central location
4. Write unit tests for schemas (Vitest)

### Phase 2: Delete functionality (1h)
1. Create `src/components/crm/ProspectDeleteDialog.tsx`
2. Integrate in ProspectDetailModal
3. Wire to DELETE API endpoint
4. Test: create prospect, delete, verify cascade

### Phase 3: Drag-drop rollback (1h)
1. Refactor `handleDragEnd` to save old state
2. Add try-catch + rollback on error
3. Add toast notifications
4. Test: simulate API error (network offline)

### Phase 4: Interaction components (2h)
1. Create `src/components/crm/InteractionTimeline.tsx`
2. Create `src/components/crm/AddInteractionModal.tsx`
3. Integrate both in ProspectDetailModal
4. Test: add interaction, verify it appears in timeline

### Phase 5: Extract modal component (30min)
1. Move ProspectDetailModal to `src/components/crm/ProspectDetailModal.tsx`
2. Update imports in crm/page.tsx
3. Verify no regression

### Phase 6: Remove mock data (30min)
1. Delete INITIAL_PROSPECTS array
2. Implement proper loading state
3. Implement empty state ("Aucun prospect, cliquez Nouveau")
4. Test with empty DB

### Phase 7: E2E tests (2h)
1. Create `e2e/s03-crm-kanban.spec.ts`
2. Write 11 scenarios (as per story requirements)
3. Run tests, fix failures
4. Ensure 100% pass rate

### Phase 8: Documentation (30min)
1. Write `docs/stories/s03-crm-kanban-fiabilisation/IMPLEMENTATION.md`
2. Document new components
3. Document API changes
4. Update CHANGELOG

**Total estimate**: ~8-9h (exceeds story budget of 3-4h)

**Optimization strategy**:
- Parallelize Phase 1-2 (schemas + delete)
- Combine Phase 4-5 (create components + extract modal in one pass)
- Reduce E2E scenarios from 11 to 8 core ones (can add 3 later)

**Revised estimate**: ~4-5h

---

## 9. File manifest (to create/modify)

### To CREATE:
- `src/lib/schemas/crm.ts` — centralized Zod schemas
- `src/components/crm/ProspectDeleteDialog.tsx` — delete confirmation modal
- `src/components/crm/InteractionTimeline.tsx` — interaction history display
- `src/components/crm/AddInteractionModal.tsx` — add interaction form
- `src/components/crm/ProspectDetailModal.tsx` — extracted from page.tsx
- `src/lib/crm/rollback.ts` — helper for optimistic UI rollback (optional)
- `e2e/s03-crm-kanban.spec.ts` — 11 E2E scenarios
- `tests/unit/schemas/crm.test.ts` — Vitest unit tests for schemas
- `docs/stories/s03-crm-kanban-fiabilisation/IMPLEMENTATION.md` — doc finale

### To MODIFY:
- `src/app/(dashboard)/crm/page.tsx` — remove mock data, refactor handleDragEnd, integrate new components
- `src/app/api/prospects/route.ts` — import schema from central location
- `src/app/api/prospects/[id]/route.ts` — import schema from central location
- `src/app/api/pipeline/move/route.ts` — import schema from central location
- `src/app/api/interactions/route.ts` — import schema from central location

### To READ (for reference):
- `src/components/prospects/ProspectEditForm.tsx` — existing edit form pattern
- `e2e/nurturing.spec.ts` — E2E test pattern example
- `src/lib/theme.ts` — PSG Cosmos palette
- `src/lib/api.ts` — API response helpers

---

## 10. Risk assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Story budget (3-4h) too tight for 9 deliverables | HIGH | Focus on core features first, defer nice-to-haves |
| Drag-drop rollback breaks existing behavior | MEDIUM | Test extensively, keep old code commented for quick revert |
| Schema extraction breaks API routes | LOW | Test each route after change, use TypeScript for safety |
| E2E tests flaky (async timing issues) | MEDIUM | Use `waitForLoadState`, proper selectors, retries in config |
| Mock data removal causes blank page | LOW | Implement proper empty state before removing mocks |
| Interaction types confusion (story vs API) | LOW | Document mapping clearly, use type guards |

---

## 11. Success criteria checklist

Before marking story as DONE:

- [ ] `npm run build` passes without errors
- [ ] `npm run lint` passes
- [ ] `npx playwright test e2e/s03-crm-kanban.spec.ts` passes (11/11 scenarios)
- [ ] `npm run test:unit` passes (schemas tests)
- [ ] Manual test: drag prospect, kill network, verify rollback + toast
- [ ] Manual test: delete prospect with 5 interactions, verify cascade + warning
- [ ] Manual test: add 3 interactions (note, call, meeting), verify timeline shows all
- [ ] Manual test: edit prospect name, verify persisted after reload
- [ ] Manual test: empty DB, verify "Aucun prospect" state (not mock data)
- [ ] Manual test: search "dupont", verify filtering works
- [ ] Code review: no `INITIAL_PROSPECTS`, no hardcoded data
- [ ] Code review: all schemas imported from `src/lib/schemas/crm.ts`
- [ ] Documentation: `IMPLEMENTATION.md` created and complete

---

## Conclusion

**Story is FEASIBLE** but requires careful time management. Core APIs and DB schema are solid. Main work is:
1. UI components creation (delete dialog, timeline, add modal)
2. Drag-drop rollback logic
3. Mock data removal + proper state management
4. E2E test coverage

**Biggest trap**: Trying to do everything in 3-4h. Recommend phased approach:
- Phase 1 (3h): Core functionality (delete, rollback, timeline)
- Phase 2 (2h): E2E tests + documentation
- Phase 3 (1h): Polish + edge cases

**Dependencies are clean**: No blocking issues with other stories. Can start immediately after /ks-design.

---

Research ready in `docs/research/s03-crm-kanban-fiabilisation.md`.

**Next step**: `/ks-design s03-crm-kanban-fiabilisation` (UI story) or `/ks-plan s03-crm-kanban-fiabilisation`
