# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Ted Scale With Ouss**

Dashboard personnel de pilotage pour Conseiller en Gestion de Patrimoine (CGP) indépendant. Il centralise pipeline client, suivi des commissions, relances multicanales automatisées, et KPIs hebdomadaires dans une interface dark/gold premium. L'outil tourne en local sur Windows et remplace la gestion fragmentée entre tableurs, WhatsApp et agenda papier.

**Core Value:** **Avoir sur un seul écran tout ce qu'il faut faire aujourd'hui** — relances prioritaires, alertes clients inactifs, CA en temps réel — sans aller chercher l'information ailleurs.

### Constraints

- **Stack** : Next.js 15 App Router uniquement — pas de Pages Router, pas de migration
- **Auth** : Supabase Auth SSR (`@supabase/ssr` v0.10) avec `getUser()` dans middleware
- **Zod** : Version 4 — `.issues` (pas `.errors`), `PropertyKey[]` pour les paths
- **Design** : Thème PSG Cosmos — NE PAS TOUCHER le design sans demande explicite de l'utilisateur
- **Scope local** : Validé en local avant tout déploiement
<!-- GSD:project-end -->

<!-- GSD:stack-start source:STACK.md -->
## Technology Stack

- **Framework** : Next.js 15 App Router, TypeScript, `output: 'standalone'` (Docker)
- **Auth** : Supabase Auth SSR — `@supabase/ssr` v0.10, `getUser()` dans middleware.ts
- **DB** : Supabase (PostgreSQL) — project ID `vqtzcxvmzznbepyvlcut`
- **Style** : Inline CSS via `src/lib/theme.ts` — palette PSG Cosmos (bgDeep `#0a0e22`, gold `#e8c878`, ribbon gradient)
- **Email/SMS** : Brevo API
- **Déploiement cible** : Cloud Run (GCP project `integration-make-365608`) OU Vercel
- **OS dev** : Windows — PowerShell, pas de bash natif
<!-- GSD:stack-end -->

## Commands

```powershell
npm run dev          # Serveur de développement (localhost:3000)
npm run build        # Build production (Next.js standalone)
npm run start        # Démarre le serveur standalone après build
npm run lint         # ESLint

# Tests E2E (Playwright)
npx playwright test                          # Tous les tests
npx playwright test --grep "nom du test"     # Test ciblé
npx playwright test --ui                     # Mode UI interactif

# Déploiement Cloud Run
.\deploy-cloudrun.ps1 -ProjectId integration-make-365608
# Pré-requis : Docker Desktop démarré + gcloud auth login effectué
```

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

- Inline CSS uniquement via `C` importé de `src/lib/theme.ts` — aucun Tailwind, aucun shadcn token
- `getUser()` dans middleware.ts (jamais `getSession()`) — validation JWT côté serveur
- Zod v4 : `.issues` (pas `.errors`), `z.record(key, val)` avec 2 args
- Routes API dans `src/app/api/` — pattern Next.js App Router
- Optimistic lock dans executor.ts : status='sent' AVANT appel Brevo (anti-doublon)
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

```
src/
  app/
    (dashboard)/              # Layout principal avec sidebar PSG Cosmos + StarballSVG
      layout.tsx              # ← NE PAS MODIFIER le design sans demande
      dashboard/              # Vue hebdo — Weekly Signal + relances prioritaires
      today/                  # Priorités du jour
      global/                 # Vue globale KPIs
      revenue/                # CA mensuel réel vs objectif + graphique 12 mois
      clients/                # Liste clients actifs + alertes inactivité
      pipeline/               # Pipeline commercial
      crm/                    # Kanban drag-drop (dnd-kit) — prospects par étape
      cercle/                 # Cercle clients (partenaires)
      analytics/              # Taux conversion pipeline + closing PieChart
      achievements/           # Timeline succès + badge sidebar
      automatisations/        # Logs cron_logs + statut Edge Functions
      sequences/              # Séquences multicanales WhatsApp/Email/SMS
      settings/               # Paramètres (KPI, séquences, triggers, templates)
      prospection/
        tns/                  # Recherche TNS via API entreprises.data.gouv.fr (21 codes NAF)
        chefs-entreprise/     # Workflows hebdo/mensuel via API entreprises (SAS/SASU/SARL IDF)
        particuliers/         # Prospection particuliers
      assistant/              # Assistant IA
      simulator/              # Simulateur produits
      scoring/                # Scoring patrimoine
      commerce/               # Outils commerce
      map/                    # Carte zones de prospection TNS
      tasks/                  # Gestion des tâches
    api/
      revenue/                # /api/revenue/stats, /api/revenue/products
      clients/                # /api/clients/list, /api/clients/health
      today/                  # /api/today/signal
      analytics/              # /api/analytics/pipeline, /api/analytics/closing
      settings/               # /api/settings (GET + PATCH)
      crm/sequences/          # CRUD séquences + templates
      cron/                   # /api/cron/weekly-report, client-health, rdv-reminder, ca-alert
      achievements/           # /api/achievements/check, /api/achievements/list
      auth/                   # /api/auth/google-calendar/callback — OAuth Google Calendar
      calendar/               # Intégration Google Calendar
      prospects/              # CRUD prospects
      prospection/
        tns/                  # POST { metier, ville, limite } → appelle API gouvernementale
        chefs/workflow/       # POST { type: 'hebdomadaire' | 'mensuel' } → leads IDF
    login/                    # Page auth Supabase
  lib/
    theme.ts                  # Palette PSG Cosmos — C.bgDeep, C.gold, C.ribbon, etc.
    env.ts                    # Validation Zod des variables d'environnement
    supabase/                 # Clients Supabase (server + client + cron)
    sequences/                # Logique exécution séquences (executor.ts)
  middleware.ts               # Auth redirect — getUser() validé JWT
```

**Supabase migrations** (dans `supabase/migrations/`) :
- 001-004 : schéma initial (prospects, interactions, commissions, settings)
- 005 : séquences multicanales (enums + 4 tables)
- 006 : achievements
- 007 : cron_logs

**Enums clés** : `pipeline_stage` (a_contacter → converti/perdu), `prospect_source` (tns, chefs_entreprise, particuliers, recommandation, linkedin), `interaction_type` (appel, rdv, email, whatsapp, linkedin), `sequence_channel` (whatsapp, email, sms, call_reminder, linkedin)
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills (gstack)

45 skills gstack installés dans `.claude/skills/`. Principaux :
- `/ship` — crée la PR GitHub
- `/land-and-deploy` — merge PR + attend CI + vérifie prod
- `/qa` — tests qualité avant déploiement
- `/design-html` — génère mockup HTML depuis brief
- `/design-review` — review du design existant
- `/health` — santé du projet
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

## État du Projet (mis à jour 2026-05-15)

### ✅ Phases COMPLÈTES + Déploiement actif

| Phase | Description | Statut |
|-------|-------------|--------|
| 1 | Data Wiring — 4 pages branchées Supabase (Revenue, Clients, Today, Analytics) | ✅ |
| 2 | Séquences Multicanales — relances WhatsApp/Email/SMS depuis Kanban | ✅ |
| 3 | Configuration — page Paramètres (KPI, séquences, triggers, templates) | ✅ |
| 4 | Achievements & Artefacts — badges, confetti, timeline succès | ✅ |
| 5 | Automatisations Cron — Edge Functions + logs + Task Scheduler Windows | ✅ |
| 6 | Workflows Prospection — API TNS + Workflow Chefs d'entreprise (IDF) | ✅ |

**Production** : Cloud Run `ted-scale-with-ouss-00006-x8t` → https://ted-scale-with-ouss-272642857923.europe-west1.run.app

### 🔧 Backlog features à activer

- **CRM** : bouton "Nouveau prospect" avec formulaire → POST `/api/prospects`
- **Tasks** : bouton "Nouvelle tâche" avec formulaire
- **Cercle** : sauvegarder partenaires en DB
- **Dashboard Today** : lier grille agenda à Google Calendar API
- **KPIs globaux** : brancher sur données réelles (page `global/`)
- **Carte TNS** : rendre les zones de prospection cliquables
- **Simulator** : export PDF
- **Today** : fix persistance compteur

### Design — RÈGLE ABSOLUE

**Ne jamais modifier `theme.ts` ou `layout.tsx` sans demande explicite de l'utilisateur.**
Le design PSG Cosmos Champions a été choisi et validé par l'utilisateur. Toute modification non demandée est inacceptable.

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
