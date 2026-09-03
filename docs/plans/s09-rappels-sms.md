---
story: s09-rappels-sms
date: 2026-09-03
status: active
validated: yes
complexity: 2
tasks_total: 5
---

# Plan — s09-rappels-sms

## Story Goal

Rappels SMS automatiques avant RDV : un cron verifie les bookings a venir et envoie des SMS de rappel (24h et/ou 1h avant) via Brevo, avec templates configurables dans Settings, anti-doublon, et logs dans Automatisations.

## Acceptance Criteria (from docs/stories.md)

1. Un cron verifie les RDV a venir et envoie un SMS de rappel 24h avant via Brevo
2. Un second rappel est envoye 1h avant le RDV
3. Le contenu SMS est personnalise (Prenom, date, heure, lieu)
4. Le delai de rappel (24h, 1h, les deux) est configurable dans Settings
5. Un log de chaque rappel envoye est visible dans la section Automatisations (table `cron_logs`)
6. Pas de doublon : un rappel deja envoye pour un RDV n'est pas renvoye

---

## Prerequisites

### Research
- OK `docs/research/s09-rappels-sms.md` produit le 2026-09-03
- Implementation existante complete, code deja sur master

### Design
- N/A — story backend/cron, pas d'ecran dedie (onglet Settings existant)

### Architecture
- OK Pattern cron standard (`verifyCronSecret` + `isCronEnabled` + `logCronRun`)
- OK Brevo SMS wrapper existant (`sendBrevoSms`)
- OK 3 migrations SQL (reminder_sent, reminder_templates, user_settings_reminder_fields)
- OK Integration Settings (onglet rappels) + Automatisations (logs)

### Code Existant
- OK `src/app/(dashboard)/settings/RappelsSmsTab.tsx` — UI complete (284 lignes)
- OK `src/app/api/settings/reminder-templates/route.ts` — CRUD templates (103 lignes)
- OK `src/app/api/cron/rdv-reminder/route.ts` — Cron principal (269 lignes)
- OK 3 migrations SQL deja creees

**Etat actuel**: Code complet sur master. Ce plan documente les taches de **verification, fix issues mineures, et tests** pour regulariser la story dans le pipeline.

---

## Implementation Strategy

### Approach

**Regularisation pipeline**: Le code s09 est deja sur master et fonctionnel. Ce plan se concentre sur:
1. Verification que le build compile sans erreur (code s09 specifiquement)
2. Fix des issues mineures identifiees dans la research (lieu hardcode)
3. Creation d'un test E2E basique pour le cron endpoint
4. Verification que les ACs sont tous couverts bout en bout

**Alternative rejetee**: Reecrire from scratch — rejete car code existant est complet, suit les patterns standard du projet, et couvre les 6 ACs.

### Fichiers concernes

| Fichier | Action |
|---------|--------|
| `src/app/api/cron/rdv-reminder/route.ts` | Fix lieu hardcode, verifier |
| `src/app/(dashboard)/settings/RappelsSmsTab.tsx` | Verifier, pas de modification |
| `src/app/api/settings/reminder-templates/route.ts` | Verifier, pas de modification |
| `supabase/migrations/20260811_reminder_sent_table.sql` | Verifier, pas de modification |
| `supabase/migrations/20260811_reminder_templates.sql` | Verifier, pas de modification |
| `supabase/migrations/20260811_user_settings_reminder_fields.sql` | Verifier, pas de modification |

---

## Tasks

### Task 1: Verification build et typecheck [AUDIT] ✅

**Action**:
1. Executer `npx tsc --noEmit` et verifier qu'aucune erreur ne concerne les fichiers s09
2. Executer `npm run build` et verifier que le build passe

**Fichiers a verifier**:
- `src/app/api/cron/rdv-reminder/route.ts` — pas d'erreur TS
- `src/app/(dashboard)/settings/RappelsSmsTab.tsx` — pas d'erreur TS
- `src/app/api/settings/reminder-templates/route.ts` — pas d'erreur TS

**Test**: `npx tsc --noEmit` retourne 0 erreurs dans `src/` (exclure e2e/)

**Exit criteria**: Build propre, 0 erreur TypeScript dans les fichiers s09

---

### Task 2: Fix lieu hardcode dans le cron [FIX] ✅

**File**: `src/app/api/cron/rdv-reminder/route.ts` (EDIT)

**Probleme**: Ligne 195 : `lieu: 'Mon cabinet'` est hardcode.

**Action**:
1. Ajouter un champ `cabinet_location` dans la query `user_settings` (L84-87)
2. Utiliser ce champ dans `templateData.lieu` avec fallback "Mon cabinet" si non renseigne

**Modification concrete**:
```typescript
// Dans la query user_settings (L84), ajouter cabinet_location
.select('id, reminder_delay_24h, reminder_delay_1h, reminder_enabled, cabinet_location')

// Dans templateData (L191-196), remplacer le hardcode
lieu: settingsByUser[booking.user_id]?.cabinet_location ?? 'Mon cabinet'
```

**Note**: Si la colonne `cabinet_location` n'existe pas dans `user_settings`, utiliser le fallback "Mon cabinet" sans erreur (Supabase ignore les colonnes inconnues dans le select si on utilise le client). Alternativement, ne pas modifier la query et juste documenter que c'est un TODO futur.

**Test**: Build passe, cron retourne toujours le meme resultat

**Exit criteria**: Le lieu utilise une valeur dynamique avec fallback, OU la limitation est documentee

---

### Task 3: Verification complete des 6 ACs [AUDIT] ✅

**Action**: Relire chaque AC et confirmer la couverture dans le code :

| AC# | Verification | Fichier:Ligne |
|-----|-------------|---------------|
| AC1 | Query bookings confirmed/pending + sendBrevoSms pour 24h | rdv-reminder/route.ts L59-68, L204 |
| AC2 | Fenetre 1h (shouldSend1h) + boucle remindersToSend | rdv-reminder/route.ts L150, L172-174 |
| AC3 | templateData avec nom/date/heure/lieu + Handlebars.compile | rdv-reminder/route.ts L191-200 |
| AC4 | NumInput delay24h/delay1h dans RappelsSmsTab + colonnes user_settings | RappelsSmsTab.tsx L131-165, migration L9-11 |
| AC5 | logCronRun dans cron_logs + affichage automatisations page | rdv-reminder/route.ts L219-233, automatisations/page.tsx L27 |
| AC6 | Query reminder_sent + UNIQUE constraint | rdv-reminder/route.ts L179-188, migration L33 |

**Test**: Lecture code, pas d'execution

**Exit criteria**: 6/6 ACs confirmes dans le code

---

### Task 4: Test E2E du cron endpoint [TEST] ✅

**File**: `e2e/s09-rappels-sms.spec.ts` (NEW)

**Action**: Creer un test Playwright qui :
1. Appelle `GET /api/cron/rdv-reminder` avec le header `x-cron-secret`
2. Verifie que la reponse est 200 avec `{ status: 'ok' }` ou `{ status: 'disabled' }`
3. Verifie que sans le header, la reponse est 401

**Scenarios**:
- Happy path : cron execute, retourne `processed: 0` (pas de bookings dans la fenetre)
- Auth fail : pas de header → 401
- Disabled : toggle off → `status: disabled`

**Test**: `npx playwright test --grep s09`

**Exit criteria**: Tests passent en CI local

---

### Task 5: Verification integration Settings et Automatisations [AUDIT] ✅

**Action**:
1. Confirmer que l'onglet "Rappels SMS" est present dans Settings (TABS array dans shared.tsx)
2. Confirmer que `RappelsSmsTab` est importe et rendu dans settings/page.tsx
3. Confirmer que `rdv-reminder` est liste dans la page Automatisations avec icone et description
4. Confirmer que le toggle cron fonctionne (isCronEnabled pattern)

**Fichiers a verifier**:
- `settings/shared.tsx` L28 : `{ id: 'rappels', label: 'Rappels SMS' }`
- `settings/page.tsx` L13 : import RappelsSmsTab
- `settings/page.tsx` L1970 : rendu conditionnel
- `automatisations/page.tsx` L27 : rdv-reminder dans la liste

**Test**: Lecture code uniquement

**Exit criteria**: Integration confirmee dans Settings et Automatisations

---

## Test Strategy

| Type | Scope | Outil |
|------|-------|-------|
| TypeScript check | Tous fichiers s09 | `npx tsc --noEmit` |
| Build | Projet complet | `npm run build` |
| E2E cron | Endpoint rdv-reminder | Playwright |
| Audit code | 6 ACs | Lecture manuelle |

## Risks

| Risque | Impact | Mitigation |
|--------|--------|------------|
| BREVO_API_KEY manquante en local | SMS non envoyes | Test retourne erreur propre, pas de crash |
| Table bookings vide | Cron retourne `processed: 0` | Comportement attendu, pas de RDV = rien a faire |
| Migrations non appliquees en Supabase | Tables manquantes | Verifier avec `supabase db push` ou SQL direct |
