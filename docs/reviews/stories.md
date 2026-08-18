# Stories Review — Refonte Dashboard CGP + Kill Calendly

> Re-review after fixes (2026-08-09)

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

## Previous findings — all resolved

| # | Previous issue | Resolution |
|---|---|---|
| 1 | s10 technical-layer story | Removed. Work distributed to s04 (mock removal), s08 (middleware), each story (file splitting). |
| 2 | Overlap s10 vs s04 | Resolved by s10 removal. s04 exclusively owns mock data removal. |
| 3 | Overlap s10 vs s08 middleware | Resolved. s08 exclusively owns middleware exclusion for `/booking`. |
| 4 | s05 AC4 vague temperature | Now has concrete formula: +1/interaction, +3/RDV, -1/week silence, thresholds at 5 and 12. |
| 5 | s02→s05 dependency implicit | Now explicit in graph and agentic notes. |

## Current findings

No issues found. All stories deliver end-to-end user value, have testable ACs, follow correct dependency order, and stay within the PRD perimeter.

---

Max severity: none
Stories ready: yes
