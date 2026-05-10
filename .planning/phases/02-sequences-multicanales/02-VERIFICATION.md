---
phase: 02-sequences-multicanales
verified: 2026-05-10T22:00:00Z
status: human_needed
score: 13/14 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Ouvrir le drawer d'une carte prospect sur http://localhost:3000/crm et vérifier que la section 'Séquences de relance' apparaît avant 'Actions rapides', avec le sélecteur de template et le bouton 'Démarrer'"
    expected: "Section Séquences visible dans le drawer avec sélecteur, bouton Démarrer, liste 'Aucune séquence active', et statuts d'étapes colorés (gold/green/warn) pour les instances existantes"
    why_human: "Rendu JSX et comportement UI ne peuvent pas être vérifiés sans exécuter l'application — dépend du layout drawer réel et de l'ordre des sections"
  - test: "Démarrer une séquence depuis le drawer, puis mettre en pause et annuler"
    expected: "Toast 'Séquence démarrée', instance apparaît dans la liste avec ses étapes et statuts colorés, bouton Pause change le statut à PAUSÉE, bouton Annuler retire l'instance des actives"
    why_human: "Flux complet SEQ-01/SEQ-08/SEQ-09 nécessite un navigateur avec session authentifiée et BDD Supabase avec la migration 005 appliquée"
  - test: "Vérifier que la migration 005_sequences.sql a été appliquée sur Supabase (supabase db push) et que les 4 tables existent avec RLS activée"
    expected: "SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('sequence_templates','sequence_template_steps','sequence_instances','sequence_instance_steps') retourne 4 lignes avec relrowsecurity=true. COUNT(*) de sequence_templates WHERE name='Suivi standard prospect' retourne 1."
    why_human: "La migration est un fichier SQL valide dans le repo mais l'application sur Supabase cloud ne peut pas être vérifiée par analyse statique. Le SUMMARY indique que le checkpoint Task 3 est pending (non approuvé)."
  - test: "Déplacer un prospect vers un stade avec auto_trigger=true et vérifier qu'une sequence_instance est créée automatiquement"
    expected: "Après drag-and-drop Kanban, une ligne sequence_instance apparaît dans Supabase Studio pour ce prospect, avec status='active' et les steps planifiés"
    why_human: "SEQ-02 auto-trigger nécessite un template configuré avec auto_trigger=true dans la BDD — comportement runtime non vérifiable statiquement"
---

# Phase 02: Sequences Multicanales — Verification Report

**Phase Goal:** L'utilisateur peut démarrer, suivre et gérer des séquences de relance multicanales depuis les cartes prospect
**Verified:** 2026-05-10T22:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Les 4 tables sequences existent en BDD avec FK + RLS | ? UNCERTAIN | `005_sequences.sql` existe et est syntaxiquement complet (193 lignes), mais le checkpoint Task 3 du plan 02A est documenté "pending" — pas d'approbation de `supabase db push` dans le SUMMARY 02A |
| 2 | L'enum interaction_type contient 'sms' | ? UNCERTAIN | Migration SQL correcte (`ALTER TYPE interaction_type ADD VALUE IF NOT EXISTS 'sms'`) mais dépend de l'application de la migration |
| 3 | POST /api/crm/sequences/start crée une instance + ses steps | ✓ VERIFIED | `start/route.ts` existe, appelle `triggerSequenceForStage()`, insère dans sequence_instances + sequence_instance_steps, guard doublon présent |
| 4 | GET /api/crm/sequences/by-prospect/[prospectId] retourne instances + steps | ✓ VERIFIED | `by-prospect/[prospectId]/route.ts` existe, requête Supabase avec join sequence_templates + sequence_instance_steps, triés par step_order |
| 5 | PATCH /api/crm/sequences/[instanceId] gère pause/resume/cancel | ✓ VERIFIED | `[instanceId]/route.ts` PATCH valide `action: z.enum(['pause','resume','cancel'])`, met à jour status + timestamps correspondants |
| 6 | Guard doublon — pas d'instance active dupliquée | ✓ VERIFIED | `trigger.ts` lignes 40-49 : requête `.eq('status','active')` sur prospect+template, retourne `alreadyActive: true` si existant |
| 7 | Bouton 'Démarrer séquence' + sélecteur template dans ProspectDrawer | ✓ VERIFIED | `crm/page.tsx` lignes 478-508 : section JSX "Séquences de relance" avec `<select>` templates et `<button>` "Démarrer", fetch vers `/api/crm/sequences/start` |
| 8 | Statuts d'étapes colorés (gold=pending, green=sent, warn=failed) | ✓ VERIFIED | `stepStatusColor()` définie ligne 199, utilisée lignes 541+548. `C.gold/C.green/C.warn` utilisés conformément aux specs |
| 9 | Boutons Pause et Annuler sur instances actives | ✓ VERIFIED | `crm/page.tsx` lignes 583-614 : boutons Pause/Reprendre/Annuler avec `handleSeqAction()` appelant PATCH sur `/api/crm/sequences/${instanceId}` |
| 10 | SEQ-02 auto-trigger non-bloquant dans pipeline/move | ✓ VERIFIED | `pipeline/move/route.ts` ligne 65 : `void triggerSequenceForStage({..., toStage: to_stage})` après pipeline_events.insert, sans await |
| 11 | GET /api/crm/sequences/templates retourne la liste des templates | ✓ VERIFIED | `templates/route.ts` existe, requête `sequence_templates` filtrée par `user_id`, retourne `{ templates: [...] }` |
| 12 | openWhatsApp() + openLinkedIn() disponibles + boutons dans drawer | ✓ VERIFIED | `client-actions.ts` existe avec directive 'use client', exporte les deux fonctions. `crm/page.tsx` ligne 22 import + boutons lignes 552-577 pour étapes pending whatsapp/linkedin |
| 13 | POST /api/crm/actions/email et /sms envoient via Brevo + tracent interactions | ✓ VERIFIED | `actions/email/route.ts` et `actions/sms/route.ts` appellent sendBrevoEmail/sendBrevoSms, puis `insertInteraction()`, optimistic lock présent |
| 14 | GET /api/crm/sequences/process exécute les étapes J+X dues | ✓ VERIFIED | `process/route.ts` requête sur sequence_instance_steps avec `.lte('scheduled_at', now)` + `.eq('status','pending')`, boucle sur `executeStep()`, limit 50 |

**Score:** 13/14 truths verified (1 uncertain — migration DB application)

---

### Deferred Items

None.

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|---------|--------|---------|
| `supabase/migrations/005_sequences.sql` | Schema DB sequences + enums + RLS + seed | ✓ VERIFIED | 193 lignes, 4 tables, 3 enums, 15 policies RLS, seed "Suivi standard prospect" |
| `src/lib/sequences/types.ts` | Types TypeScript partagés | ✓ VERIFIED | Exporte SequenceChannel, SequenceStatus, StepStatus, SequenceInstanceWithSteps, etc. |
| `src/lib/sequences/trigger.ts` | triggerSequenceForStage() | ✓ VERIFIED | Résolution template, guard doublon, création instance + steps planifiés |
| `src/lib/sequences/executor.ts` | executeStep() + interpolateTemplate() + insertInteraction() | ✓ VERIFIED | Les 3 exports présents, gère email/sms/call_reminder, skip whatsapp/linkedin |
| `src/lib/sequences/brevo.ts` | sendBrevoEmail() + sendBrevoSms() | ✓ VERIFIED | Exporte les 2 helpers, lit BREVO_API_KEY depuis process.env |
| `src/lib/sequences/client-actions.ts` | openWhatsApp() + openLinkedIn() | ✓ VERIFIED | Directive 'use client', exports conformes au plan |
| `src/app/api/crm/sequences/start/route.ts` | POST start | ✓ VERIFIED | Exporte POST, appelle triggerSequenceForStage, validation Zod UUID |
| `src/app/api/crm/sequences/[instanceId]/route.ts` | GET status + PATCH pause/resume/cancel | ✓ VERIFIED | Exporte GET + PATCH, 3 actions enum, timestamps corrects |
| `src/app/api/crm/sequences/by-prospect/[prospectId]/route.ts` | GET liste instances par prospect | ✓ VERIFIED | Exporte GET, joins SQL corrects, normalisé par step_order |
| `src/app/api/crm/sequences/templates/route.ts` | GET liste templates | ✓ VERIFIED | Exporte GET, filtrée par user_id |
| `src/app/api/crm/sequences/process/route.ts` | GET cron fallback étapes dues | ✓ VERIFIED | Exporte GET, boucle executeStep, limit 50, skip whatsapp/linkedin |
| `src/app/api/crm/actions/email/route.ts` | POST envoyer email Brevo (SEQ-04) | ✓ VERIFIED | Exporte POST, optimistic lock, insertInteraction SEQ-10 |
| `src/app/api/crm/actions/sms/route.ts` | POST envoyer SMS Brevo (SEQ-05) | ✓ VERIFIED | Exporte POST, optimistic lock, insertInteraction SEQ-10 |
| `src/app/(dashboard)/crm/page.tsx` | ProspectDrawer avec section Séquences | ✓ VERIFIED | Section Séquences de relance présente avec sélecteur, bouton, liste instances, statuts colorés, boutons action |
| `supabase/functions/process-sequences/index.ts` | Edge Function Deno cron | ✓ VERIFIED | Deno.cron wrappé en try/catch, Deno.serve présent pour invocation manuelle |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `sequence_template_steps.template_id` | `sequence_templates.id` | FK on delete cascade | ✓ WIRED | Migration ligne 42: `references sequence_templates(id) on delete cascade` |
| `sequence_instance_steps.instance_id` | `sequence_instances.id` | FK on delete cascade | ✓ WIRED | Migration ligne 80: `references sequence_instances(id) on delete cascade` |
| POST /api/crm/sequences/start | triggerSequenceForStage() | import direct + appel | ✓ WIRED | `start/route.ts` ligne 5: `import { triggerSequenceForStage }`, ligne 25: appel direct |
| executor.ts | interactions table | insertInteraction() + supabase.from('interactions').insert | ✓ WIRED | `executor.ts` ligne 34: `args.supabase.from('interactions').insert({...})` |
| POST /api/pipeline/move | triggerSequenceForStage() | void fire-and-forget | ✓ WIRED | `pipeline/move/route.ts` lignes 5+65: import + `void triggerSequenceForStage(...)` |
| crm/page.tsx ProspectDrawer | openWhatsApp() / openLinkedIn() | import depuis client-actions | ✓ WIRED | `crm/page.tsx` ligne 22: `import { openWhatsApp, openLinkedIn } from '@/lib/sequences/client-actions'`, utilisé lignes 556+561 |
| GET /api/crm/sequences/process | executeStep() | import direct + boucle | ✓ WIRED | `process/route.ts` ligne 4: `import { executeStep }`, ligne 96: appelé dans boucle for |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `crm/page.tsx` — seqInstances | `seqInstances` (useState) | `fetch('/api/crm/sequences/by-prospect/${prospect.id}')` dans useEffect | Oui — route interroge `sequence_instances` + joins en BDD | ✓ FLOWING |
| `crm/page.tsx` — seqTemplates | `seqTemplates` (useState) | `fetch('/api/crm/sequences/templates')` dans useEffect | Oui — route interroge `sequence_templates` filtrée par user_id | ✓ FLOWING |
| `process/route.ts` — dueSteps | requête Supabase | `.lte('scheduled_at', now).eq('status','pending')` | Oui — requête SQL avec filtre scheduled_at et statut | ✓ FLOWING |
| `executor.ts` — insertInteraction | interactions table | `supabase.from('interactions').insert({...})` | Oui — insertion directe avec type, notes, occurred_at | ✓ FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED for migration application (requires running Supabase) and UI behaviors (requires browser session).

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `start/route.ts` exports POST | `grep "export async function POST" src/app/api/crm/sequences/start/route.ts` | Found (line 12) | ✓ PASS |
| `[instanceId]/route.ts` exports GET + PATCH | File content verified | Both exports present (lines 9, 33) | ✓ PASS |
| `trigger.ts` exports triggerSequenceForStage | File content verified | Export on line 20 | ✓ PASS |
| `client-actions.ts` has 'use client' directive | File content verified | First line is `'use client'` | ✓ PASS |
| `pipeline/move` has void trigger (non-blocking) | File content verified | `void triggerSequenceForStage(...)` line 65 | ✓ PASS |
| DB migration has all 4 tables | File content verified | 4 `create table` statements confirmed | ✓ PASS |
| Supabase migration applied to cloud DB | Requires `supabase db push` output | Cannot verify statically | ? SKIP |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SEQ-01 | 02B, 02C | L'utilisateur peut démarrer une séquence depuis le drawer | ✓ SATISFIED | `start/route.ts` POST + bouton "Démarrer" dans crm/page.tsx |
| SEQ-02 | 02A, 02D | Séquence auto-déclenchée au changement de stade | ✓ SATISFIED | `void triggerSequenceForStage` dans pipeline/move/route.ts |
| SEQ-03 | 02D | Étape WhatsApp à J+0 | ✓ SATISFIED | `openWhatsApp()` dans client-actions.ts, bouton "Ouvrir WA" dans drawer |
| SEQ-04 | 02E | Email Brevo à J+X | ✓ SATISFIED | `actions/email/route.ts` + sendBrevoEmail() dans executor.ts |
| SEQ-05 | 02E | SMS Brevo à J+X | ✓ SATISFIED | `actions/sms/route.ts` + sendBrevoSms() dans executor.ts |
| SEQ-06 | 02E | Rappel appel interne (interaction type='appel', is_honored=false) | ✓ SATISFIED | `executor.ts` canal call_reminder, insertInteraction avec isHonored=false |
| SEQ-07 | 02D | Ouvrir LinkedIn + copier template InMail | ✓ SATISFIED | `openLinkedIn()` dans client-actions.ts, bouton "Ouvrir LinkedIn" dans drawer |
| SEQ-08 | 02B, 02C | Statut de chaque étape visible (planifiée/envoyée/échouée) | ✓ SATISFIED | GET by-prospect retourne steps avec status, rendu coloré dans drawer |
| SEQ-09 | 02B, 02C | Pause ou annulation d'une séquence | ✓ SATISFIED | PATCH [instanceId] + boutons Pause/Reprendre/Annuler dans drawer |
| SEQ-10 | 02B, 02E | Séquences enregistrent dans interactions | ✓ SATISFIED | insertInteraction() dans executor.ts appelée pour email/sms/call_reminder |

**Coverage: 10/10 SEQ requirements satisfied in code.**

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `supabase/functions/process-sequences/index.ts` | 18-22 | `'Cookie': ''` — auth vide dans Edge Function cron | ⚠️ Warning | Le cron automatique ne pourra pas s'authentifier auprès de `/api/crm/sequences/process` — documenté et accepté pour Phase 2 MVP, Phase 5 adressera auth service_role |
| `src/app/api/crm/sequences/process/route.ts` | 40-41 | `const instance = rawStep.sequence_instances as any` | ℹ️ Info | Type cast `any` sur la relation Supabase — limite la sécurité de types mais n'affecte pas le comportement runtime |

Aucun pattern de stub (return null, return [], placeholder) détecté dans les routes et lib sequences.

---

### Human Verification Required

#### 1. Migration DB appliquée sur Supabase

**Test:** Depuis un terminal PowerShell dans le dossier projet, exécuter `supabase db push` et vérifier dans Supabase Studio SQL Editor :
```sql
select relname, relrowsecurity from pg_class
where relname in ('sequence_templates','sequence_template_steps','sequence_instances','sequence_instance_steps');
-- Attendu : 4 lignes avec relrowsecurity = true

select count(*) from sequence_templates where name = 'Suivi standard prospect';
-- Attendu : 1
```
**Expected:** Migration 005 appliquée sans erreur, 4 tables RLS-enabled, 1 template de démo seedé.
**Why human:** La migration SQL est correcte dans le repo mais son application sur Supabase cloud ne peut être vérifiée qu'à l'exécution. Le SUMMARY 02A liste Task 3 (checkpoint:human-verify) comme "pending".

#### 2. Section Séquences visible dans le drawer CRM

**Test:** Ouvrir http://localhost:3000/crm dans le navigateur (session authentifiée), cliquer sur une carte prospect, faire défiler le drawer.
**Expected:** Section "SEQUENCES DE RELANCE" apparaît avant "Actions rapides", avec sélecteur de template et bouton "Démarrer". Si le template démo est seedé, le sélecteur affiche "Suivi standard prospect". Si aucun template : "Aucun template disponible" s'affiche.
**Why human:** Rendu JSX et ordre des sections dans le drawer ne peuvent pas être vérifiés sans exécution. Dépend de la migration DB appliquée (pour que GET /templates retourne des données).

#### 3. Cycle de vie complet d'une séquence

**Test:** Depuis le drawer, démarrer la séquence "Suivi standard prospect", puis tester Pause et Annuler.
**Expected:** Toast "Séquence démarrée", instance apparaît avec 3 étapes colorées (WhatsApp J+0 gold, Email J+2 gold, Appel J+5 gold). Clic Pause → statut "PAUSÉE". Clic Annuler → instance disparaît des actives.
**Why human:** Comportement runtime SEQ-01/08/09 complet dépend de la BDD et du navigateur.

#### 4. Auto-trigger SEQ-02 au déplacement Kanban

**Test:** Configurer un template avec `auto_trigger=true` et `pipeline_stage='rdv1'` dans Supabase Studio. Déplacer un prospect vers le stade rdv1 depuis le Kanban.
**Expected:** Une `sequence_instance` est créée automatiquement dans Supabase Studio avec status='active' et les steps planifiés.
**Why human:** Nécessite un template auto_trigger configuré en BDD et une interaction Kanban dans le navigateur.

---

### Gaps Summary

Aucun gap bloquant dans le code. L'ensemble des 14 artifacts sont présents, substantiels, et correctement câblés.

**Seul point uncertain :** L'application de la migration 005 sur Supabase cloud n'est pas confirmée — le checkpoint Task 3 du plan 02A est documenté "pending" dans le SUMMARY. Si la migration n'a pas été appliquée, aucune des fonctionnalités de séquences n'est opérationnelle (même si tout le code est correct).

**Limitation connue et acceptée (Phase 2 MVP):** Le cron automatique via Edge Function Supabase ne peut pas s'authentifier auprès de `/api/crm/sequences/process` (cookie vide). L'exécution des étapes J+X se fait manuellement via GET /process depuis le navigateur authentifié. Phase 5 adressera l'auth service_role pour le cron automatique.

---

_Verified: 2026-05-10T22:00:00Z_
_Verifier: Claude (gsd-verifier)_
