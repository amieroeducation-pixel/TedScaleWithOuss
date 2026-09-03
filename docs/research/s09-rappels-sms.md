# s09-rappels-sms — Research

**Researched:** 2026-09-03
**Domain:** Rappels SMS automatiques avant RDV via cron + Brevo API
**Confidence:** HIGH

## Summary

Research de la story s09-rappels-sms revele que **l'implementation est deja complete et sur master**. Le code couvre les 6 ACs de la story :

- Cron `/api/cron/rdv-reminder` qui verifie les RDV a venir et envoie les SMS via Brevo
- Deux types de rappels : 24h et 1h avant le RDV, avec fenetres de tolerance
- Templates SMS personnalisables avec variables Handlebars (`{{nom}}`, `{{date}}`, `{{heure}}`, `{{lieu}}`)
- Delais configurables dans Settings (onglet "Rappels SMS" dans `RappelsSmsTab.tsx`)
- Anti-doublon via table `reminder_sent` avec contrainte unique `(booking_id, reminder_type)`
- Logs dans `cron_logs` visibles dans la page Automatisations

**Etat actuel :** Le boilerplate est complet : 3 fichiers principaux (RappelsSmsTab.tsx, reminder-templates/route.ts, rdv-reminder/route.ts), 3 migrations SQL (reminder_sent, reminder_templates, user_settings_reminder_fields), integration dans Settings et Automatisations.

**Enjeu principal :** Cette story n'a PAS besoin d'implementation from scratch. Elle necessite :
1. **Verification build** — s'assurer que `tsc --noEmit` et `npm run build` passent
2. **Audit des ACs** — verifier que chaque AC est reellement couvert et fonctionnel
3. **Tests E2E** — creer des scenarios de test pour valider le comportement
4. **Polissage** — corriger les edge cases detectes (lieu hardcode, RLS cron insert)

**Primary recommendation:** Audit qualite du code existant, verification build, creation tests, puis regularisation pipeline (plan + review + ship).

---

## Existing Implementation (Current State)

### Fichiers crees

| Fichier | Lignes | Status | Notes |
|---------|--------|--------|-------|
| `src/app/(dashboard)/settings/RappelsSmsTab.tsx` | 284 | OK Complet | UI config activation/delais/templates |
| `src/app/api/settings/reminder-templates/route.ts` | 103 | OK Complet | GET/POST templates SMS (CRUD Supabase) |
| `src/app/api/cron/rdv-reminder/route.ts` | 269 | OK Complet | Cron principal : check bookings, envoi SMS, anti-doublon |
| `supabase/migrations/20260811_reminder_sent_table.sql` | 81 | OK Migre | Table + enum + RLS + fonction is_reminder_sent() |
| `supabase/migrations/20260811_reminder_templates.sql` | 79 | OK Migre | Table + RLS + trigger updated_at |
| `supabase/migrations/20260811_user_settings_reminder_fields.sql` | 19 | OK Migre | ALTER user_settings + 3 colonnes reminder |

### Integration dans le dashboard existant

| Composant | Fichier | Integration | Notes |
|-----------|---------|-------------|-------|
| Onglet Settings | `settings/shared.tsx` L28 | `{ id: 'rappels', label: 'Rappels SMS' }` dans TABS | OK |
| Rendu onglet | `settings/page.tsx` L1970 | `{activeTab === 'rappels' && <RappelsSmsTab .../>}` | OK |
| Automatisations | `automatisations/page.tsx` L27 | `rdv-reminder` dans liste crons avec icone/description | OK |
| Cron toggle | `lib/cron/toggles.ts` | `isCronEnabled('rdv-reminder')` dans le cron | OK |

---

## Architecture Patterns

### System Flow

```
[Cron externe (Cloud Scheduler / Task Scheduler)]
          |
          | GET /api/cron/rdv-reminder
          | Header: x-cron-secret
          v
[verifyCronSecret()] ----[401 si invalide]
          |
          v
[isCronEnabled('rdv-reminder')] ----[200 disabled si off]
          |
          v
[Query bookings table]
  - status IN ('confirmed', 'pending')
  - scheduled_at BETWEEN now() AND now()+25h
          |
          v
[Group par user_id]
  - Fetch reminder_templates par user
  - Fetch user_settings (delays + enabled)
          |
          v
[Pour chaque booking:]
  - Check user reminder_enabled
  - Calcul fenetre 24h (±1h) et 1h (±12min)
  - Skip si hors fenetre
  - Skip si pas de telephone
          |
          v
[Pour chaque type de rappel a envoyer:]
  - Query reminder_sent (anti-doublon)
  - Skip si deja envoye
  - Compile template Handlebars
  - sendBrevoSms() via Brevo API
  - INSERT reminder_sent (tracking)
  - logCronRun() dans cron_logs
          |
          v
[Return: { processed, bookingsChecked, errors }]
```

### Component Responsibilities

| Fichier | Responsabilite | Dependances |
|---------|----------------|-------------|
| `cron/rdv-reminder/route.ts` | Orchestration cron : fetch bookings, calcul fenetres, envoi SMS, tracking | Supabase (bookings, reminder_sent, reminder_templates, user_settings), Brevo SMS, cron auth/logger |
| `settings/RappelsSmsTab.tsx` | UI configuration : toggle on/off, delais, templates editables | API `/api/settings` (PATCH), API `/api/settings/reminder-templates` (GET/POST) |
| `settings/reminder-templates/route.ts` | CRUD templates SMS par user (GET + POST/upsert) | Supabase `reminder_templates` table |
| `lib/sequences/brevo.ts` | Wrapper Brevo SMS API (`sendBrevoSms`) | `BREVO_API_KEY` env var |
| `lib/cron/auth.ts` | Verification secret cron (`verifyCronSecret`) | `CRON_SECRET` env var |
| `lib/cron/toggles.ts` | Toggle activation cron par job name | Supabase `user_settings.message_templates._cron_toggles` |
| `lib/cron/logger.ts` | Log chaque execution cron | Supabase `cron_logs` table |

---

## Acceptance Criteria Mapping

| AC# | Description | Implementation | Status |
|-----|-------------|----------------|--------|
| AC1 | Cron verifie RDV et envoie SMS 24h avant via Brevo | `rdv-reminder/route.ts` L59-68 (query bookings) + L204-206 (sendBrevoSms) | OK Code present |
| AC2 | Second rappel 1h avant | `rdv-reminder/route.ts` L147-150 (fenetre 1h avec marge ±12min) | OK Code present |
| AC3 | Contenu personnalise (Prenom, date, heure, lieu) | `rdv-reminder/route.ts` L191-196 (templateData) + L200 (Handlebars.compile) | OK Code present, lieu hardcode "Mon cabinet" |
| AC4 | Delai configurable dans Settings | `RappelsSmsTab.tsx` L131-177 (NumInput delay24h/delay1h) + `user_settings_reminder_fields.sql` | OK Code present |
| AC5 | Log visible dans Automatisations | `rdv-reminder/route.ts` L219-233 (logCronRun) + `automatisations/page.tsx` L27 | OK Code present |
| AC6 | Anti-doublon | `rdv-reminder/route.ts` L179-188 (query reminder_sent) + `reminder_sent_table.sql` L33 (UNIQUE constraint) | OK Double protection (query + constraint) |

---

## Current Gaps & Issues

### 1. Lieu hardcode "Mon cabinet"

**Probleme :** `rdv-reminder/route.ts` L195 : `lieu: 'Mon cabinet'` — hardcode, pas configurable.

**Impact :** AC3 mentionne `{lieu}` comme variable, mais la valeur n'est pas dynamique.

**Solution :** Ajouter un champ `cabinet_address` ou `lieu_rdv` dans `user_settings`, et le lire dans le cron.

**Priorite :** Basse — fonctionnel, juste pas configurable.

### 2. RLS policy reminder_sent trop permissive pour insert

**Probleme :** `reminder_sent_table.sql` L58 : `with check (true)` pour insert = n'importe qui peut inserer.

**Impact :** Le cron utilise le service role (createSupabaseCronClient), donc le RLS n'est pas un probleme en pratique (service role bypass RLS). Mais la policy est trop large si un client direct tentait un insert.

**Solution :** La policy INSERT devrait etre `with check (auth.uid() = user_id)` OU retiree entierement (seul le service role insere via le cron).

**Priorite :** Basse — le service role bypass RLS de toute facon.

### 3. Migration execution order

**Probleme :** Les 3 migrations ont le meme prefixe `20260811_`. L'enum `reminder_type` est defini dans `reminder_sent_table.sql` mais utilise dans `reminder_templates.sql` (colonne `template_type reminder_type`). L'ordre d'execution des migrations depend du nom alphabetique.

**Verification :** `reminder_sent_table.sql` < `reminder_templates.sql` alphabetiquement → OK, l'enum est cree avant d'etre utilise.

**Priorite :** Aucune action requise — l'ordre est correct.

### 4. Fenetre de tolerance asymetrique

**Probleme :** Le rappel 24h a une marge de ±1h, le rappel 1h a une marge de ±12min (0.2h). Si le cron tourne toutes les heures, un rappel 1h pourrait etre manque si le cron tombe entre les fenetres.

**Impact :** Si le cron tourne toutes les 30min ou plus frequemment, pas de probleme. Si toutes les heures, le rappel 1h pourrait etre rate.

**Solution :** Documenter la frequence minimale du cron (toutes les 15-30min recommande).

**Priorite :** Moyenne — impact operationnel si cron mal configure.

### 5. Pas de tests automatises

**Probleme :** Aucun test unitaire ni E2E pour la fonctionnalite rappels SMS.

**Impact :** Pas de regression detection.

**Solution :** Creer des tests pour le cron endpoint (mock Brevo + Supabase).

**Priorite :** Moyenne — necessaire pour la review.

---

## Dependencies

### Existantes et verifiees

| Dependance | Source | Status |
|------------|--------|--------|
| Table `bookings` (s08) | `supabase/migrations/20260811_bookings_table.sql` | OK Migree |
| `sendBrevoSms()` | `src/lib/sequences/brevo.ts` L39-70 | OK Operationnel |
| `verifyCronSecret()` | `src/lib/cron/auth.ts` | OK Pattern cron standard |
| `logCronRun()` | `src/lib/cron/logger.ts` | OK Pattern cron standard |
| `isCronEnabled()` | `src/lib/cron/toggles.ts` | OK Toggle par job name |
| `apiSuccess/apiError` | `src/lib/api.ts` | OK Helpers standard |
| `date-fns` + `fr` locale | Package npm | OK Utilise pour formatage dates |
| `handlebars` | Package npm | OK Compile templates SMS |
| `BREVO_API_KEY` | Env var | A verifier en prod |
| `CRON_SECRET` | Env var | A verifier en prod |

---

## Sources

### Primary (HIGH confidence)

- **Codebase actuel** — tous fichiers lus directement
- **Migrations SQL** — `supabase/migrations/20260811_*.sql` verifiees
- **Story definition** — `docs/stories.md` s09-rappels-sms ACs

### Secondary (MEDIUM confidence)

- **Story review** — `docs/reviews/stories.md` confirme s09 dans perimeter, validated
- **Research s08** — `docs/research/s08-booking-page.md` documente table bookings

---

## Metadata

**Research scope:**
- Core technology: Next.js 15 API routes, Supabase, Brevo SMS API
- Ecosystem: date-fns, Handlebars, cron auth/logger pattern
- Patterns: Anti-doublon (query + unique constraint), fenetre de tolerance, templates configurables
- Pitfalls: Lieu hardcode, frequence cron, RLS trop permissive

**Confidence breakdown:**
- Current implementation: HIGH — code lu entierement, pattern cron standard
- Architecture: HIGH — migrations + RLS + enum + contraintes verifiees
- AC coverage: HIGH — 6/6 ACs couverts dans le code
- Gaps: HIGH — 5 issues mineures documentees

**Research date:** 2026-09-03
**Valid until:** 2026-10-03 (30 jours — stack stable)

---

*Story: s09-rappels-sms*
*Research completed: 2026-09-03*
*Ready for planning: yes*
*Implementation status: Code complet sur master, besoin verification build + tests + regularisation pipeline*
