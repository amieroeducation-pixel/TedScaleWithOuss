# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-10)

**Core value:** Avoir sur un seul écran tout ce qu'il faut faire aujourd'hui — relances prioritaires, alertes clients inactifs, CA en temps réel — sans aller chercher l'information ailleurs.
**Current focus:** Phase 1 — Data Wiring

## Current Position

Phase: 1 of 5 (Data Wiring)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-05-10 — Roadmap created (5 phases, 37 v1 requirements mapped)

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:** No data yet

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Phase 0: Inline CSS via theme.ts — contrôle total du thème PSG Cosmos dark/gold
- Phase 0: `getUser()` dans middleware.ts (pas `getSession()`) — sécurité JWT côté serveur
- Phase 0: Zod v4 avec `.issues` (pas `.errors`) — breaking change Zod v4
- Pending: SMS provider non décidé (Brevo SMS / Onoff / autre) — à cadrer en Phase 2

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 2: SMS provider à choisir avant implémentation SEQ-05
- Phase 1: DATA-07 dépend de Google Calendar (v2) — utiliser `interactions` table comme fallback v1

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| DATA-07 | RDV depuis Google Calendar | Fallback via `interactions` table | Phase 0 init |

## Session Continuity

Last session: 2026-05-10
Stopped at: Roadmap created — prêt à planifier Phase 1
Resume file: None
