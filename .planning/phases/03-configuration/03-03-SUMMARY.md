---
phase: 03-configuration
plan: "03"
subsystem: settings-triggers-messages
tags: [settings, triggers, notifications, jsonb, sequences, supabase]
dependency_graph:
  requires:
    - GET /api/crm/sequences/templates (Plan 02-02A)
    - PATCH /api/crm/sequences/templates/[id] avec conflict check 409 (Plan 03-02)
    - useUserSettings hook + save() (Plan 03-01)
    - PIPELINE_STAGES_LABELS constante (ce plan)
  provides:
    - TabTriggers — vue synthétique de tous les auto-triggers avec toggle individuel
    - TabNotifications — éditeur de templates de messages JSONB par canal/stade
    - PIPELINE_STAGES_LABELS constante partagée entre TabTriggers et TabNotifications
  affects:
    - src/app/(dashboard)/settings/page.tsx
tech_stack:
  added: []
  patterns:
    - Optimistic update + rollback sur erreur API (TabTriggers toggle)
    - useEffect sync editedText depuis settings prop (changement canal/stade)
    - Merge JSONB additif côté client avant save() — double protection avec merge côté serveur
    - C.warn (#d8884a) pour compteur SMS > 160 caractères
    - Props drilling settings/save/saving depuis parent vers TabNotifications (pattern TabKPI)
key_files:
  created: []
  modified:
    - src/app/(dashboard)/settings/page.tsx
decisions:
  - "TabNotifications reçoit settings/save/saving en props depuis le parent (même pattern que TabKPI plan 03-01) — hook useUserSettings instancié une seule fois dans SettingsPage"
  - "catch sans variable (catch {}) — TypeScript strict — la variable e inutilisée génère une erreur tsc"
  - "Merge JSONB double protection : côté client (channelTemplates spread) + côté serveur (/api/settings PATCH) — évite écrasement des autres canaux"
  - "Compteur SMS utilise C.warn (#d8884a) au lieu de rouge vif — alerte douce, pas d'erreur bloquante"
metrics:
  duration: "~15 minutes"
  completed: "2026-05-11"
  tasks_completed: 2
  tasks_total: 2
  files_created: 0
  files_modified: 1
requirements_met: [CFG-04, CFG-05, CFG-08, CFG-09]
---

# Phase 3 Plan 03: TabTriggers + Éditeur Messages JSONB Summary

**One-liner:** TabTriggers avec fetch GET templates + toggle PATCH optimiste rollback-on-409, et éditeur de templates de messages JSONB dans TabNotifications avec sélecteur canal/stade, compteur SMS C.warn, et merge additif avant save().

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | TabTriggers — vue synthétique des auto-triggers | ae46640 | src/app/(dashboard)/settings/page.tsx |
| 2 | Éditeur de templates de messages (JSONB) dans TabNotifications | 7de71e2 | src/app/(dashboard)/settings/page.tsx |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] catch sans variable pour éviter erreur tsc**
- **Found during:** Task 1 — implémentation handleToggle
- **Issue:** Le plan proposait `catch (e) {` mais la variable `e` n'est pas utilisée dans le bloc — TypeScript strict génère une erreur "unused variable"
- **Fix:** Remplacé par `catch {` (syntax ES2019 optionalCatchBinding)
- **Files modified:** src/app/(dashboard)/settings/page.tsx (TabTriggers et TabNotifications)
- **Commit:** ae46640, 7de71e2

**2. [Rule 2 - Sécurité] saving prop inclus dans l'état du bouton Enregistrer**
- **Found during:** Task 2 — revue du bouton save
- **Issue:** Le plan affichait `msgSaving` seul pour le label du bouton — si `saving` global (useUserSettings) est actif, le bouton ne reflétait pas l'état réel
- **Fix:** Condition combinée `msgSaving || saving` pour le label du bouton — cohérence UX
- **Files modified:** src/app/(dashboard)/settings/page.tsx
- **Commit:** 7de71e2

## Key Decisions

1. **Props drilling settings/save/saving** — TabNotifications reçoit les props depuis SettingsPage (même pattern que TabKPI du plan 03-01). Le hook `useUserSettings` est instancié une seule fois dans le composant parent, évitant des fetches redondants et garantissant la cohérence de l'état entre les onglets.

2. **Merge JSONB double protection** — Le merge des templates est fait côté client avant `save()` (spread JS sur channelTemplates et sur message_templates global) ET côté serveur dans `/api/settings PATCH` (spread de l'existant avant UPSERT). Cela garantit qu'aucun canal non modifié n'est jamais écrasé, même en cas de race condition.

3. **PIPELINE_STAGES_LABELS constante partagée** — Ajoutée au niveau module dans settings/page.tsx, cette constante est utilisée à la fois par `TabTriggers` (pour afficher le stade d'un template) et par `TabNotifications` (pour le sélecteur de stade de l'éditeur). Évite la duplication de la map de labels.

## Threat Model Compliance

| Threat ID | Status |
|-----------|--------|
| T-03C-01 Tampering JSONB écrasement | Mitigé — Merge double protection client + serveur |
| T-03C-02 XSS via message_template | Accepté — texte affiché dans textarea, jamais en dangerouslySetInnerHTML |
| T-03C-03 Toggle sans pipeline_stage | Mitigé — UI désactive toggle si pipeline_stage null + API vérifie conflict check |
| T-03C-04 Textarea texte long | Accepté — usage solo local, pas de quota en base MVP |

## Known Stubs

Aucun stub bloquant. Tous les boutons sont branchés sur des appels API réels :
- TabTriggers Toggle → PATCH /api/crm/sequences/templates/{id} (Plan 03-02)
- TabNotifications Enregistrer → save({ message_templates: merged }) → PATCH /api/settings (Plan 03-01)

## Threat Flags

Aucun nouveau vecteur d'attaque non couvert par le threat model du plan.

## Self-Check: PASSED

- src/app/(dashboard)/settings/page.tsx : FOUND (modifié — +232 lignes)
- PIPELINE_STAGES_LABELS constante : FOUND dans le fichier
- TabTriggers function : FOUND dans le fichier
- TabNotifications reçoit settings/save/saving props : FOUND
- Section "TEMPLATES DE MESSAGES" dans TabNotifications : FOUND
- Compteur SMS avec C.warn : FOUND
- Onglet triggers branché sur `<TabTriggers />` : FOUND
- Onglet notifications branché sur `<TabNotifications settings={settings} save={save} saving={saving} />` : FOUND
- Commit ae46640 : FOUND
- Commit 7de71e2 : FOUND
- tsc --noEmit : 0 erreur
