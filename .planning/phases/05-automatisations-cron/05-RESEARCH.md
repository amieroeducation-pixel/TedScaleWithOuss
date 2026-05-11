# Phase 5: Automatisations Cron - Research

**Researched:** 2026-05-11
**Domain:** Supabase Edge Functions / Deno.cron / Brevo API / Next.js Route Handlers (cron-triggered)
**Confidence:** HIGH

## Summary

Cette phase ajoute 4 automatisations sans action manuelle : rapport hebdomadaire email (AUTO-01), alertes Client Health quotidiennes (AUTO-02), rappel WhatsApp RDV J-1 (AUTO-03), et alerte CA sous seuil (AUTO-04). L'app tourne en local sur Windows -- les Edge Functions Supabase avec `Deno.cron` ne fonctionnent pas localement de maniere fiable. La strategie recommandee est d'implementer toute la logique metier dans des **Route Handlers Next.js** (pattern deja en place avec `/api/crm/sequences/process`) et de les declencher via **Windows Task Scheduler** en local, avec migration facile vers `pg_cron` + `pg_net` quand l'app sera deployee sur Supabase hosted.

L'envoi email Brevo est deja operationnel (`src/lib/sequences/brevo.ts` avec `sendBrevoEmail` et `sendBrevoSms`). Les donnees necessaires (CA mensuel, health alerts, RDV) sont toutes accessibles via des API routes existantes ou des RPC Supabase en place. Le WhatsApp Business API n'est **pas encore implemente** -- le canal whatsapp est `client-only` (window.open) dans les sequences Phase 2. AUTO-03 necessitera soit un helper serveur WhatsApp Business Cloud API, soit un fallback SMS/email.

**Primary recommendation:** Creer 4 Route Handlers protegees par un header `x-cron-secret`, reutiliser `sendBrevoEmail`/`sendBrevoSms` existants, declencher via Task Scheduler Windows (`curl localhost:3000/api/cron/...`). Table `cron_logs` pour historique.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTO-01 | Rapport hebdomadaire email Brevo chaque lundi 8h | `sendBrevoEmail` existant + donnees CA via `/api/revenue/stats` + health alerts via `get_client_health_alerts` RPC |
| AUTO-02 | Alertes Client Health quotidiennes (email/SMS) si client depasse seuil inactivite | `get_client_health_alerts` RPC existante + `sendBrevoEmail`/`sendBrevoSms` existants + seuil dans `user_settings.client_health_threshold_days` |
| AUTO-03 | Rappel WhatsApp J-1 avant chaque RDV | RDV recuperables via table `interactions` (type in rdv1/rdv2/rdv3) + `occurred_at` > demain. WhatsApp Business Cloud API non implemente -- fallback SMS recommande |
| AUTO-04 | Alerte si CA mensuel < seuil defini | CA mensuel via `v_monthly_revenue` view + seuil via `user_settings.ca_monthly_target` |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Rapport hebdo (AUTO-01) | API / Backend (Route Handler) | -- | Agregation donnees + envoi email = logique serveur pure |
| Alertes Client Health (AUTO-02) | API / Backend (Route Handler) | -- | RPC Supabase + envoi email/SMS = serveur |
| Rappel RDV J-1 (AUTO-03) | API / Backend (Route Handler) | -- | Query interactions + envoi WhatsApp/SMS = serveur |
| Alerte CA < seuil (AUTO-04) | API / Backend (Route Handler) | -- | Query revenue view + envoi email = serveur |
| Declenchement cron | OS (Task Scheduler) | pg_cron (futur deploiement) | App locale Windows = Task Scheduler ; deploye = pg_cron |
| Historique executions | Database (cron_logs table) | Frontend (page /automatisations) | Persistence BDD, affichage sur page existante |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js Route Handlers | 15.x | Logique cron endpoints | Deja en place partout dans le projet [VERIFIED: codebase] |
| Brevo REST API v3 | v3 | Envoi email + SMS transactionnels | `sendBrevoEmail` / `sendBrevoSms` deja implementes dans `src/lib/sequences/brevo.ts` [VERIFIED: codebase] |
| Supabase JS Client | existant | Requetes BDD (service_role pour cron) | `createSupabaseServiceClient` existe dans `src/lib/supabase/server.ts` [VERIFIED: codebase] |
| date-fns | existant | Calculs dates (J-1, debut semaine) | Deja utilise dans `/api/today/signal/route.ts` [VERIFIED: codebase] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Windows Task Scheduler | natif Windows | Declenchement cron local | Toutes les automatisations en mode local [VERIFIED: platform win32] |
| node-fetch / curl | natif | Appel HTTP vers localhost | Task Scheduler execute `curl http://localhost:3000/api/cron/...` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Task Scheduler Windows | Supabase Edge Functions + Deno.cron | Deno.cron ne fonctionne pas localement de maniere fiable ; Edge Functions necessitent Docker + Supabase CLI serve [CITED: github.com/orgs/supabase/discussions/14747] |
| Task Scheduler Windows | pg_cron + pg_net (Supabase hosted) | Necessite deploiement Supabase hosted -- hors scope v1 (local first) [CITED: supabase.com/docs/guides/functions/schedule-functions] |
| Task Scheduler Windows | node-cron dans le processus Next.js | Fragile -- perd le schedule si le serveur Next.js redemarre ; pas de separation de responsabilite |

## Architecture Patterns

### System Architecture Diagram

```
Windows Task Scheduler (crontab local)
    |
    | curl -H "x-cron-secret: XXX" http://localhost:3000/api/cron/{job}
    |
    v
Next.js Route Handler (/api/cron/weekly-report)
    |
    +---> createSupabaseServiceClient() (bypass RLS)
    |        |
    |        +---> user_settings (seuils, email destinataire)
    |        +---> v_monthly_revenue (CA)
    |        +---> get_client_health_alerts() (alertes)
    |        +---> interactions (RDV J-1)
    |
    +---> sendBrevoEmail() / sendBrevoSms()
    |        |
    |        +---> api.brevo.com/v3/smtp/email
    |        +---> api.brevo.com/v3/transactionalSMS/sms
    |
    +---> INSERT cron_logs (historique execution)
    |
    v
Response JSON { status, processed, errors }
```

### Recommended Project Structure

```
src/app/api/cron/
  weekly-report/route.ts      # AUTO-01 : rapport hebdo lundi 8h
  client-health/route.ts      # AUTO-02 : alertes quotidiennes
  rdv-reminder/route.ts       # AUTO-03 : rappel RDV J-1
  revenue-alert/route.ts      # AUTO-04 : alerte CA < seuil

src/lib/cron/
  auth.ts                     # Verification x-cron-secret header
  report-builder.ts           # Construction HTML rapport hebdo
  logger.ts                   # Insert cron_logs + helper status

supabase/migrations/
  007_cron_logs.sql            # Table cron_logs + notification_preferences
```

### Pattern 1: Route Handler Cron avec Auth par Secret

**What:** Chaque cron est un Route Handler GET protege par un header `x-cron-secret`.
**When to use:** Toutes les routes `/api/cron/*`
**Example:**
```typescript
// Source: pattern existant supabase/functions/process-sequences/index.ts
import { NextRequest } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase/server'
import { apiSuccess, apiError } from '@/lib/api'

const CRON_SECRET = process.env.CRON_SECRET ?? ''

export async function GET(req: NextRequest) {
  // Auth par secret -- pas de cookie session (appel depuis Task Scheduler)
  const secret = req.headers.get('x-cron-secret')
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return apiError('Unauthorized', 401)
  }

  // Service role -- bypass RLS pour acceder a tous les users
  const supabase = await createSupabaseServiceClient()

  // ... logique metier ...

  return apiSuccess({ status: 'ok', processed: 1 })
}
```

### Pattern 2: Service Role Client pour Cron (bypass RLS)

**What:** Les crons n'ont pas de session utilisateur -- utiliser `createSupabaseServiceClient()` qui bypass RLS.
**When to use:** Toutes les requetes BDD dans les routes cron.
**Example:**
```typescript
// Source: src/lib/supabase/server.ts -- deja implemente
const supabase = await createSupabaseServiceClient()

// Recuperer TOUS les users avec leurs settings
const { data: users } = await supabase
  .from('user_settings')
  .select('id, ca_monthly_target, client_health_threshold_days')

// Pour chaque user, executer la logique
for (const user of users ?? []) {
  // ...
}
```

### Pattern 3: Declenchement Task Scheduler Windows

**What:** Script `.bat` appele par Task Scheduler Windows pour trigger les crons.
**When to use:** Chaque automatisation planifiee.
**Example:**
```batch
@echo off
REM cron-weekly-report.bat -- lundi 8h
curl -s -H "x-cron-secret: %CRON_SECRET%" http://localhost:3000/api/cron/weekly-report
```

### Anti-Patterns to Avoid

- **Deno.cron en local** : ne fonctionne pas de maniere fiable sans `supabase functions serve` (Docker requis). Le pattern existant dans `process-sequences/index.ts` a un try/catch qui le confirme [VERIFIED: codebase].
- **node-cron dans Next.js** : risque de perte du schedule au redemarrage serveur. Les Route Handlers sont stateless et re-invocables.
- **Cookie auth pour les crons** : les crons n'ont pas de session navigateur. Utiliser `x-cron-secret` + `service_role` client.
- **Appel direct Brevo depuis Edge Function** : ajoute une couche Deno inutile quand les helpers existent deja en Node.js/Next.js.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Envoi email transactionnel | Client SMTP maison | `sendBrevoEmail()` existant | Gere retries, rate limiting, deliverabilite [VERIFIED: codebase] |
| Envoi SMS | Integration telco directe | `sendBrevoSms()` existant | API unifiee Brevo email+SMS [VERIFIED: codebase] |
| Alertes client health | Query SQL manuelle | `get_client_health_alerts()` RPC | Deja implemente avec seuils par client [VERIFIED: 003_functions.sql] |
| CA mensuel | Calcul maison | `v_monthly_revenue` view | Join contracts + objectives deja fait [VERIFIED: 003_functions.sql] |
| Template interpolation | Regex maison | `interpolateTemplate()` existant | Gere {{nom}}, {{prenom}}, {{telephone}}, {{email}}, {{stade}} [VERIFIED: executor.ts] |

**Key insight:** 80% de l'infrastructure existe deja. Les crons sont principalement de l'orchestration (fetch data -> format -> send) et non de la logique nouvelle.

## Common Pitfalls

### Pitfall 1: Auth Cookie impossible pour les crons

**What goes wrong:** `createSupabaseServerClient()` necessite un cookie de session (via `cookies()` de Next.js). Les crons appeles par Task Scheduler n'ont pas de session navigateur.
**Why it happens:** Le pattern existant dans `/api/crm/sequences/process` utilise `createSupabaseServerClient()` avec auth user -- ca marche seulement quand un utilisateur authentifie appelle la route depuis le navigateur.
**How to avoid:** Utiliser `createSupabaseServiceClient()` (service_role key) pour les routes cron. Proteger par `x-cron-secret` header au lieu d'une session cookie.
**Warning signs:** `getUser()` retourne `null` dans les logs cron.

### Pitfall 2: RDV J-1 -- les RDV sont dans `interactions`, pas dans une table dediee

**What goes wrong:** Chercher les RDV dans une table `appointments` qui n'existe pas.
**Why it happens:** Le schema utilise la table `interactions` avec `type IN ('rdv1','rdv2','rdv3')` et la colonne `occurred_at` comme date de RDV [VERIFIED: today/signal/route.ts].
**How to avoid:** Query `interactions` filtree sur type rdv + `occurred_at` entre demain 00:00 et demain 23:59.
**Warning signs:** Les RDV futurs sont dans `occurred_at` -- c'est le champ de planification ET d'execution.

### Pitfall 3: WhatsApp Business API non implemente

**What goes wrong:** AUTO-03 demande un "rappel WhatsApp" mais l'envoi WhatsApp serveur n'existe pas -- le canal `whatsapp` est `client-only` (window.open dans le navigateur).
**Why it happens:** Phase 2 a explicitement marque WhatsApp comme "canal client-only" [VERIFIED: executor.ts ligne 60].
**How to avoid:** Deux options :
  1. **Fallback SMS** : envoyer le rappel RDV par SMS Brevo (deja implemente)
  2. **WhatsApp Business Cloud API** : implementer un helper `sendWhatsApp()` qui appelle `https://graph.facebook.com/v21.0/{phone_number_id}/messages` -- necessite `WHATSAPP_PHONE_NUMBER_ID` et `WHATSAPP_ACCESS_TOKEN` declares dans env.ts mais non utilises [VERIFIED: env.ts]
**Warning signs:** `env.ts` declare `WHATSAPP_PHONE_NUMBER_ID` et `WHATSAPP_ACCESS_TOKEN` comme optionnels -- leur absence ne crashe pas l'app.

### Pitfall 4: Email du CGP (destinataire rapport) -- ou le trouver ?

**What goes wrong:** Le rapport hebdo doit etre envoye AU CGP, mais `user_settings` ne stocke pas l'email du user.
**Why it happens:** L'email est dans `auth.users.email`, pas dans `user_settings`.
**How to avoid:** Avec `service_role`, faire `supabase.auth.admin.getUserById(user_id)` pour recuperer l'email.
**Warning signs:** Ne pas confondre `BREVO_SENDER_EMAIL` (expediteur) avec l'email destinataire (le CGP).

### Pitfall 5: BREVO_SENDER_EMAIL dans process.env, pas dans user_settings

**What goes wrong:** Chercher la cle Brevo dans `user_settings.brevo_api_key` alors qu'elle est dans `.env.local`.
**Why it happens:** `user_settings` a un champ `brevo_api_key` dans le schema SQL, mais le code existant utilise exclusivement `process.env.BREVO_API_KEY` [VERIFIED: brevo.ts].
**How to avoid:** Garder le meme pattern que `brevo.ts` existant -- `process.env.BREVO_API_KEY` et `process.env.BREVO_SENDER_EMAIL`.

### Pitfall 6: `createSupabaseServiceClient` utilise encore `cookies()`

**What goes wrong:** Meme avec service_role, la fonction actuelle appelle `cookies()` -- or les routes cron appelees via curl n'ont pas de cookie store Next.js.
**Why it happens:** `createSupabaseServiceClient()` dans `server.ts` utilise le pattern cookie identique au client normal [VERIFIED: server.ts ligne 29-52].
**How to avoid:** Creer un helper `createSupabaseCronClient()` sans dependency sur `cookies()` -- utiliser `createClient` de `@supabase/supabase-js` directement avec les variables d'env.

## Code Examples

### Helper Cron Client (sans cookies)

```typescript
// Source: adaptation de src/lib/supabase/server.ts pour cron
// src/lib/supabase/cron-client.ts
import { createClient } from '@supabase/supabase-js'

export function createSupabaseCronClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
```

### Verification Header Cron Secret

```typescript
// src/lib/cron/auth.ts
import { NextRequest } from 'next/server'
import { apiError } from '@/lib/api'

export function verifyCronSecret(req: NextRequest) {
  const expected = process.env.CRON_SECRET
  if (!expected) return null // pas de secret configure = pas de protection
  const provided = req.headers.get('x-cron-secret')
  if (provided !== expected) {
    return apiError('Cron unauthorized', 401)
  }
  return null // OK
}
```

### Construction HTML Rapport Hebdo

```typescript
// src/lib/cron/report-builder.ts
export function buildWeeklyReportHtml(data: {
  caWeek: number
  caMonth: number
  caObjective: number
  healthAlerts: Array<{ full_name: string; days_without_contact: number; severity: string }>
  relancesDues: number
  rdvSemaine: number
}): string {
  const pctObjective = data.caObjective > 0
    ? Math.round((data.caMonth / data.caObjective) * 100)
    : 0

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#e5e5e5;padding:24px;">
      <h1 style="color:#c9a84c;font-size:22px;">Rapport Hebdomadaire - Ted CGP</h1>
      <h2 style="color:#c9a84c;font-size:16px;">CA du mois</h2>
      <p>${data.caMonth.toLocaleString('fr-FR')} EUR / ${data.caObjective.toLocaleString('fr-FR')} EUR (${pctObjective}%)</p>
      <h2 style="color:#c9a84c;font-size:16px;">Alertes Clients</h2>
      ${data.healthAlerts.length === 0
        ? '<p style="color:#4ade80;">Aucune alerte - Tout est OK</p>'
        : data.healthAlerts.map(a =>
            `<p style="color:${a.severity === 'critical' ? '#ef4444' : '#f59e0b'};">${a.full_name} - ${a.days_without_contact}j sans contact</p>`
          ).join('')
      }
      <h2 style="color:#c9a84c;font-size:16px;">Cette semaine</h2>
      <p>${data.relancesDues} relances dues | ${data.rdvSemaine} RDV planifies</p>
    </div>
  `
}
```

### Query RDV J-1

```typescript
// Pattern pour AUTO-03 : trouver les RDV de demain
// Source: adaptation de src/app/api/today/signal/route.ts
import { addDays, startOfDay, endOfDay } from 'date-fns'

const tomorrow = addDays(new Date(), 1)
const tomorrowStart = startOfDay(tomorrow).toISOString()
const tomorrowEnd = endOfDay(tomorrow).toISOString()

const { data: rdvDemain } = await supabase
  .from('interactions')
  .select('id, type, occurred_at, notes, prospect_id, prospects(full_name, phone, phone_normalized, email)')
  .in('type', ['rdv1', 'rdv2', 'rdv3'])
  .gte('occurred_at', tomorrowStart)
  .lte('occurred_at', tomorrowEnd)
```

### Task Scheduler Setup (PowerShell)

```powershell
# Creer les taches planifiees Windows
# Rapport hebdo : lundi 8h
$action = New-ScheduledTaskAction -Execute "curl.exe" -Argument '-s -H "x-cron-secret: YOUR_SECRET" http://localhost:3000/api/cron/weekly-report'
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 8am
Register-ScheduledTask -TaskName "TedCGP-WeeklyReport" -Action $action -Trigger $trigger -Description "Ted Scale - Rapport hebdomadaire"

# Alertes client health : tous les jours 7h
$action2 = New-ScheduledTaskAction -Execute "curl.exe" -Argument '-s -H "x-cron-secret: YOUR_SECRET" http://localhost:3000/api/cron/client-health'
$trigger2 = New-ScheduledTaskTrigger -Daily -At 7am
Register-ScheduledTask -TaskName "TedCGP-ClientHealth" -Action $action2 -Trigger $trigger2 -Description "Ted Scale - Alertes client health"

# Rappel RDV J-1 : tous les jours 18h
$action3 = New-ScheduledTaskAction -Execute "curl.exe" -Argument '-s -H "x-cron-secret: YOUR_SECRET" http://localhost:3000/api/cron/rdv-reminder'
$trigger3 = New-ScheduledTaskTrigger -Daily -At 6pm
Register-ScheduledTask -TaskName "TedCGP-RdvReminder" -Action $action3 -Trigger $trigger3 -Description "Ted Scale - Rappel RDV J-1"

# Alerte CA : tous les jours 9h
$action4 = New-ScheduledTaskAction -Execute "curl.exe" -Argument '-s -H "x-cron-secret: YOUR_SECRET" http://localhost:3000/api/cron/revenue-alert'
$trigger4 = New-ScheduledTaskTrigger -Daily -At 9am
Register-ScheduledTask -TaskName "TedCGP-RevenueAlert" -Action $action4 -Trigger $trigger4 -Description "Ted Scale - Alerte CA sous seuil"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Deno.cron dans Edge Functions | pg_cron + pg_net (Supabase hosted) | 2024 | Supabase recommande pg_cron pour le scheduling, Deno.cron est experimental |
| Cookie auth pour cron routes | x-cron-secret + service_role | Phase 2 (decision 02E) | Les routes cron ne peuvent pas avoir de session navigateur |
| Edge Function Deno appelle Next.js API | Route Handler Next.js directe | Phase 5 | Elimine la couche Deno intermediaire -- la logique reste dans Next.js |

**Deprecated/outdated:**
- `Deno.cron` dans le contexte Supabase local : instable, necessite Docker, le try/catch dans `process-sequences/index.ts` en temoigne [VERIFIED: codebase]
- Edge Function comme proxy vers Next.js API : ajoute de la complexite sans valeur quand tout tourne en local

## Schema : Table cron_logs (migration 007)

```sql
-- Migration 007: cron_logs pour historique executions automatisations
CREATE TABLE cron_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_name text NOT NULL,        -- 'weekly-report', 'client-health', 'rdv-reminder', 'revenue-alert'
  status text NOT NULL,          -- 'success', 'error', 'skipped'
  details jsonb DEFAULT '{}',    -- { processed: N, errors: [...], summary: "..." }
  executed_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_cron_logs_user ON cron_logs(user_id);
CREATE INDEX idx_cron_logs_job ON cron_logs(job_name, executed_at DESC);

-- RLS
ALTER TABLE cron_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own cron_logs" ON cron_logs
  FOR SELECT USING (auth.uid() = user_id);
-- INSERT via service_role (bypass RLS) depuis les routes cron
```

## Reponses aux Questions de Recherche

### Q1: Deno.cron fonctionne-t-il en local ?

**Non de maniere fiable.** Le code existant dans `process-sequences/index.ts` wrap `Deno.cron` dans un try/catch, confirmant que ca ne marche pas toujours [VERIFIED: codebase]. Supabase recommande `pg_cron` + `pg_net` pour le scheduling en production [CITED: supabase.com/docs/guides/functions/schedule-functions]. En local, `supabase functions serve` avec Docker peut fonctionner mais c'est fragile [CITED: github.com/orgs/supabase/discussions/14747].

**Recommandation:** Route Handlers Next.js + Windows Task Scheduler. Aucune dependance Docker.

### Q2: Comment envoyer un email Brevo depuis une Edge Function ?

**Pas besoin d'Edge Function.** `sendBrevoEmail()` et `sendBrevoSms()` existent deja dans `src/lib/sequences/brevo.ts` [VERIFIED: codebase]. Ils lisent `process.env.BREVO_API_KEY` et `process.env.BREVO_SENDER_EMAIL`. Les routes cron seront des Route Handlers Next.js qui importent directement ces helpers.

### Q3: Quelles donnees pour le rapport hebdo ?

- **CA mois en cours** : `v_monthly_revenue` view (contracts + objectives) [VERIFIED: 003_functions.sql]
- **CA semaine** : query `contracts` filtre sur `commission_date` de la semaine courante
- **Objectif mensuel** : `user_settings.ca_monthly_target` (defaut 15000) [VERIFIED: settings/route.ts]
- **Alertes clients** : `get_client_health_alerts(user_id)` RPC [VERIFIED: 003_functions.sql]
- **Relances dues** : `prospects` avec `next_action_date` dans les 7 prochains jours [VERIFIED: today/signal/route.ts]
- **RDV semaine** : `interactions` type rdv1/rdv2/rdv3, `occurred_at` dans la semaine [VERIFIED: today/signal/route.ts]

### Q4: Comment recuperer les RDV J-1 ?

Les RDV sont stockes dans la table `interactions` avec `type IN ('rdv1', 'rdv2', 'rdv3')` et `occurred_at` comme date planifiee [VERIFIED: today/signal/route.ts]. Google Calendar n'est pas integre (v2). Query : `interactions` ou `occurred_at BETWEEN tomorrow_start AND tomorrow_end` et join `prospects` pour nom + telephone.

### Q5: Comment declencher les crons localement pour tester ?

**Trois methodes :**
1. **Curl direct** : `curl -H "x-cron-secret: XXX" http://localhost:3000/api/cron/weekly-report`
2. **Navigateur** : ouvrir l'URL directement (si secret desactive en dev)
3. **Task Scheduler** : configuration PowerShell permanente (voir Code Examples)

### Q6: Y a-t-il deja une table weekly_reports dans le schema ?

**Non.** Aucune table `weekly_reports`, `cron_logs`, ou `notification_log` n'existe [VERIFIED: grep sur tout le codebase]. La migration 007 est necessaire pour creer `cron_logs`.

### Q7: BREVO_SENDER_EMAIL -- stocke ou ?

Dans `process.env.BREVO_SENDER_EMAIL` (fichier `.env.local`). Le code `brevo.ts` lit cette variable directement [VERIFIED: brevo.ts ligne 10]. Le champ `user_settings.brevo_api_key` dans le schema SQL n'est **pas utilise** par le code actuel -- c'est un vestige du design initial.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | WhatsApp Business Cloud API sera utilise pour AUTO-03 (ou fallback SMS) | Pitfall 3, AUTO-03 | Si le user veut absolument WhatsApp et n'a pas de compte Business API, AUTO-03 est bloque. Fallback SMS couvre le besoin |
| A2 | L'app Next.js tourne en permanence sur localhost:3000 (pour que Task Scheduler puisse appeler curl) | Architecture | Si le serveur est eteint, les crons ne s'executent pas. Pas de retry automatique |
| A3 | Un seul user (usage solo CGP) -- les routes cron iterent sur tous les users avec service_role mais en pratique il n'y en a qu'un | Pattern 2 | Si multi-user un jour, le code fonctionnera quand meme car il itere deja sur tous les users |
| A4 | Le rapport hebdo est envoye a l'email du CGP (auth.users.email = amiero.education@gmail.com) | Pitfall 4 | Si le user veut un email different, il faudra un champ `notification_email` dans user_settings |

## Open Questions (RESOLVED)

1. **WhatsApp Business API pour AUTO-03**
   - What we know: `WHATSAPP_PHONE_NUMBER_ID` et `WHATSAPP_ACCESS_TOKEN` sont declares dans `env.ts` comme optionnels. Le canal whatsapp est client-only dans Phase 2.
   - What's unclear: Le user a-t-il un compte WhatsApp Business API configure ? Le token est-il disponible ?
   - Recommendation: Implementer avec fallback SMS si WhatsApp non configure. Ajouter un helper `sendWhatsApp()` qui utilise le Cloud API Meta.

2. **Page /automatisations -- wiring reel ou mock suffit ?**
   - What we know: La page existe avec des donnees mockees [VERIFIED: automatisations/page.tsx]. Elle affiche des toggles et un journal d'execution.
   - What's unclear: Faut-il wirer cette page sur les vraies donnees `cron_logs` dans cette phase ou garder le mock ?
   - Recommendation: Wirer sur `cron_logs` -- ca fait partie de l'experience "sans action manuelle" et ca prouve que les crons fonctionnent.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| curl.exe | Task Scheduler cron calls | Oui (Windows 11) | native | PowerShell Invoke-WebRequest |
| Windows Task Scheduler | Declenchement cron | Oui (Windows 11) | native | -- |
| BREVO_API_KEY | Email + SMS | A configurer (.env.local) | -- | Routes retournent erreur gracieuse sans crash [VERIFIED: brevo.ts] |
| BREVO_SENDER_EMAIL | Email expediteur | A configurer (.env.local) | -- | Routes retournent erreur gracieuse [VERIFIED: brevo.ts] |
| CRON_SECRET | Protection routes cron | A creer (.env.local) | -- | Sans secret = routes accessibles sans auth (dev OK, prod non) |
| SUPABASE_SERVICE_ROLE_KEY | Service role client | Existe dans env.ts required | -- | -- |
| WHATSAPP_PHONE_NUMBER_ID | AUTO-03 WhatsApp | Optionnel dans env.ts | -- | Fallback SMS via Brevo |
| WHATSAPP_ACCESS_TOKEN | AUTO-03 WhatsApp | Optionnel dans env.ts | -- | Fallback SMS via Brevo |

**Missing dependencies with no fallback:**
- Aucun -- toutes les deps ont un fallback gracieux

**Missing dependencies with fallback:**
- `BREVO_API_KEY` : si absent, les emails/SMS ne sont pas envoyes mais les routes ne crashent pas
- `WHATSAPP_*` : si absent, AUTO-03 utilise SMS comme canal de fallback

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Oui | `x-cron-secret` header pour routes cron (pas de session cookie) |
| V3 Session Management | Non | Routes cron stateless -- pas de session |
| V4 Access Control | Oui | `service_role` key bypass RLS -- usage restreint aux routes `/api/cron/*` |
| V5 Input Validation | Oui | Pas d'input utilisateur dans les routes cron (pas de body) |
| V6 Cryptography | Non | Pas de crypto -- delegation a Brevo pour TLS email |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Route cron accessible sans auth | Elevation of Privilege | `x-cron-secret` header obligatoire |
| Service role key expose | Information Disclosure | `SUPABASE_SERVICE_ROLE_KEY` dans `.env.local` seulement, jamais `NEXT_PUBLIC_` |
| BREVO_API_KEY dans les logs | Information Disclosure | Ne jamais logger les cles API -- logger seulement les resultats (success/error) |
| Spam email si cron mal configure | Denial of Service | Deduplication : check `cron_logs` pour eviter double envoi le meme jour |

## Sources

### Primary (HIGH confidence)
- Codebase existant -- `src/lib/sequences/brevo.ts`, `src/app/api/crm/sequences/process/route.ts`, `supabase/functions/process-sequences/index.ts`, `supabase/migrations/003_functions.sql`, `src/lib/supabase/server.ts`, `src/app/api/today/signal/route.ts`, `src/app/api/revenue/stats/route.ts`, `src/app/api/settings/route.ts`
- [Supabase Scheduling Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions) -- pg_cron + pg_net recommande
- [Supabase Cron docs](https://supabase.com/docs/guides/cron) -- pg_cron details
- [Supabase Edge Functions Secrets](https://supabase.com/docs/guides/functions/secrets) -- gestion env vars

### Secondary (MEDIUM confidence)
- [Supabase Discussion #14747](https://github.com/orgs/supabase/discussions/14747) -- Deno.cron ne fonctionne pas localement

### Tertiary (LOW confidence)
- Aucune source LOW utilisee

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- tout est deja dans le codebase (Brevo, Supabase, Route Handlers)
- Architecture: HIGH -- pattern Route Handler + Task Scheduler valide pour scope local
- Pitfalls: HIGH -- identifies par analyse directe du code existant

**Research date:** 2026-05-11
**Valid until:** 2026-06-11 (stack stable, pas de deps fast-moving)
