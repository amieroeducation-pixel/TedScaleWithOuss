# Phase 2: Séquences Multicanales — Research

**Researched:** 2026-05-10
**Domain:** Orchestration de séquences multicanales (WhatsApp, Email Brevo, SMS Brevo, Rappel interne, LinkedIn) depuis un Kanban CRM Next.js 15 + Supabase
**Confidence:** HIGH (codebase analysée directement, patterns déjà établis en Phase 1)

---

## Summary

La Phase 2 construit un moteur de séquences de relance multicanales activable depuis les cartes prospect du Kanban CRM déjà existant. Le drawer `ProspectDrawer` dans `src/app/(dashboard)/crm/page.tsx` reçoit un bouton "Démarrer séquence" (SEQ-01). La route `POST /api/pipeline/move` est le point d'accroche naturel pour le déclenchement automatique (SEQ-02) — elle est appelée à chaque déplacement de carte et connaît déjà `prospect_id` et `to_stage`.

Les actions se répartissent en deux tiers d'exécution : **client-side** pour WhatsApp et LinkedIn (aucune API key nécessaire, `window.open` + `navigator.clipboard`) et **server-side** pour Email et SMS Brevo (appels HTTP vers `api.brevo.com` depuis des Route Handlers Next.js, protégés par `BREVO_API_KEY`). Les rappels appel interne (SEQ-06) sont gérés comme des enregistrements en BDD avec polling client depuis le dashboard.

Le stockage des séquences nécessite 4 nouvelles tables Supabase : `sequence_templates` (définition d'une séquence réutilisable), `sequence_template_steps` (étapes d'une séquence — canal, délai, template message), `sequence_instances` (une séquence lancée sur un prospect), `sequence_instance_steps` (suivi d'exécution par étape). Les séquences J+X sont pilotées par un Supabase Edge Function cron quotidien qui interroge les étapes à exécuter (scheduled_at <= now()) et dispatche les actions.

**Recommandation principale :** Implémenter le moteur en 4 couches — (1) tables DB + migration, (2) Route Handlers API pour lancer/exécuter/pauser/annuler, (3) intégration UI dans le drawer existant, (4) Edge Function cron pour les étapes différées.

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact sur cette phase |
|-----------|----------------------|
| Next.js 15 App Router uniquement — pas de Pages Router | Toutes les routes API sont des Route Handlers dans `src/app/api/` |
| Supabase Auth SSR `@supabase/ssr` v0.10 avec `getUser()` | Chaque Route Handler commence par `createSupabaseServerClient()` + `supabase.auth.getUser()` |
| Zod v4 — `.issues` (pas `.errors`), `PropertyKey[]` pour les paths | Validation des body avec `parsed.error.issues.map(e => e.message)` |
| Thème dark/gold inline CSS via `src/lib/theme.ts` (`C.*`) | Toute UI ajoutée dans le drawer utilise `C.gold`, `C.surface2`, etc. — pas de classes Tailwind directes |
| Validé en local d'abord | Pas de dépendance à un service cloud nécessitant un déploiement (Supabase local OK) |

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SEQ-01 | Bouton "Démarrer séquence" dans le drawer prospect | Section `ProspectDrawer` déjà identifiée dans `crm/page.tsx` — ajouter section "Séquences" après "Actions rapides" |
| SEQ-02 | Déclenchement auto au changement de stade pipeline | Hook dans `POST /api/pipeline/move` — après le log pipeline_event, appeler `triggerSequenceForStage(prospect_id, to_stage, user_id)` |
| SEQ-03 | Étape WhatsApp Business | `window.open('https://wa.me/PHONE?text=MESSAGE')` côté client — pas d'API key |
| SEQ-04 | Étape Email Brevo | `POST /api/crm/actions/email` → Brevo REST `POST /v3/smtp/email` avec `BREVO_API_KEY` |
| SEQ-05 | Étape SMS Brevo | `POST /api/crm/actions/sms` → Brevo REST `POST /v3/transactionalSMS/sms` — même API key |
| SEQ-06 | Étape Rappel appel interne | Insérer enregistrement `type='appel'` dans `interactions` avec `is_honored=false` + flag `next_action_date` sur le prospect |
| SEQ-07 | Étape LinkedIn | `window.open(linkedinUrl)` + `navigator.clipboard.writeText(inmailTemplate)` côté client |
| SEQ-08 | Statut visible par étape (planifiée / envoyée / échouée) | Colonne `status` dans `sequence_instance_steps` + section UI dans le drawer |
| SEQ-09 | Pause / annulation d'une séquence active | `PATCH /api/crm/sequences/[instanceId]` avec body `{ action: 'pause' | 'cancel' }` |
| SEQ-10 | Chaque action tracée dans `interactions` | Insérer dans `interactions` après chaque étape exécutée (type mappé au canal) |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Bouton "Démarrer séquence" (SEQ-01) | Browser/Client | — | Composant React dans `ProspectDrawer`, déjà `'use client'` |
| Déclenchement auto pipeline (SEQ-02) | API/Backend | — | Hook dans Route Handler existant `POST /api/pipeline/move` |
| Étape WhatsApp (SEQ-03) | Browser/Client | — | `window.open` ne peut s'exécuter que côté navigateur |
| Étape Email Brevo (SEQ-04) | API/Backend | — | Clé API secrète — exécution serveur uniquement |
| Étape SMS Brevo (SEQ-05) | API/Backend | — | Clé API secrète — exécution serveur uniquement |
| Rappel appel interne (SEQ-06) | API/Backend | Browser/Client | Insertion BDD côté serveur, affichage côté client |
| Étape LinkedIn (SEQ-07) | Browser/Client | — | `window.open` + `navigator.clipboard` — navigateur uniquement |
| Statut par étape (SEQ-08) | Browser/Client | Database | Lecture depuis `sequence_instance_steps`, rendu dans drawer |
| Pause/annulation (SEQ-09) | API/Backend | Browser/Client | Route Handler PATCH + bouton UI dans le drawer |
| Traçage dans interactions (SEQ-10) | API/Backend | — | INSERT dans `interactions` après chaque action serveur |
| Exécution étapes J+X différées | Database/Edge | — | Supabase Edge Function cron — seule option sans scheduler tiers |

---

## Standard Stack

### Core (déjà installé)

| Library | Version installée | Purpose | Why Standard |
|---------|-------------------|---------|--------------|
| `@supabase/supabase-js` | 2.105.4 | Client Supabase, insertion en DB | Déjà en production dans le projet |
| `@supabase/ssr` | 0.10.3 | Auth SSR avec `getUser()` | Pattern établi Phase 0/1 |
| `next` | 15.5.18 | Route Handlers App Router | Contrainte projet |
| `zod` | 4.4.3 | Validation body requêtes | Contrainte projet — `.issues` |
| `sonner` | 2.0.7 | Toasts feedback utilisateur | Déjà dans le layout |
| `date-fns` | 4.1.0 | Calcul dates J+X pour scheduling | Déjà installé |

### À installer pour Brevo

| Library | Version actuelle npm | Purpose | Notes |
|---------|----------------------|---------|-------|
| `@getbrevo/brevo` | 5.0.4 [VERIFIED: npm registry] | SDK officiel Brevo — email + SMS | Alternative : appels `fetch` directs vers l'API REST Brevo (pas de SDK requis) |

**Décision recommandée :** Ne PAS installer le SDK Brevo — utiliser `fetch` direct vers l'API REST Brevo. Raisons : (1) SDK est une dépendance lourde, (2) l'API REST Brevo est simple (2 endpoints, auth par header `api-key`), (3) pattern déjà établi dans ce projet (toutes les routes utilisent `fetch` direct), (4) moins de surface d'attaque. [VERIFIED: codebase grep — aucun SDK externe HTTP utilisé]

### Aucun scheduler JavaScript nécessaire

Les étapes différées (J+2, J+5...) sont exécutées par un **Supabase Edge Function cron** — pas de `node-cron` ni `node-schedule` dans le process Next.js. Ceci évite un singleton serveur persistant incompatible avec le modèle serverless/App Router. [ASSUMED — voir Open Questions sur disponibilité Edge Functions en local]

---

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  BROWSER (crm/page.tsx — 'use client')                          │
│                                                                  │
│  ProspectCard ──onClick──► ProspectDrawer                        │
│                               │                                  │
│                    ┌──────────┴──────────────┐                   │
│                    │  Section "Séquences"     │                   │
│                    │  • Bouton Démarrer (SEQ-01)                 │
│                    │  • Liste instances actives                   │
│                    │  • Statut par étape (SEQ-08)                │
│                    │  • Pause/Annuler (SEQ-09)                   │
│                    └──────────┬──────────────┘                   │
│                               │                                  │
│              ┌────────────────┴──────────────────┐              │
│              │ Actions client-side immédiates     │              │
│              │ WhatsApp: window.open(wa.me/...)   │              │
│              │ LinkedIn: window.open + clipboard  │              │
│              └────────────────┬──────────────────┘              │
└────────────────────────────────┼────────────────────────────────┘
                                 │ fetch()
┌────────────────────────────────┼────────────────────────────────┐
│  NEXT.JS API LAYER (Route Handlers)                              │
│                                │                                 │
│  POST /api/crm/sequences/start ◄── Démarrer séquence manuellement│
│  POST /api/pipeline/move ──────┤──► auto-trigger (SEQ-02)        │
│  GET  /api/crm/sequences/[pid] │    Liste instances prospect      │
│  PATCH /api/crm/sequences/[id] │    Pause/Annuler (SEQ-09)       │
│  POST /api/crm/actions/email   │    Exécuter étape Email (SEQ-04)│
│  POST /api/crm/actions/sms     │    Exécuter étape SMS (SEQ-05)  │
│                                │                                  │
│  ┌─────────────────────────────┘                                 │
│  │  triggerSequenceForStage(prospect_id, to_stage, user_id)      │
│  │  └── cherche sequence_templates pour ce stade                 │
│  │  └── crée sequence_instance + sequence_instance_steps         │
│  │  └── exécute étapes J+0 immédiatement                         │
│  │  └── planifie étapes J+X (scheduled_at = now() + X jours)    │
└──┼────────────────────────────────────────────────────────────────┘
   │
┌──┼────────────────────────────────────────────────────────────────┐
│  │  SUPABASE (PostgreSQL + RLS)                                   │
│  │                                                                 │
│  │  sequence_templates        ← définition séquences réutilisables│
│  │  sequence_template_steps   ← étapes de chaque template         │
│  │  sequence_instances        ← séquences lancées sur un prospect │
│  │  sequence_instance_steps   ← statut d'exécution par étape      │
│  │  interactions              ← traçage SEQ-10                    │
│  │  prospects                 ← updated next_action_date (SEQ-06) │
│  │                                                                 │
│  │  EDGE FUNCTION CRON (quotidien)                                │
│  │  ├── SELECT steps WHERE scheduled_at <= now() AND status='pending'│
│  │  ├── Pour chaque étape : appel /api/crm/actions/* ou action directe│
│  │  └── UPDATE status + executed_at                               │
└──┴────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
src/
├── app/
│   ├── (dashboard)/
│   │   └── crm/
│   │       └── page.tsx          # Ajouter section Séquences dans ProspectDrawer
│   └── api/
│       ├── pipeline/
│       │   └── move/
│       │       └── route.ts      # Hook SEQ-02 : appel triggerSequenceForStage()
│       └── crm/
│           ├── sequences/
│           │   ├── start/
│           │   │   └── route.ts  # POST — démarrer une séquence manuellement
│           │   └── [instanceId]/
│           │       └── route.ts  # GET (statut) + PATCH (pause/annuler)
│           └── actions/
│               ├── email/
│               │   └── route.ts  # POST — envoyer email Brevo
│               └── sms/
│                   └── route.ts  # POST — envoyer SMS Brevo
├── lib/
│   └── sequences/
│       ├── trigger.ts            # triggerSequenceForStage() — logique métier partagée
│       ├── executor.ts           # executeStep() — dispatch par type de canal
│       └── brevo.ts              # sendBrevoEmail() + sendBrevoSms() — helpers fetch
supabase/
├── migrations/
│   └── 005_sequences.sql         # 4 nouvelles tables + RLS + index
└── functions/
    └── process-sequences/
        └── index.ts              # Edge Function cron quotidien
```

### Pattern 1 : Schéma DB des séquences

```sql
-- Source: conception basée sur schéma 001_init_schema.sql existant [VERIFIED: codebase]

-- Templates (définitions réutilisables)
create type sequence_channel as enum ('whatsapp', 'email', 'sms', 'call_reminder', 'linkedin');
create type sequence_status as enum ('active', 'paused', 'completed', 'cancelled');
create type step_status as enum ('pending', 'sent', 'failed', 'skipped');

create table sequence_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  pipeline_stage pipeline_stage, -- null = template générique
  auto_trigger boolean default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table sequence_template_steps (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references sequence_templates(id) on delete cascade not null,
  step_order integer not null,
  channel sequence_channel not null,
  delay_days integer not null default 0,  -- J+0, J+2, J+5...
  message_template text,                  -- template avec variables {{nom}}, {{telephone}}
  created_at timestamptz default now() not null
);

-- Instances (séquences lancées)
create table sequence_instances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  prospect_id uuid references prospects(id) on delete cascade not null,
  template_id uuid references sequence_templates(id) on delete set null,
  status sequence_status not null default 'active',
  started_at timestamptz default now() not null,
  paused_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz default now() not null
);

create table sequence_instance_steps (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid references sequence_instances(id) on delete cascade not null,
  template_step_id uuid references sequence_template_steps(id) on delete set null,
  step_order integer not null,
  channel sequence_channel not null,
  scheduled_at timestamptz not null,      -- calculated: started_at + delay_days
  executed_at timestamptz,
  status step_status not null default 'pending',
  error_message text,
  message_sent text,                      -- message réellement envoyé (après interpolation)
  created_at timestamptz default now() not null
);
```

### Pattern 2 : Hook dans /api/pipeline/move (SEQ-02)

```typescript
// Source: src/app/api/pipeline/move/route.ts [VERIFIED: codebase]
// Après le log pipeline_event existant, ajouter :

import { triggerSequenceForStage } from '@/lib/sequences/trigger'

// Dans la fonction POST, après l'insertion pipeline_event :
const triggerResult = await triggerSequenceForStage({
  supabase,
  userId: user.id,
  prospectId: prospect_id,
  toStage: to_stage,
})
// Non-bloquant — erreur loguée mais pas propagée au client
if (triggerResult.error) {
  console.error('Sequence trigger failed:', triggerResult.error)
}
```

### Pattern 3 : Appel API Brevo (email)

```typescript
// Source: https://developers.brevo.com/reference/sendtransacemail [CITED]
// lib/sequences/brevo.ts

export async function sendBrevoEmail({
  to, toName, subject, htmlContent
}: {
  to: string, toName: string, subject: string, htmlContent: string
}): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) return { success: false, error: 'BREVO_API_KEY manquante' }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'Ted - CGP', email: process.env.BREVO_SENDER_EMAIL },
      to: [{ email: to, name: toName }],
      subject,
      htmlContent,
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    return { success: false, error: err.message || `HTTP ${res.status}` }
  }
  return { success: true }
}
```

### Pattern 4 : Appel API Brevo (SMS)

```typescript
// Source: https://developers.brevo.com/reference/sendtransacsmS-1 [CITED]
// lib/sequences/brevo.ts (même fichier)

export async function sendBrevoSms({
  to, content, sender
}: {
  to: string,  // format E.164 : +33612345678
  content: string,
  sender?: string  // 11 chars max, lettres et chiffres
}): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) return { success: false, error: 'BREVO_API_KEY manquante' }

  const res = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: sender || 'TedCGP',
      recipient: to,
      content,
      type: 'transactional',
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    return { success: false, error: err.message || `HTTP ${res.status}` }
  }
  return { success: true }
}
```

### Pattern 5 : Interpolation des templates de message

```typescript
// lib/sequences/executor.ts
// Variables disponibles dans les templates : {{nom}}, {{prenom}}, {{telephone}}, {{email}}, {{stade}}

export function interpolateTemplate(template: string, prospect: {
  full_name: string, phone: string | null, email: string | null, pipeline_stage: string
}): string {
  const prenom = prospect.full_name.split(' ').at(-1) ?? prospect.full_name
  return template
    .replace(/\{\{nom\}\}/g, prospect.full_name)
    .replace(/\{\{prenom\}\}/g, prenom)
    .replace(/\{\{telephone\}\}/g, prospect.phone ?? '')
    .replace(/\{\{email\}\}/g, prospect.email ?? '')
    .replace(/\{\{stade\}\}/g, prospect.pipeline_stage)
}
```

### Pattern 6 : WhatsApp côté client (SEQ-03)

```typescript
// Source: pattern déjà dans ProspectDrawer — crm/page.tsx [VERIFIED: codebase]
// Pas d'API key — window.open vers wa.me

function openWhatsApp(phone: string, message: string) {
  const phoneClean = phone
    .replace(/\s/g, '')
    .replace(/^0/, '33')
    .replace(/[^0-9]/g, '')
  const encoded = encodeURIComponent(message)
  window.open(`https://wa.me/${phoneClean}?text=${encoded}`, '_blank')
}
```

### Pattern 7 : LinkedIn côté client (SEQ-07)

```typescript
// Source: REQUIREMENTS.md — "bouton ouvre le profil manuellement" [VERIFIED: REQUIREMENTS.md]
// lib/sequences/client-actions.ts (côté browser uniquement)

async function openLinkedIn(linkedinUrl: string | null, prospectName: string, inmailTemplate: string) {
  const url = linkedinUrl || `https://linkedin.com/search/results/people/?keywords=${encodeURIComponent(prospectName)}`
  window.open(url, '_blank')
  try {
    await navigator.clipboard.writeText(inmailTemplate)
    // Toast : "Template InMail copié dans le presse-papier"
  } catch {
    // Clipboard API peut échouer sans HTTPS ou sans permission
  }
}
```

### Pattern 8 : Seed sequence template par défaut (migration)

```sql
-- À insérer en fin de migration 005, après création des tables
-- Template de démo pour que l'UI ne soit pas vide au premier lancement
-- Utilise un user_id placeholder — sera remplacé via la page Config (Phase 3)
-- Pour Phase 2 MVP : séquence de démo codée en dur, sélectionnable dans le drawer
```

### Anti-Patterns à Éviter

- **Exécuter le cron depuis Next.js** : `setInterval` ou `node-cron` dans un Route Handler ne fonctionnent pas en mode App Router serverless — utiliser Supabase Edge Functions
- **Stocker BREVO_API_KEY côté client** : la clé ne doit jamais apparaître dans le bundle browser — toujours dans un Route Handler
- **Exécuter WhatsApp/LinkedIn côté serveur** : `window.open` n'existe pas en Node.js — ces actions restent client-only
- **Bloquer /api/pipeline/move en cas d'erreur de séquence** : le trigger est non-bloquant — une erreur de séquence ne doit pas faire échouer le déplacement de carte
- **Mettre à jour `prospects.pipeline_stage` depuis la séquence** : le stage est déjà mis à jour par `/api/pipeline/move`
- **Insérer `interaction_type` non conforme à l'enum** : l'enum existant est `('appel', 'rdv1', 'rdv2', 'rdv3', 'email', 'whatsapp', 'linkedin', 'autre')` — SMS n'est pas dans l'enum, utiliser `'autre'` ou étendre l'enum en migration

---

## Don't Hand-Roll

| Problème | Ne pas construire | Utiliser plutôt | Pourquoi |
|----------|-------------------|-----------------|----------|
| Envoi email transactionnel | Client SMTP custom | Brevo REST API (`/v3/smtp/email`) | Gestion bounces, deliverability, logs, limites gratuites généreuses |
| Envoi SMS | Intégration opérateur direct | Brevo SMS REST API (`/v3/transactionalSMS/sms`) | Même clé API que email, coverage France excellent |
| Scheduler de tâches différées | `setInterval` / cron Node.js | Supabase Edge Function cron | Persiste entre redémarrages, pas de singleton, compatible serverless |
| Interpolation de templates | Parser regex complexe | Simple `String.replace()` avec tokens `{{variable}}` | Suffisant pour ce volume, pas de XSS risk côté serveur |
| WhatsApp API officielle | Webhook Meta / Cloud API | `window.open('https://wa.me/...')` | Décision explicite dans REQUIREMENTS.md — "Out of scope" |
| Numéro E.164 normalization | Lib parsePhoneNumber | `phone_normalized` déjà en BDD | La colonne `phone_normalized` du schéma est déjà en E.164 [VERIFIED: 001_init_schema.sql] |

---

## Common Pitfalls

### Pitfall 1 : Enum `interaction_type` ne contient pas 'sms'
**Ce qui se passe :** Insérer `type = 'sms'` dans `interactions` échoue avec une erreur PostgreSQL enum violation.
**Pourquoi :** L'enum `interaction_type` défini dans `001_init_schema.sql` ne contient que `('appel', 'rdv1', 'rdv2', 'rdv3', 'email', 'whatsapp', 'linkedin', 'autre')` — 'sms' est absent. [VERIFIED: 001_init_schema.sql ligne 37-45]
**Comment éviter :** Ajouter `'sms'` à l'enum dans la migration 005 : `ALTER TYPE interaction_type ADD VALUE 'sms';` — ou utiliser `'autre'` pour la Phase 2 et étendre l'enum proprement.
**Signe d'alerte :** Erreur Supabase `invalid input value for enum interaction_type: "sms"` à l'exécution.

### Pitfall 2 : Actions client-side (WhatsApp, LinkedIn) tentées depuis un Edge Function
**Ce qui se passe :** `window.open` et `navigator.clipboard` sont undefined en environnement Node.js/Deno — erreur runtime.
**Pourquoi :** Les Edge Functions et Route Handlers s'exécutent côté serveur, sans accès au DOM.
**Comment éviter :** Les étapes WhatsApp (SEQ-03) et LinkedIn (SEQ-07) sont exécutées **uniquement dans le callback du bouton drawer** — jamais depuis le cron. Le cron marque ces étapes comme "en attente d'action manuelle" et présente une notification dans le drawer.
**Signe d'alerte :** Si l'exécuteur cron tente d'appeler `executeClientSideStep()`.

### Pitfall 3 : Double-déclenchement de séquence
**Ce qui se passe :** Un déplacement de carte déclenche SEQ-02 ET l'utilisateur clique sur "Démarrer séquence" (SEQ-01) — deux instances créées pour le même prospect + même stade.
**Pourquoi :** Il n'y a pas de guard contre les instances actives en doublon.
**Comment éviter :** Dans `triggerSequenceForStage()`, vérifier s'il existe déjà une `sequence_instance` avec `status = 'active'` pour ce prospect + ce template avant d'en créer une nouvelle. Si oui, ne pas créer de doublon.
**Signe d'alerte :** Prospect recevant 2x le même message WhatsApp le jour J+0.

### Pitfall 4 : `scheduled_at` calculé en UTC sans considérer le fuseau horaire
**Ce qui se passe :** Une étape planifiée "J+2 à 9h" s'exécute à 9h UTC, soit 11h en France en été — décalage imperceptible mais incorrect.
**Pourquoi :** `now()` dans Supabase retourne UTC. L'outil tourne en local Windows (CET/CEST).
**Comment éviter :** Pour la Phase 2 MVP, calculer `scheduled_at = started_at + delay_days * interval '1 day'` sans heure précise (granularité "jour" suffisante). Le cron quotidien exécute les étapes dont `scheduled_at::date <= current_date`. [ASSUMED — à ajuster si l'heure d'envoi devient un requirement]
**Signe d'alerte :** Étapes exécutées la nuit au lieu du matin.

### Pitfall 5 : Brevo API rate limits
**Ce qui se passe :** En plan gratuit Brevo, la limite est 300 emails/jour — OK pour usage solo CGP. Mais si le cron s'emballe (bug), tous les crédits sont consommés.
**Pourquoi :** Edge Function cron sans guard de doublon peut re-traiter des étapes déjà envoyées.
**Comment éviter :** Mettre à jour `status = 'sent'` et `executed_at = now()` **avant** l'appel API Brevo (optimistic lock) — ou immédiatement après succès avec vérification que `status != 'sent'` en début de traitement.
**Signe d'alerte :** Doublons emails reçus par le prospect.

### Pitfall 6 : Le hook SEQ-02 ralentit /api/pipeline/move
**Ce qui se passe :** La création d'une instance de séquence (plusieurs INSERTs) ajoute de la latence à la réponse du drag-and-drop.
**Pourquoi :** Le hook `triggerSequenceForStage()` est synchrone et bloquant.
**Comment éviter :** Exécuter le trigger en arrière-plan avec `void triggerSequenceForStage(...)` — la réponse HTTP est renvoyée sans attendre. Les erreurs sont loguées mais ne bloquent pas l'UX.
**Signe d'alerte :** Latence perceptible au drag-and-drop sur le Kanban.

### Pitfall 7 : `navigator.clipboard` échoue sans HTTPS
**Ce qui se passe :** `navigator.clipboard.writeText()` est rejeté silencieusement sur HTTP.
**Pourquoi :** L'API Clipboard requiert un "secure context" (HTTPS ou localhost).
**Comment éviter :** L'outil tourne en local sur `localhost` — l'API Clipboard fonctionne sur localhost sans HTTPS. [ASSUMED — vérifier si Next.js dev server tourne bien sur localhost et non sur une IP réseau]
**Signe d'alerte :** Toast "Template copié" ne s'affiche pas, ou erreur console `NotAllowedError`.

---

## Runtime State Inventory

> Section pertinente car on ajoute de nouvelles tables Supabase — pas un rename/refactor, mais un ajout de schéma.

| Catégorie | Items | Action requise |
|-----------|-------|----------------|
| Stored data | Aucune donnée existante dans les tables séquences (elles n'existent pas encore) | Migration 005 crée les tables ex nihilo |
| Live service config | Supabase project `vqtzcxvmzznbepyvlcut` — migrations appliquées via Supabase CLI | Appliquer migration 005 avec `supabase db push` |
| OS-registered state | Aucun | — |
| Secrets/env vars | `BREVO_API_KEY` et `BREVO_SENDER_EMAIL` doivent être ajoutés à `.env.local` | Variables à créer manuellement |
| Build artifacts | Aucun stale artifact | — |

**Variable d'environnement requise (nouvelle) :**
- `BREVO_API_KEY` — clé API Brevo (email + SMS partagée)
- `BREVO_SENDER_EMAIL` — adresse email expéditeur vérifiée dans Brevo

---

## Environment Availability

| Dépendance | Requise par | Disponible | Version | Fallback |
|------------|------------|------------|---------|----------|
| Node.js | Next.js, tout | ✓ | v24.15.0 | — |
| TypeScript | Compilation | ✓ | 6.0.3 | — |
| Supabase CLI | Appliquer migrations | A vérifier | — | Supabase Dashboard (mais inaccessible selon PROJECT.md) |
| Supabase Edge Functions runtime (Deno) | Cron J+X | A vérifier | — | Polling depuis Next.js API route avec `setInterval` (non recommandé) |
| BREVO_API_KEY | Email (SEQ-04), SMS (SEQ-05) | A configurer | — | Sans clé : les étapes email/SMS marquées 'failed' avec message explicite |
| Brevo compte actif | Email/SMS | A vérifier | — | Sans compte Brevo : désactiver canaux email/SMS, WhatsApp/LinkedIn fonctionnent |
| `window.open` / `navigator.clipboard` | WhatsApp (SEQ-03), LinkedIn (SEQ-07) | ✓ (navigateur) | — | — |

**Point d'attention — Supabase Edge Functions en local :**
Les Edge Functions Supabase requièrent `supabase functions serve` en local et Deno installé. [ASSUMED — à confirmer par l'utilisateur] Si non disponible en local, le cron peut être simulé par un appel manuel à une Route Handler Next.js dédiée pour la phase de test.

---

## Code Examples

### Lancer une séquence (Route Handler)

```typescript
// src/app/api/crm/sequences/start/route.ts
import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'
import { z } from 'zod'
import { triggerSequenceForStage } from '@/lib/sequences/trigger'

const startSchema = z.object({
  prospect_id: z.string().uuid(),
  template_id: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let body: unknown
  try { body = await request.json() } catch { return apiError('Invalid JSON', 400) }

  const parsed = startSchema.safeParse(body)
  if (!parsed.success) {
    return apiError(parsed.error.issues.map(e => e.message).join(', '), 400)
  }

  const result = await triggerSequenceForStage({
    supabase, userId: user.id,
    prospectId: parsed.data.prospect_id,
    templateId: parsed.data.template_id,
  })

  if (result.error) return apiError(result.error)
  return apiSuccess({ instance_id: result.instanceId })
}
```

### Pause / Annulation (Route Handler)

```typescript
// src/app/api/crm/sequences/[instanceId]/route.ts
const patchSchema = z.object({
  action: z.enum(['pause', 'resume', 'cancel']),
})

export async function PATCH(request: NextRequest, { params }: { params: { instanceId: string } }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const parsed = patchSchema.safeParse(await request.json())
  if (!parsed.success) return apiError(parsed.error.issues.map(e => e.message).join(', '), 400)

  const statusMap = { pause: 'paused', resume: 'active', cancel: 'cancelled' } as const
  const newStatus = statusMap[parsed.data.action]

  const { error } = await supabase
    .from('sequence_instances')
    .update({ status: newStatus, [`${parsed.data.action === 'pause' ? 'paused' : 'cancelled'}_at`]: new Date().toISOString() })
    .eq('id', params.instanceId)
    .eq('user_id', user.id)  // RLS + ownership check

  if (error) return apiError(error.message)
  return apiSuccess({ instance_id: params.instanceId, status: newStatus })
}
```

### Statut séquence dans le drawer

```tsx
// Extrait ProspectDrawer — section à ajouter (inline CSS C.*)
<div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.line}` }}>
  <div style={{ fontSize: 9, color: C.textLo, marginBottom: 10, fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: 1 }}>Séquences actives</div>
  {instances.map(inst => (
    <div key={inst.id} style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: C.text }}>{inst.template_name}</span>
        <span style={{ fontSize: 9, color: inst.status === 'active' ? C.green : C.textLo }}>
          {inst.status}
        </span>
      </div>
      {inst.steps.map(step => (
        <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background:
            step.status === 'sent' ? C.green :
            step.status === 'failed' ? C.warn :
            step.status === 'pending' ? C.gold : C.textLo }} />
          <span style={{ fontSize: 9, color: C.textMid }}>
            {step.channel} — J+{step.delay_days} — {step.status}
          </span>
        </div>
      ))}
    </div>
  ))}
</div>
```

---

## State of the Art

| Ancienne approche | Approche actuelle | Changement | Impact |
|-------------------|-------------------|------------|--------|
| `node-cron` dans un serveur Express | Supabase Edge Functions cron | Adoption Supabase Edge Functions pour cron serverless | Pas de singleton process — compatible Next.js 15 serverless |
| WhatsApp Business API (webhooks) | `window.open('https://wa.me/...')` | Décision explicite projet — API trop restrictive | Zéro coût, zéro API key, mais action manuelle utilisateur requise |
| SDK @getbrevo/brevo | Appels `fetch` directs vers l'API REST Brevo | Pattern projet (pas de SDK HTTP tiers) | Moins de dépendances, même résultat |
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` v0.10 | Migration breaking change Supabase | `createSupabaseServerClient()` déjà implémenté dans `src/lib/supabase/server.ts` |

---

## Assumptions Log

| # | Claim | Section | Risque si faux |
|---|-------|---------|----------------|
| A1 | Supabase Edge Functions sont disponibles et fonctionnelles en local (nécessite Deno + `supabase functions serve`) | Architecture, Environment Availability | Si non disponibles : le cron J+X ne peut pas s'exécuter — fallback nécessaire (route API manuellement appelée) |
| A2 | `BREVO_API_KEY` existe ou peut être créée (compte Brevo actif) | Standard Stack, Brevo patterns | Si absent : SEQ-04 (Email) et SEQ-05 (SMS) ne fonctionnent pas — séquences WhatsApp et LinkedIn non affectées |
| A3 | `scheduled_at` à granularité "jour" est suffisant (pas d'heure précise d'envoi) | Pitfall 4 | Si l'utilisateur veut envoyer à 9h précises : la logique cron doit être affinée |
| A4 | Un seul template de séquence sera configuré manuellement en Phase 2 (la UI de config est Phase 3) | Architecture | Si l'utilisateur veut plusieurs séquences configurables dès Phase 2 : scope augmente significativement |
| A5 | `prospect.phone_normalized` est en format E.164 (commençant par +33) pour Brevo SMS | Brevo SMS pattern | Si le format est différent : la normalisation doit être ajoutée dans le helper `brevo.ts` |

---

## Open Questions

1. **Supabase Edge Functions disponibles en local ?**
   - Ce qu'on sait : Le projet utilise Supabase CLI pour les migrations (PROJECT.md). Supabase Edge Functions requièrent Deno.
   - Ce qui est flou : Deno est-il installé sur la machine de Ted ? `supabase functions serve` a-t-il déjà été utilisé ?
   - Recommandation : Prévoir un fallback — Route Handler Next.js `GET /api/crm/sequences/process` qui peut être appelé manuellement ou via un `cron job Windows` (Planificateur de tâches) si Edge Functions indisponibles en local.

2. **Compte Brevo actif et clé API disponible ?**
   - Ce qu'on sait : `user_settings` a une colonne `brevo_api_key` (schéma 001) — prévision claire d'intégration Brevo. `PROJECT.md` confirme "Brevo API".
   - Ce qui est flou : La clé existe-t-elle déjà ? L'adresse email expéditeur est-elle vérifiée dans Brevo ?
   - Recommandation : Prévoir une gestion d'erreur explicite quand `BREVO_API_KEY` est absente — étapes email/SMS marquées `'failed'` avec message `'Clé Brevo non configurée'`.

3. **Séquences par défaut pour le MVP : hardcodées ou configurables ?**
   - Ce qu'on sait : La Phase 3 (Configuration) gère la UI de config des séquences. La Phase 2 implémente le moteur.
   - Ce qui est flou : Pour tester la Phase 2, faut-il une seed de données de séquence en DB, ou l'utilisateur crée manuellement un template via SQL ?
   - Recommandation : Inclure dans la migration 005 un template de séquence de démonstration avec 3 étapes (WhatsApp J+0, Email J+2, Rappel appel J+5) attaché à aucun stade pipeline (`pipeline_stage = null`) pour tests immédiats.

---

## Validation Architecture

### Test Framework

| Propriété | Valeur |
|-----------|--------|
| Framework | Playwright 1.59.1 (`@playwright/test` dans devDependencies) |
| Config file | Aucun fichier playwright.config.ts détecté — Wave 0 |
| Quick run | `npx playwright test --project=chromium` |
| Full suite | `npx playwright test` |

### Phase Requirements → Test Map

| Req ID | Comportement | Type de test | Commande automatisée | Fichier existe ? |
|--------|-------------|-------------|---------------------|-----------------|
| SEQ-01 | Bouton "Démarrer séquence" visible dans le drawer | E2E / smoke | `npx playwright test tests/seq-01-start-button.spec.ts` | ❌ Wave 0 |
| SEQ-02 | Drag-and-drop crée une instance de séquence en DB | Integration | Test manuel via SQL + drag UI | ❌ Wave 0 |
| SEQ-03 | Clic WhatsApp ouvre wa.me avec bon numéro | Manuel | Vérification visuelle navigateur | — |
| SEQ-04 | POST /api/crm/actions/email retourne 200 avec mock Brevo | Unit/API | `npx playwright test tests/seq-04-email-route.spec.ts` | ❌ Wave 0 |
| SEQ-05 | POST /api/crm/actions/sms retourne 200 avec mock Brevo | Unit/API | Manuel (requiert clé Brevo) | — |
| SEQ-06 | Rappel crée une interaction `type='appel', is_honored=false` | Integration | Vérification SQL après exécution | ❌ Wave 0 |
| SEQ-07 | LinkedIn ouvre URL + copie dans clipboard | Manuel | Vérification visuelle | — |
| SEQ-08 | Drawer affiche statuts étapes pour instance active | E2E | `npx playwright test tests/seq-08-status-display.spec.ts` | ❌ Wave 0 |
| SEQ-09 | Bouton Annuler met status='cancelled' en DB | Integration | Vérification SQL après click | ❌ Wave 0 |
| SEQ-10 | Chaque action crée une entrée dans interactions | Integration | Vérification SQL count | ❌ Wave 0 |

### Wave 0 Gaps

- [ ] `playwright.config.ts` — configuration de base Playwright pour localhost:3000
- [ ] `tests/seq-01-start-button.spec.ts` — smoke test présence bouton dans drawer
- [ ] `tests/seq-08-status-display.spec.ts` — affichage statuts étapes

*(Tests API route et intégration DB réalisés manuellement pour cette phase MVP.)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Contrôle standard |
|---------------|---------|------------------|
| V2 Authentication | oui | `getUser()` dans chaque Route Handler — pattern établi Phase 1 |
| V3 Session Management | non | Géré par middleware existant Phase 0 |
| V4 Access Control | oui | `.eq('user_id', user.id)` sur toutes les requêtes + RLS Supabase |
| V5 Input Validation | oui | Zod v4 avec `.issues` sur tous les body entrants |
| V6 Cryptographie | non | Pas de crypto custom — clés API en env vars |

### Threat Patterns pour ce stack

| Pattern | STRIDE | Mitigation standard |
|---------|--------|---------------------|
| Injection SQL via prospect_id / template_id | Tampering | Validation Zod `z.string().uuid()` + requêtes Supabase paramétrées |
| Accès aux séquences d'un autre utilisateur | Elevation of Privilege | `.eq('user_id', user.id)` sur toutes les requêtes sequences + RLS |
| BREVO_API_KEY exposée dans le bundle client | Information Disclosure | Variable côté serveur uniquement (`process.env.BREVO_API_KEY`) — jamais `NEXT_PUBLIC_` |
| XSS via templates de message interpolés | Tampering | Templates interpolés dans des API calls (pas rendus en HTML brut) — faible risque |
| Double-exécution d'étapes par le cron | Tampering | Vérifier `status != 'sent'` avant exécution, mettre à jour status immédiatement |
| Spoofing user_id dans le body de la requête | Spoofing | `user_id` toujours issu de `getUser()` — jamais du body de la requête |

---

## Sources

### Primary (HIGH confidence)

- `src/app/(dashboard)/crm/page.tsx` — structure ProspectDrawer, patterns WhatsApp existants [VERIFIED: codebase]
- `src/app/api/pipeline/move/route.ts` — point d'injection SEQ-02 [VERIFIED: codebase]
- `supabase/migrations/001_init_schema.sql` — schéma existant, enums, tables [VERIFIED: codebase]
- `supabase/migrations/003_functions.sql` — fonctions RPC et triggers existants [VERIFIED: codebase]
- `src/lib/api.ts` — helpers apiSuccess/apiError/apiUnauthorized [VERIFIED: codebase]
- `src/lib/supabase/server.ts` — createSupabaseServerClient pattern [VERIFIED: codebase]
- `package.json` — stack installé, versions confirmées [VERIFIED: codebase]

### Secondary (MEDIUM confidence)

- Brevo REST API email endpoint `POST /v3/smtp/email` — format body et headers [CITED: https://developers.brevo.com/reference/sendtransacemail]
- Brevo REST API SMS endpoint `POST /v3/transactionalSMS/sms` — format body [CITED: https://developers.brevo.com/reference/sendtransacsmS-1]
- WhatsApp `wa.me` deep link format — pattern déjà dans le codebase [VERIFIED: crm/page.tsx ligne 355]

### Tertiary (LOW confidence)

- Disponibilité Supabase Edge Functions en local — nécessite confirmation de l'environnement utilisateur [ASSUMED]

---

## Metadata

**Confidence breakdown:**

| Domaine | Niveau | Raison |
|---------|--------|--------|
| Standard stack | HIGH | package.json lu directement — versions confirmées |
| Architecture patterns | HIGH | Codebase analysée, patterns Phase 1 établis et reproduits |
| Schéma DB séquences | HIGH | Basé sur schéma existant, conventions cohérentes |
| Intégration Brevo REST | MEDIUM | API documentée publiquement, pas de test live en session |
| Supabase Edge Functions cron | LOW | Disponibilité locale non vérifiée — dépend de l'env de Ted |
| Pitfalls | HIGH | Dérivés de l'analyse directe du code et des contraintes de l'enum DB |

**Research date:** 2026-05-10
**Valid until:** 2026-06-10 (stable — APIs Brevo et Supabase changent rarement leur REST interface)
