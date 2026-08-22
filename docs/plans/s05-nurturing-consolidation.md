---
story: s05-nurturing-consolidation
date: 2026-08-21
status: validated
validated: yes
complexity: 3
tasks_total: 7
---

# Plan — s05-nurturing-consolidation

## Story Goal

Rendre la section Nurturing 100% fiable : température calculée par score cumulatif, LinkedIn fonctionnel (action manuelle guidée), WhatsApp envoyé par le cron, pas de skip silencieux.

## Acceptance Criteria (from docs/stories.md)

1. Tous les messages de séquence ont un contenu réel (aucun template "..." ou squelette vide)
2. L'interpolation de variables fonctionne pour tous les placeholders
3. Les canaux WhatsApp et LinkedIn ne sont plus "skip" — WhatsApp envoie via Brevo, LinkedIn = action manuelle guidée
4. Le score de température est calculé : +1 par interaction, +3 par RDV pris, -1 par semaine de silence. Cold→warm à 5, warm→hot à 12
5. Le cron de pression fonctionne et envoie les relances automatiques sans auth bypass

## Branch

`feature/s05-nurturing-consolidation` (existante — 3 commits déjà : logs, retry, monitoring UI)

---

## Tasks (ordered)

### 1. [x] Execution logs + retry logic (ALREADY DONE on branch)
- Commits: d5e47f8, aada2c8, 6ea70d6
- Table execution_logs, retry mechanism, monitoring UI
- **No work needed — verified in research**

### 2. [x] Rewrite temperature scoring algorithm
- **File:** `src/app/(dashboard)/nurturing/nurturing-types.ts`
- **Change:** Replace `calculateTempCategory()` with cumulative score-based logic:
  - Fetch ALL interactions for prospect (not just last 7 days)
  - Score: `+1` per interaction (email, sms, whatsapp, linkedin, appel), `+3` per RDV (rdv1, rdv2, rdv3), `-1` per complete week of silence since first contact
  - Thresholds: score < 5 → cold, 5-11 → warm, ≥ 12 → hot
  - Dead: keep existing logic (noResponseCount ≥ 5 OR forced)
  - Keep `forcedTemperature` override
- **File:** `src/app/api/cron/nurturing-temperature/route.ts`
  - Update cron to compute and store cumulative score (new column `temperature_score INT` on prospects table)
- **Test:** Unit test for score calculation with edge cases (0 interactions, 3 RDVs only, silence decay)

### 3. [x] Fix WhatsApp in cron (remove skip)
- **File:** `src/app/api/cron/sequences-process/route.ts`
- **Change:** Remove WhatsApp from the skip block (line 41-51). Let WhatsApp flow through `executeStep()` which already handles it via Brevo API
- **Keep:** LinkedIn still handled separately (task 4)
- **Test:** Verify cron processes WhatsApp steps → calls sendWhatsAppMessage

### 4. [x] Implement LinkedIn as guided manual action
- **File:** `src/lib/sequences/executor.ts`
- **Change:** Replace LinkedIn skip (L49-51) with:
  - Status: `'sent'` (not 'skipped') — marks the step as actioned
  - Store pre-interpolated message in `message_sent` field
  - Insert interaction with `type: 'linkedin'`, `is_honored: false` (needs user to confirm)
  - Return `{ status: 'sent', messageSent: interpolatedMessage }`
- **File:** `src/app/api/cron/sequences-process/route.ts`
  - Remove LinkedIn from cron skip block
  - Let it flow through executeStep() like other channels
- **File:** `src/app/(dashboard)/nurturing/page.tsx`
  - In the sequence step display, for LinkedIn steps with `is_honored: false`:
    - Show a "📋 Copier + Ouvrir LinkedIn" button
    - Button copies `message_sent` to clipboard + opens `prospect.linkedin_url` in new tab
    - After click, PATCH interaction to `is_honored: true`
- **Test:** Verify LinkedIn steps produce interaction + message stored, UI shows action button

### 5. [x] Add WhatsApp fallback transparency
- **File:** `src/lib/sequences/executor.ts`
- **Change:** When WhatsApp fails and falls back to SMS:
  - Log the fallback: insert interaction with `type: 'sms'` and notes containing "Fallback SMS (WhatsApp indisponible)"
  - Update `message_sent` to indicate channel used: prepend "[SMS fallback] "
- **Test:** Verify fallback logged correctly

### 6. [x] Migration: add temperature_score column
- **File:** `supabase/migrations/008_temperature_score.sql`
- **SQL:**
  ```sql
  ALTER TABLE prospects ADD COLUMN IF NOT EXISTS temperature_score INTEGER DEFAULT 0;
  ```
- Must run before task 2 can work in production

### 7. [x] Integration test: full sequence cycle
- Create a test sequence with steps: email J+0, WhatsApp J+3, LinkedIn J+5, SMS J+7
- Assign to test prospect
- Run cron processing
- Verify: email sent, WhatsApp sent via Brevo, LinkedIn stored as action_required with message, SMS sent
- Verify: temperature score incremented correctly (+1 per step sent)
- Verify: no auth bypass, cron_logs populated

---

## Files Touched

| File | Changes |
|------|---------|
| `src/app/(dashboard)/nurturing/nurturing-types.ts` | Rewrite calculateTempCategory() |
| `src/lib/sequences/executor.ts` | LinkedIn impl + WhatsApp fallback logging |
| `src/app/api/cron/sequences-process/route.ts` | Remove WhatsApp+LinkedIn skip |
| `src/app/api/cron/nurturing-temperature/route.ts` | Compute cumulative score |
| `src/app/(dashboard)/nurturing/page.tsx` | LinkedIn action button in sequence view |
| `supabase/migrations/008_temperature_score.sql` | New column |

## Test Strategy

- Unit tests for temperature scoring (new algorithm, edge cases)
- Unit test for executor LinkedIn path
- Unit test for WhatsApp fallback logging
- Integration test: full sequence cycle through cron
- `npm run build` must pass
- TypeScript: `tsc --noEmit` must pass

## Risks

1. **LinkedIn without API:** Cannot auto-send LinkedIn messages — guided manual action is the pragmatic choice
2. **Temperature score migration:** Needs backfill for existing prospects (compute from historical interactions)
3. **WhatsApp Brevo limits:** May hit rate limits if many steps queued — existing retry logic handles this
