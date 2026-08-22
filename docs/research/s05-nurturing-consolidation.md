# Research — s05-nurturing-consolidation

**Date:** 2026-08-21
**Story:** Nurturing fiable sans faille — séquences, température, canaux, cron

---

## Current State Summary

| Area | Status | Details |
|------|--------|---------|
| Email channel | ✅ Working | Brevo API, interpolation OK |
| SMS channel | ✅ Working | Brevo API, truncated 160 chars |
| WhatsApp channel | ⚠️ Partial | Works via Brevo BUT silent SMS fallback |
| LinkedIn channel | ❌ Broken | Hardcoded to `skip` in executor.ts L49-51 + cron L41-51 |
| Call reminder | ✅ Working | Logs interaction, manual honor |
| Message content | ✅ Working | 10 seed sequences, real content, no "..." |
| Variable interpolation | ✅ Working | Handlebars: {{prenom}}, {{profession}}, {{ville}}, {{date}}, {{heure}} |
| Temperature scoring | ❌ Wrong algorithm | Uses lastContactDays, NOT cumulative score per AC |
| Pressure cron | ✅ Working | Updates computed_pressure + nb_relances_sans_reponse |
| Sequence cron | ⚠️ Partial | Sends email/SMS, skips WhatsApp+LinkedIn |
| Execution logs | ✅ Working | Branch already added (3 commits) |
| Retry logic | ✅ Working | Branch already added |
| Monitoring UI | ✅ Working | /sequences/logs page exists |

---

## Key Files

| File | Lines | Role |
|------|-------|------|
| `src/app/(dashboard)/nurturing/page.tsx` | 1,677 | Main nurturing UI |
| `src/app/(dashboard)/nurturing/nurturing-types.ts` | ~220 | Temperature + pressure logic |
| `src/lib/sequences/executor.ts` | 196 | Step execution engine |
| `src/app/api/cron/sequences-process/route.ts` | ~80 | Cron sequence processing |
| `src/app/api/cron/nurturing-temperature/route.ts` | ~60 | Temperature recalc cron |
| `src/app/api/crm/sequences/seed-library/route.ts` | 1,136 | 10 pre-built sequence templates |
| `src/app/api/nurturing/send-message/route.ts` | — | Direct message sending |

---

## AC Compliance Analysis

### AC1: All messages have real content ✅
- 10 seed sequences with professionally written multi-paragraph messages
- All variants have real content — no "..." or placeholder text found
- Grep confirmed: no empty `message_template` fields

### AC2: Variable interpolation ✅
- Handlebars engine in `src/lib/nurturing/template-engine.ts`
- Supports: `{{prenom}}`, `{{nom}}`, `{{metier}}`, `{{ville}}`, `{{date}}`, `{{heure}}`, `{{montant}}`
- Helpers: formatDate(), uppercase(), capitalize(), ifEquals()

### AC3: WhatsApp/LinkedIn NOT skip ❌
- **WhatsApp in executor.ts:** ✅ Sends via Brevo (with silent SMS fallback)
- **WhatsApp in cron:** ❌ Hardcoded skip (line 41-51 of sequences-process/route.ts)
- **LinkedIn everywhere:** ❌ Hardcoded skip — "Canal LinkedIn — action manuelle requise"
- **Fix needed:** Remove skip from cron for WhatsApp. For LinkedIn, implement link-based flow (open compose URL with pre-filled message)

### AC4: Temperature score algorithm ❌
- **AC requires:** +1 per interaction, +3 per RDV, -1 per week of silence. Cold→warm at 5, warm→hot at 12
- **Current code:** Uses `lastContactDays` threshold (≤3→hot, ≤7→warm, else cold)
- **Fix needed:** Rewrite `calculateTempCategory()` to use cumulative score with AC thresholds

### AC5: Cron pressure works without auth bypass ✅
- Cron uses `verifyCronSecret()` — properly secured
- Pressure cron runs and updates `computed_pressure` + `nb_relances_sans_reponse`
- No auth bypass found (was fixed in commit 782dde8)

---

## Blocking Issues (must fix)

1. **LinkedIn skip** — executor.ts L49-51 + cron L41-51 return 'skipped'
   - Strategy: LinkedIn has no send API for free accounts. Best approach: mark step as "action_required", store pre-interpolated message, show notification in UI with link to prospect's LinkedIn profile + copy-to-clipboard message
   
2. **WhatsApp skip in cron** — cron hardcodes skip for WhatsApp (even though executor.ts handles it)
   - Fix: Remove WhatsApp from the skip block in cron, let it flow through executor.ts normally

3. **Temperature algorithm** — Current logic doesn't match AC requirement
   - Fix: New function using cumulative interaction score with +1/+3/-1 rules and 5/12 thresholds

---

## Non-Blocking Issues (nice to fix)

1. **Silent WhatsApp→SMS fallback** — User not informed when fallback occurs
   - Fix: Log as 'sms_fallback' interaction type, show warning in UI

2. **Duplicate template engines** — Two interpolation implementations
   - Fix: Consolidate into single Handlebars engine

---

## Feature Branch State

Branch `feature/s05-nurturing-consolidation` already has 3 commits:
- Execution logs table + atomic lock optimization
- Retry logic for failed steps
- Monitoring UI + logs page

These address operational reliability but NOT the 3 blocking AC issues (LinkedIn, WhatsApp cron, temperature).
