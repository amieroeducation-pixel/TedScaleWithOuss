# Roadmap: Ted Scale With Ouss

## Overview

Brownfield CGP dashboard — auth, Kanban CRM, and Supabase schema are already done (Phase 0). This roadmap covers the 5 remaining delivery phases: wiring real data into the 4 mocked pages, building the multichannel sequence engine, creating the configuration system, adding achievements/artefacts, and deploying Supabase Edge Function automations.

## Phases

- [ ] **Phase 1: Data Wiring** - Branch the 4 mocked pages onto real Supabase views and APIs
- [ ] **Phase 2: Sequences Multicanales** - Engine de relances activable depuis les cartes prospect
- [ ] **Phase 3: Configuration** - Page Paramètres permettant de configurer séquences, seuils et triggers
- [ ] **Phase 4: Achievements & Artefacts** - Badges, célébrations et historique des objectifs atteints
- [ ] **Phase 5: Automatisations Cron** - Edge Functions Supabase pour rapports et alertes automatiques

## Phase Details

### Phase 1: Data Wiring
**Goal**: Les 4 pages mockées (Revenue, Clients, Weekly Signal, Analytics) affichent des données réelles depuis Supabase
**Mode:** mvp
**Depends on**: Phase 0 (done — auth, Kanban, schéma Supabase complet)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07, DATA-08, DATA-09
**Success Criteria** (what must be TRUE):
  1. La page Revenue affiche le CA mensuel réel vs objectif avec graphique 12 mois et breakdown par produit
  2. La page Clients liste les clients actifs avec date de dernière interaction et alertes d'inactivité colorées
  3. La page Weekly Signal affiche les relances prioritaires des 7 prochains jours et les RDV de la semaine
  4. La page Analytics affiche les taux de conversion par étape pipeline et le taux de closing par produit
  5. Aucune page n'affiche de données fictives ou de placeholder statique
**Plans**: 4 plans
  - [ ] 01A-PLAN.md — Revenue page (DATA-01, DATA-02, DATA-03) — fix enum bug + wire CA/commissions/charts
  - [ ] 01B-PLAN.md — Clients page (DATA-04, DATA-05) — list + health alerts
  - [ ] 01C-PLAN.md — Weekly Signal /today page (DATA-06, DATA-07) — relances 7j + RDV semaine
  - [ ] 01D-PLAN.md — Analytics page (DATA-08, DATA-09) — pipeline conversion + closing PieChart
**UI hint**: yes

### Phase 2: Sequences Multicanales
**Goal**: L'utilisateur peut démarrer, suivre et gérer des séquences de relance multicanales depuis les cartes prospect
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: SEQ-01, SEQ-02, SEQ-03, SEQ-04, SEQ-05, SEQ-06, SEQ-07, SEQ-08, SEQ-09, SEQ-10
**Success Criteria** (what must be TRUE):
  1. Le drawer d'une carte prospect expose un bouton "Démarrer séquence" qui lance une séquence configurée
  2. Déplacer un prospect dans le Kanban déclenche automatiquement la séquence associée au nouveau stade
  3. Une séquence peut exécuter des étapes WhatsApp, Email Brevo, SMS, rappel interne et ouverture LinkedIn
  4. L'utilisateur voit le statut de chaque étape (planifiée / envoyée / échouée) dans l'interface
  5. L'utilisateur peut mettre en pause ou annuler une séquence active, et chaque action est tracée dans `interactions`
**Plans**: TBD
**UI hint**: yes

### Phase 3: Configuration
**Goal**: L'utilisateur peut personnaliser séquences, seuils KPI, templates de messages et triggers depuis une page Paramètres
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: CFG-01, CFG-02, CFG-03, CFG-04, CFG-05, CFG-06, CFG-07, CFG-08, CFG-09
**Success Criteria** (what must be TRUE):
  1. L'utilisateur peut créer, modifier et supprimer des étapes de séquence par stade pipeline avec délais configurables
  2. L'utilisateur peut éditer les templates de messages pour chaque canal (WhatsApp, Email, SMS) et chaque stade
  3. L'utilisateur peut définir les seuils KPI (CA mensuel cible, CA annuel cible, jours d'inactivité)
  4. L'utilisateur peut activer ou désactiver chaque trigger automatique individuellement
  5. Toutes les configurations sont persistées dans `user_settings` et rechargées au démarrage sans perte
**Plans**: TBD
**UI hint**: yes

### Phase 4: Achievements & Artefacts
**Goal**: L'utilisateur reçoit des badges, célébrations visuelles et peut consulter un historique de ses succès
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: ACH-01, ACH-02, ACH-03, ACH-04, ACH-05
**Success Criteria** (what must be TRUE):
  1. Un badge et une notification visuelle apparaissent quand l'objectif CA mensuel est atteint
  2. Une animation fire/confetti se déclenche lors de l'atteinte de l'objectif CA (une seule fois par objectif)
  3. Un badge s'affiche lors de l'atteinte de seuils de clients actifs (10, 25, 50 clients)
  4. L'utilisateur peut consulter la timeline des objectifs atteints avec dates
  5. Les achievements ne se re-déclenchent pas après rechargement de page (persistés en BDD)
**Plans**: TBD
**UI hint**: yes

### Phase 5: Automatisations Cron
**Goal**: Des Edge Functions Supabase envoient automatiquement rapports hebdomadaires et alertes sans action manuelle
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: AUTO-01, AUTO-02, AUTO-03, AUTO-04
**Success Criteria** (what must be TRUE):
  1. Un email de rapport hebdomadaire est reçu chaque lundi à 8h via Brevo
  2. Des alertes Client Health (email ou SMS) sont envoyées quotidiennement pour les clients dépassant le seuil d'inactivité
  3. Un message WhatsApp de rappel RDV est envoyé automatiquement J-1 avant chaque RDV planifié
  4. Une alerte est envoyée si le CA mensuel tombe en dessous du seuil configuré
**Plans**: TBD

## Progress

**Execution Order:** 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Data Wiring | 0/TBD | Not started | - |
| 2. Sequences Multicanales | 1/5 | In Progress|  |
| 3. Configuration | 0/TBD | Not started | - |
| 4. Achievements & Artefacts | 0/TBD | Not started | - |
| 5. Automatisations Cron | 0/TBD | Not started | - |
