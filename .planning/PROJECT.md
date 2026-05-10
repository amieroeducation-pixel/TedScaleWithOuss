# Ted Scale With Ouss

## What This Is

Dashboard personnel de pilotage pour Conseiller en Gestion de Patrimoine (CGP) indépendant. Il centralise pipeline client, suivi des commissions, relances multicanales automatisées, et KPIs hebdomadaires dans une interface dark/gold premium. L'outil tourne en local sur Windows et remplace la gestion fragmentée entre tableurs, WhatsApp et agenda papier.

## Core Value

**Avoir sur un seul écran tout ce qu'il faut faire aujourd'hui** — relances prioritaires, alertes clients inactifs, CA en temps réel — sans aller chercher l'information ailleurs.

## Requirements

### Validated

- ✓ Authentification Supabase Auth avec redirect automatique — Phase 0
- ✓ Layout sidebar + header "Ted Scale With Ouss" — Phase 0
- ✓ Kanban CRM dnd-kit (6 colonnes : À contacter → RDV1 → RDV2 → RDV3 → Converti → Perdu) — Phase 0
- ✓ Déplacement prospect entre colonnes persisté en BDD (pipeline_events) — Phase 0
- ✓ Schéma Supabase complet (10 tables, RLS, 4 migrations appliquées) — Phase 0
- ✓ API route `/api/prospects` CRUD — Phase 0
- ✓ API route `/api/pipeline/move` — Phase 0
- ✓ API route `/api/revenue/stats` — Phase 0
- ✓ Toasts Sonner dans le layout dashboard — Phase 0

### Active

**Wiring données réelles**
- [ ] Page Revenue/Stats branchée sur Supabase (CA mensuel, objectifs, graphiques par produit)
- [ ] Page Clients actifs branchée sur `get_client_health_alerts()` (alertes, dernière interaction)
- [ ] Page Weekly Signal branchée sur vraies données (relances J+7, RDV semaine, alertes KPI)
- [ ] Page Analytics branchée sur `v_pipeline_conversion` (taux par étape, closing par produit)

**Séquences multicanales**
- [ ] Séquences activables depuis les cartes prospects (bouton "Démarrer séquence" dans le drawer)
- [ ] Déclenchement auto des séquences au changement de stade pipeline
- [ ] Séquences multicanales : WhatsApp Business, Email Brevo, SMS, Rappel appel interne, LinkedIn
- [ ] Étapes de séquence horodatées (J+0, J+2, J+5...) avec statut d'exécution

**Système de configuration**
- [ ] Page Paramètres : séquences par stade pipeline configurables (actions, canaux, délais)
- [ ] Seuils et objectifs configurables (KPI CA, seuils alerte client health, nombre jours)
- [ ] Templates messages configurables par canal et par stade (WhatsApp, Email, SMS)
- [ ] Triggers configurables : choisir ce qui est automatique vs manuel par stade

**Système d'artefacts / achievements**
- [ ] Badge + notification visuelle quand un objectif KPI est atteint (CA mensuel, nombre clients)
- [ ] Message de célébration avec animation (fire/confetti du design Claude) quand objectif CA atteint
- [ ] Historique des objectifs atteints (timeline des succès)

**Automatisations (Supabase Edge Functions)**
- [ ] Rapport hebdomadaire auto email (Brevo) — lundi 8h
- [ ] Alertes quotidiennes Client Health (email/SMS si client sans contact depuis X jours)
- [ ] Rappels WhatsApp RDV J-1 via WhatsApp Business API
- [ ] Alerte si CA mensuel < seuil défini

### Out of Scope

- Déploiement Vercel — testé et validé en local d'abord
- Import données existantes (Google Sheets, CSV) — Phase ultérieure
- Application mobile — dashboard PC uniquement
- Multi-utilisateurs / équipe — usage solo CGP
- LinkedIn API officielle — bouton ouvre le profil manuellement (API trop restrictive)

## Context

**Codebase existante :** Next.js 15 App Router, 22 routes déjà créées, middleware auth guard, layout complet. Supabase projet `vqtzcxvmzznbepyvlcut`, 4 migrations appliquées, user `amiero.education@gmail.com` créé et confirmé.

**Design system :** Thème dark/gold PSG Cosmos — `bg #0a0a0a`, gold `#c9a84c`, sidebar `#0f0f0f`. Inline CSS via `src/lib/theme.ts`. Animations et design assets générés via le skill `frontend-design` de Claude (fire animations, confetti, badges premium).

**Stack technique :** Next.js 15 · Supabase (PostgreSQL + RLS) · shadcn/ui · Tailwind CSS v4 · dnd-kit · Recharts · TanStack Query v5 · React Hook Form + Zod v4 · Zustand · Sonner toasts.

**Intégrations :** Brevo (email + SMS), WhatsApp Business API, Google Calendar (OAuth2 bidirectionnel), Google Places API (scraping TNS légal).

**SMS :** Provider non décidé — options envisagées : Brevo SMS (inclus Brevo), Onoff (app iPhone), ou SMS depuis Windows. À cadrer lors de l'implémentation.

**Pages déjà fonctionnelles :** `/login`, `/crm` (Kanban temps réel).
**Pages encore mockées :** `/revenue`, `/clients`, `/today` (Weekly Signal), `/analytics`.

## Constraints

- **Stack** : Next.js 15 App Router uniquement — pas de Pages Router, pas de migration
- **Auth** : Supabase Auth SSR (`@supabase/ssr` v0.10) avec `getUser()` dans middleware
- **Zod** : Version 4 — `.issues` (pas `.errors`), `PropertyKey[]` pour les paths
- **Design** : Thème dark/gold inline CSS — pas de migration vers shadcn/ui default tokens
- **Scope local** : Validé en local avant tout déploiement

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Inline CSS via theme.ts au lieu de shadcn tokens | Contrôle total du thème PSG Cosmos sans overrides Tailwind complexes | — Pending |
| `getUser()` dans middleware.ts (pas `getSession()`) | `getSession()` ne valide pas le JWT côté serveur — faille sécurité | ✓ Good |
| Zod v4 avec `.issues` | Breaking change Zod v4 — `.errors` n'existe plus | ✓ Good |
| Supabase CLI pour migrations (pas SQL editor) | Dashboard Supabase inaccessible depuis la machine de Ted | ✓ Good |
| SMS provider non décidé | Plusieurs options gratuites/Onoff à évaluer selon coût et UX | — Pending |
| Séquences déclenchables manuellement ET auto | Maximum de flexibilité pour adapter selon le prospect | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-10 after initialization*
