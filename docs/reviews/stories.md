# Stories Review — Refonte Dashboard CGP + Kill Calendly

> Fresh-context review of `docs/stories.md` against `docs/prd.md`.

## Perimeter coverage

| PRD feature (core loop) | Covered by | OK? |
|---|---|---|
| Aujourd'hui — Vue quotidienne (RDV, relances, taches du jour) | s02-today-refonte | OK |
| Nurturing — Relances multicanales, suivi prospects chauds/tiedes/froids | s05-nurturing-consolidation | OK |
| Prospection TNS — Recherche prospects via API entreprises.data.gouv.fr | s06-prospection-tns-fiabilisation | OK |
| CRM Kanban — Pipeline commercial drag-drop par etape | s03-crm-kanban-fiabilisation | OK |
| Taches — Gestion des taches quotidiennes | s04-tasks-fiabilisation | OK |
| Lien de prise de RDV — Page publique partageable, creneaux, booking | s08-booking-page | OK |
| Rappels SMS avant RDV — Cron automatique, notification prospect | s09-rappels-sms | OK |
| Synchro Google Calendar — OAuth bidirectionnel, creneaux dispo | s07-google-calendar-sync | OK |
| Menu dynamique (toggle sections visibles/sommeil) | s01-menu-dynamique | OK |

**All 9 perimeter features covered. No gap.**

## Graveyard check

- Team routing, round-robin, collective events — Not present. OK.
- Analytics Calendly (conversion funnel meetings) — Not present. OK.
- Integrations tierces (Salesforce, HubSpot, Zoom) — Not present. OK.
- Workflows Calendly (sequences post-meeting) — Not present. OK.

**No graveyard leak.**

## Findings

| # | Severity | Story | Issue |
|---|---|---|---|
| 1 | **major** | s10-architecture-cleanup | Technical-layer story with no end-user value. Refactoring (file splitting, lint cleanup) should be absorbed into the stories that touch those files, or explicitly framed as a hardening pass with a user-facing benefit (e.g., "pages load faster after code-split"). |
| 2 | **major** | s10 vs s04 | Overlap: both stories claim removal of mock data (INITIAL_TASKS). s04 AC4 and s10 AC3 target the same code. One must own it exclusively. |
| 3 | minor | s10 vs s08 | Overlap: middleware exclusion for `/booking` is claimed by both s08 (agentic notes) and s10 AC4. s08 should own it since it introduces the route. |
| 4 | minor | s05 AC4 | Vague criterion: "Le score de temperature reflete les interactions reelles" — no formula or threshold defined. Difficult to write a deterministic test. |
| 5 | minor | s02-today-refonte | Dependency on s05 is implicit in the graph (noted in parentheses) but not drawn as an explicit arrow. Could confuse execution order. |

## Recommendations

1. **Remove s10 entirely** — distribute its work: file splitting happens naturally when each story touches its page; mock removal goes to s04; middleware exclusion goes to s08; build/lint pass is a CI gate, not a story.
2. **s05 AC4** — define the temperature formula (e.g., "score increases by +1 per interaction, +3 per RDV pris, decays -1/week of silence").
3. **s02** — make the dependency on s05 explicit in the graph with a drawn arrow.

---

Max severity: major
Stories ready: no
