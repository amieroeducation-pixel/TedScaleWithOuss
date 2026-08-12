# Plan Complet — Rendre TOUT Opérationnel de A à Z

**Dashboard TedScaleWithOuss** — Roadmap pour atteindre 100% fonctionnel + features vitales

---

## 📊 ÉTAT ACTUEL vs CIBLE

### État Actuel (2026-08-11)

| Métrique | Valeur | Détail |
|----------|--------|--------|
| **Actions base documentées** | 294 | 9 stories killer-saas |
| **Actions opérationnelles** | 283 (96%) | ✅ Testé manuellement |
| **Actions partielles** | 6 (2%) | ⚠️ Fonctionne avec limitations |
| **Actions non implémentées** | 20 (8%) | ❌ Manquantes (dont 15 sur s08+s09) |
| **Actions vitales identifiées** | 49 | Non documentées dans diagnostique initial |
| **Productivité CGP** | 6/10 | Utilisable mais friction |

### Cible Finale

| Métrique | Valeur | Détail |
|----------|--------|--------|
| **Actions totales** | 343 | 294 base + 49 vitales |
| **Actions opérationnelles** | 343 (100%) | ✅ TOUT fonctionne |
| **Actions partielles** | 0 (0%) | ⚠️ Toutes corrigées |
| **Actions non implémentées** | 0 (0%) | ❌ Toutes implémentées |
| **Actions vitales livrées** | 49 (100%) | Killer features + Pro features |
| **Productivité CGP** | 9/10 | Dashboard killer |

---

## 🎯 PHASES D'IMPLÉMENTATION

### PHASE 0 — Quick Wins (1 session, 1h05)

**Objectif** : Corriger quick wins ⚠️/❌ effort < 15min

**Actions** :

| # | Action | Type | Effort |
|---|--------|------|--------|
| 1 | s02-today #36 — Marquer Export Fantastical ✅ | Doc update | 0min |
| 2 | s06-tns #31 — Retirer tabs métiers hardcodés | Code cleanup | 5min |
| 3 | s03-crm #23 — Câbler bouton "Nouveau prospect" | onClick handler | 15min |
| 4 | s03-crm #32 — Toast erreur si UUID invalide | Validation | 10min |
| 5 | s03-crm #24 — Analyser ProspectEditForm | Code review | 15min |
| 6 | s03-crm #92 — Fix scrollIntoView retry logic | Bug fix | 20min |

**Livrable** : 6 actions corrigées, 97% opérationnel (289/294)

**Tests validation** :
```powershell
# Lancer serveur dev
npm run dev

# Tester s06-tns
1. Naviguer /prospection/tns
2. Vérifier tabs métiers absents ✅

# Tester s03-crm
1. Naviguer /crm
2. Clic "Nouveau prospect" → modal s'ouvre ✅
3. URL /crm?prospect=invalid → toast erreur ✅
4. URL /crm?prospect=valid-uuid → scroll + highlight ✅
5. Éditer prospect → formulaire complet ✅
```

---

### PHASE 1 — Fiabilisation Stories Déployées (2 sessions, 4h15)

**Objectif** : 100% opérationnel sur 7/9 stories

**Sous-phase 1A : s01-menu Sections sommeil** (1h15)

| # | Tâche | Fichier | Effort |
|---|-------|---------|--------|
| 1 | Migration DB colonne `menu_sections_visible jsonb` | `supabase/migrations/009_add_menu_visibility.sql` | 5min |
| 2 | Créer TabMenu composant | `src/app/(dashboard)/settings/shared.tsx` | 30min |
| 3 | Ajouter onglet "Menu" settings | `src/app/(dashboard)/settings/page.tsx` | 15min |
| 4 | Filtrer NAV_SECTIONS selon settings | `src/app/(dashboard)/layout.tsx` | 20min |
| 5 | Tests manuels (toggle + reload) | Navigateur | 5min |

**Livrable** : s01-menu 100% (12/12 actions ✅)

---

**Sous-phase 1B : s04-tasks Persistence + Drag-drop** (3h)

| # | Tâche | Fichier | Effort |
|---|-------|---------|--------|
| 1 | Fix persistence checkbox (debounce + retry) | `src/app/(dashboard)/tasks/page.tsx` | 1h |
| 2 | Installer dnd-kit | `npm install @dnd-kit/core @dnd-kit/sortable` | 5min |
| 3 | Wrap colonnes DndContext | `src/app/(dashboard)/tasks/page.tsx` | 30min |
| 4 | Implémenter onDragEnd handler | `src/app/(dashboard)/tasks/page.tsx` | 45min |
| 5 | useSortable() dans TaskCard | `src/components/TaskCard.tsx` | 30min |
| 6 | Tests manuels (cocher + drag-drop) | Navigateur | 10min |

**Livrable** : s04-tasks 100% (38/38 actions ✅)

---

**Récapitulatif Phase 1** :
- **Effort** : 4h15
- **Livrable** : 7/9 stories 100% opérationnel (s01, s02, s03, s04, s05, s06, s07)
- **Métriques** : 291/294 base ✅ (99%)

---

### PHASE 2 — Story s08-booking Page Publique RDV (3 sessions, 9h)

**Objectif** : Feature killer CGP = prise RDV en ligne

**Sprint s08** :

| # | Tâche | Fichier | Effort |
|---|-------|---------|--------|
| 1 | Migration DB table `bookings` | `supabase/migrations/010_create_bookings.sql` | 15min |
| 2 | Route page publique `/booking/[slug]` | `src/app/booking/[slug]/page.tsx` | 1h |
| 3 | Middleware auth exclusion `/booking` | `src/middleware.ts` | 10min |
| 4 | API GET `/api/booking/slots` (Calendar) | `src/app/api/booking/slots/route.ts` | 2h |
| 5 | Formulaire prise RDV + validation zod | `src/app/booking/[slug]/page.tsx` | 1h |
| 6 | API POST `/api/booking/reserve` | `src/app/api/booking/reserve/route.ts` | 1h30 |
| 7 | Créer événement Google Calendar | `src/lib/calendar.ts` | 1h |
| 8 | Email confirmation Brevo (.ics) | `src/lib/brevo.ts` | 1h |
| 9 | Page `/booking/success` | `src/app/booking/success/page.tsx` | 30min |
| 10 | Tests E2E Playwright | `tests/booking.spec.ts` | 45min |

**Livrable** : s08-booking 100% (8/8 actions ✅)

**Tests validation** :
```powershell
# Tests manuels
1. URL /booking/ted-ouss → page accessible sans login ✅
2. Calendrier affiche 14 jours créneaux ✅
3. Créneaux occupés masqués ✅
4. Remplir formulaire → Confirmer ✅
5. Event créé Google Calendar ✅
6. Email Brevo reçu avec .ics ✅
7. Ligne bookings DB insérée ✅
8. Page /booking/success affichée ✅

# Tests E2E Playwright
npx playwright test --grep "booking"
```

---

### PHASE 3 — Story s09-rappels SMS Automatiques (2 sessions, 7h)

**Objectif** : Kill no-show avec rappels SMS J-1 et H-1

**Sprint s09** :

| # | Tâche | Fichier | Effort |
|---|-------|---------|--------|
| 1 | Migration DB colonnes `sms_*_sent` | `supabase/migrations/011_add_sms_tracking.sql` | 10min |
| 2 | Helper Brevo SMS API | `src/lib/brevo-sms.ts` | 1h |
| 3 | Templates SMS + interpolation | `src/lib/sms-templates.ts` | 1h |
| 4 | API POST `/api/cron/rdv-reminder` | `src/app/api/cron/rdv-reminder/route.ts` | 2h |
| 5 | Logique checkUpcoming + sendSMS24h/1h | `src/lib/rdv-reminders.ts` | 1h30 |
| 6 | Onglet Settings "Rappels SMS" | `src/app/(dashboard)/settings/shared.tsx` | 1h |
| 7 | Task Scheduler Windows config | PowerShell script | 30min |
| 8 | Tests cron simulés (ngrok) | Terminal | 30min |

**Livrable** : s09-rappels 100% (7/7 actions ✅)

**Configuration cron** :
```powershell
# Task Scheduler Windows (toutes les heures)
$action = New-ScheduledTaskAction -Execute "pwsh.exe" `
  -Argument "-Command Invoke-WebRequest -Uri 'http://localhost:3000/api/cron/rdv-reminder' -Method POST -Headers @{'Authorization'='Bearer CRON_SECRET_TOKEN'}"

$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) `
  -RepetitionInterval (New-TimeSpan -Hours 1) `
  -RepetitionDuration (New-TimeSpan -Days 365)

Register-ScheduledTask -TaskName "TedScaleWithOuss-RDVReminder" `
  -Action $action -Trigger $trigger -Force
```

**Tests validation** :
```powershell
# Test manuel cron
# 1. Créer booking demain 10h dans DB
# 2. Lancer cron manuellement
Invoke-WebRequest -Uri "http://localhost:3000/api/cron/rdv-reminder" -Method POST

# 3. Vérifier logs cron_logs table
# 4. Vérifier SMS envoyé (Brevo dashboard)
# 5. Vérifier flag sms_24h_sent = true dans bookings
```

---

**Récapitulatif Phases 2+3** :
- **Effort** : 16h
- **Livrable** : 9/9 stories 100% opérationnel
- **Métriques** : 306/306 base ✅ (100%)

---

### PHASE 4 — Killer Features (2 semaines, 11h30)

**Objectif** : Boost productivité immédiat CGP

**Sprint Killer Features** :

| # | Feature | Fichiers | Effort | Priorité |
|---|---------|----------|--------|----------|
| 1 | **Raccourcis clavier ⌘K** | Command Palette composant | 2h | 🔥 |
| 2 | **Tâches liées prospects** | tasks table + CRM fiche | 1h30 | 🔥 |
| 3 | **Alertes inactivité CRM** | Badge rouge + cron check | 2h | 🔥 |
| 4 | **Priorisation journée** | Algo score Today page | 2h | 🔥 |
| 5 | **Buffer time auto Calendar** | Settings + Calendar logic | 1h | 🔥 |
| 6 | **Rappels follow-up auto** | Nurturing + tasks création | 2h | 🔥 |
| 7 | **Notifications échéance** | Web Notifications API | 1h | 🔥 |

**Livrable** : 7 features killer testées + docs

**Tests validation** :
```powershell
# Feature 1 : Raccourcis clavier
1. ⌘K → palette s'ouvre ✅
2. Taper "tasks" → filtre options ✅
3. ⌘D direct → Dashboard ✅

# Feature 2 : Tâches liées prospects
1. Créer tâche → dropdown "Lier prospect" ✅
2. Fiche CRM → section "Tâches liées" ✅

# Feature 3 : Alertes inactivité
1. Prospect négociation + 7j silence → badge rouge ✅
2. Clic badge → modal relance ✅

# Feature 4 : Priorisation journée
1. Page Today → top 5 priorité highlighted ✅
2. Score urgence = deadline × importance ✅

# Feature 5 : Buffer time
1. Settings Calendar → "Buffer 15min" activé ✅
2. Créer RDV 10h → event 9h45-11h15 ✅

# Feature 6 : Rappels follow-up
1. Message envoyé sans réponse 3j → task créée ✅
2. Task = "Relancer M. Dupont" ✅

# Feature 7 : Notifications échéance
1. Tâche échue aujourd'hui → notification navigateur ✅
2. Clic notif → ouvre page Tasks ✅
```

---

### PHASE 5 — Features Pro (3 semaines, 22h30)

**Objectif** : Niveau SaaS pro CGP (Pipedrive/HubSpot)

**Sprint Features Pro** :

| # | Feature | Description | Effort | Priorité |
|---|---------|-------------|--------|----------|
| 1 | **Pipeline analytics** | Graphique conversion par étape CRM | 3h | 🔥 |
| 2 | **Séquences conditionnelles** | IF/ELSE dans nurturing séquences | 5h | 🔥 |
| 3 | **Pomodoro intégré** | Timer 25min + tracking temps tâches | 2h30 | 🟡 |
| 4 | **Recherche globale ⌘F** | Search cross-sections (prospects+tasks+interactions) | 3h | 🔥 |
| 5 | **Sync temps réel Calendar** | WebSocket Calendar events | 4h | 🟡 |
| 6 | **Récurrence tâches** | Hebdo/mensuel (rrule RFC 5545) | 3h | 🔥 |
| 7 | **Questions pré-RDV custom** | Formulaire booking avec questions custom | 2h | 🟡 |

**Livrable** : Dashboard = niveau SaaS pro

---

### PHASE 6 — Polish (optionnel, 4 semaines, 26h+)

**Objectif** : Différenciation ultime + ML/IA

**Sprint Polish** :

| # | Feature | Description | Effort | Priorité |
|---|---------|-------------|--------|----------|
| 1 | **Scoring prédictif ML** | Probabilité conversion prospects | 8h | 🟢 |
| 2 | **Suggestions IA journée** | IA proactive recommandations | 6h | 🟢 |
| 3 | **A/B testing templates** | Test 2 versions email nurturing | 4h | 🟢 |
| 4 | **Fusion doublons CRM** | Détection + merge prospects | 4h | 🟢 |
| 5 | **Notes vocales Whisper** | Transcription auto notes | 4h | 🟢 |

**Livrable** : Dashboard = meilleur outil CGP France

---

## 📅 PLANNING GLOBAL

### Timeline Recommandée

| Phase | Durée | Effort | Dates | Livrable |
|-------|-------|--------|-------|----------|
| **Phase 0** | 1 session | 1h | Semaine 1 | Quick wins corrigés (97%) |
| **Phase 1** | 2 sessions | 4h15 | Semaine 1 | 7/9 stories 100% (99%) |
| **Phase 2** | 3 sessions | 9h | Semaine 2-3 | s08-booking (8/8 ✅) |
| **Phase 3** | 2 sessions | 7h | Semaine 3-4 | s09-rappels (7/7 ✅) |
| **Phase 4** | 5 sessions | 11h30 | Semaine 5-6 | 7 killer features |
| **Phase 5** | 9 sessions | 22h30 | Semaine 7-9 | 7 features pro |
| **Phase 6** | 10 sessions | 26h+ | Semaine 10-13 | Polish + ML/IA |
| **TOTAL** | **32 sessions** | **81h15+** | **3 mois** | **343/343 actions ✅** |

---

### Planning Alternatif (Focus Rapid ROI)

**Si contrainte temps → Focus Phases 0-4 uniquement**

| Phase | Durée | Effort | Livrable |
|-------|-------|--------|----------|
| Phase 0-1 | 1 semaine | 5h15 | 99% base opérationnel |
| Phase 2-3 | 2 semaines | 16h | 100% base (9/9 stories) |
| Phase 4 | 2 semaines | 11h30 | + 7 killer features |
| **TOTAL** | **5 semaines** | **32h45** | **313/343 actions ✅ (91%)** |

**Impact** : Productivité CGP 8/10, NPS 50+ (très bon ROI)

---

## 🛠️ RESSOURCES REQUISES

### Développement

**Packages npm** :
```bash
# Phase 1
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Phase 2-3
# (packages existants Supabase + Brevo + Google Calendar)

# Phase 4
npm install @headlessui/react react-hotkeys-hook fuse.js use-sound

# Phase 5
npm install recharts rrule ws
npm install @types/ws --save-dev

# Phase 6 (optionnel)
npm install openai scikit-learn stripe
```

**Infra** :
- **Supabase CLI** : Migrations 009, 010, 011
- **Task Scheduler Windows** : Cron rappels SMS
- **Brevo SMS API** : Clé API + crédit SMS (~100 SMS/mois = 5€)
- **Google Calendar API** : Tokens OAuth déjà configurés

**Coûts estimés** :
- **Brevo SMS** : 5€/mois (100 SMS)
- **Supabase** : Plan gratuit OK (< 500 MB DB)
- **Cloud Run** : 10€/mois (déjà déployé)
- **APIs tierces** : 0€ (quotas gratuits suffisent)

**Total** : ~15€/mois infrastructure

---

### Équipe

**Option A — Solo CGP/Dev** :
- Ted code + teste lui-même
- Rythme : 2h/jour = 1 phase/semaine
- Timeline : 13 semaines (3 mois) pour Phase 0-6 complètes

**Option B — Avec freelance** :
- Ted pilote + teste
- Freelance code (2j/semaine)
- Timeline : 6 semaines pour Phase 0-5
- Coût : 8 jours × 400€ = 3200€

**Recommandation** : Option A (autonomie + budget maîtrisé)

---

## 📊 MÉTRIQUES SUCCÈS

### KPIs Phase 0-1 (Fiabilisation)

| Métrique | Avant | Cible | Mesure |
|----------|-------|-------|--------|
| Actions opérationnelles | 283/294 (96%) | 291/294 (99%) | Tests manuels |
| Bugs critiques | 6 | 0 | GitHub Issues |
| Stories 100% | 2/9 | 7/9 | Tableaux diagnostique |
| Satisfaction utilisateur | 7/10 | 8/10 | Survey 1 question |

---

### KPIs Phase 2-3 (Stories s08+s09)

| Métrique | Avant | Cible | Mesure |
|----------|-------|-------|--------|
| Actions opérationnelles | 291/294 | 306/306 (100%) | Tests manuels |
| Stories complètes | 7/9 | 9/9 | Diagnostique final |
| Booking conversions | 0 | 5 RDV/mois | Analytics bookings table |
| No-show rate | 30% | 10% | Avant/après SMS |

---

### KPIs Phase 4 (Killer Features)

| Métrique | Avant | Cible | Mesure |
|----------|-------|-------|--------|
| Temps moyen tâche quotidienne | 45min | 30min (-33%) | Time tracking |
| Raccourcis clavier utilisés | 0% | 70% actions | Analytics events |
| Prospects relancés auto | 0 | 15/mois | Cron logs |
| Productivité perçue | 6/10 | 8/10 | Survey |

---

### KPIs Phase 5 (Features Pro)

| Métrique | Avant | Cible | Mesure |
|----------|-------|-------|--------|
| Taux conversion pipeline | 15% | 20% (+33%) | Analytics CRM |
| Tâches récurrentes auto | 0 | 12/mois | Tasks table |
| Temps réponse prospects | 2j | 4h | Interactions table |
| NPS | 30 | 70 | Survey NPS |

---

## ✅ VALIDATION FINALE

### Checklist Phase 0-1 (Fiabilisation)

- [ ] Phase 0 : 6 quick wins corrigés
- [ ] s01-menu : Sections sommeil Settings
- [ ] s04-tasks : Persistence checkbox + drag-drop
- [ ] Tests manuels : 291/294 actions ✅
- [ ] Commit : `feat: fiabilisation stories déployées (99%)`
- [ ] Deploy Cloud Run : Tag `v1.1-fiabilisation`

---

### Checklist Phase 2-3 (Stories s08+s09)

- [ ] Phase 2 : s08-booking page publique
- [ ] Migration DB : table bookings
- [ ] API : GET /slots + POST /reserve
- [ ] Intégration : Google Calendar + Brevo email
- [ ] Tests E2E : Playwright booking.spec.ts
- [ ] Phase 3 : s09-rappels SMS
- [ ] Migration DB : colonnes sms_sent
- [ ] API : POST /cron/rdv-reminder
- [ ] Intégration : Brevo SMS API
- [ ] Task Scheduler : Cron Windows configuré
- [ ] Tests : 306/306 actions ✅
- [ ] Commit : `feat: booking page + rappels SMS (100% base)`
- [ ] Deploy Cloud Run : Tag `v2.0-complete`

---

### Checklist Phase 4 (Killer Features)

- [ ] Feature 1 : Command Palette ⌘K
- [ ] Feature 2 : Tâches liées prospects
- [ ] Feature 3 : Alertes inactivité CRM
- [ ] Feature 4 : Priorisation journée algo
- [ ] Feature 5 : Buffer time auto Calendar
- [ ] Feature 6 : Rappels follow-up auto
- [ ] Feature 7 : Notifications échéance
- [ ] Tests : 313/343 actions ✅
- [ ] Commit : `feat: 7 killer features productivité`
- [ ] Deploy Cloud Run : Tag `v2.1-killer-features`

---

### Checklist Phase 5 (Features Pro)

- [ ] Feature 1 : Pipeline analytics (graphiques)
- [ ] Feature 2 : Séquences conditionnelles IF/ELSE
- [ ] Feature 3 : Pomodoro intégré
- [ ] Feature 4 : Recherche globale ⌘F
- [ ] Feature 5 : Sync temps réel WebSocket
- [ ] Feature 6 : Récurrence tâches (rrule)
- [ ] Feature 7 : Questions pré-RDV custom
- [ ] Tests : 320/343 actions ✅
- [ ] Commit : `feat: 7 features pro (niveau SaaS)`
- [ ] Deploy Cloud Run : Tag `v3.0-pro`

---

## 🚀 LANCEMENT

### Commandes Développement

```powershell
# Cloner repo
cd "C:\Users\Ted\Documents\Obsidian Vault\TedScaleWithOuss"

# Installer dépendances Phase 1
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Créer migrations Supabase
npx supabase migration new add_menu_visibility
npx supabase migration new create_bookings
npx supabase migration new add_sms_tracking

# Lancer dev
npm run dev

# Tests
npx playwright test

# Build production
npm run build

# Deploy Cloud Run
.\deploy-cloudrun.ps1 -ProjectId integration-make-365608
```

---

### Commandes Tests

```powershell
# Tests manuels Phase 0
# 1. Naviguer chaque quick win
# 2. Vérifier comportement attendu
# 3. Cocher checklist validation

# Tests E2E Phase 2
npx playwright test --grep "booking"

# Tests cron Phase 3
Invoke-WebRequest -Uri "http://localhost:3000/api/cron/rdv-reminder" -Method POST

# Tests killer features Phase 4
# 1. ⌘K → palette
# 2. Créer tâche liée prospect
# 3. Vérifier alertes inactivité
# etc.
```

---

## 📚 DOCUMENTATION FINALE

### Documents à Créer/Mettre à Jour

**Phase 0-1** :
- [x] `docs/DIAGNOSTIQUE-ACTIONS-NON-OPERATIONNELLES.md` (créé)
- [ ] `docs/DIAGNOSTIQUE-TOUS-TABLEAUX-ASCII.md` (mettre à jour statuts)
- [ ] `docs/DIAGNOSTIQUE-SYNTHESE-GLOBALE.md` (mettre à jour métriques)

**Phase 2-3** :
- [ ] `docs/s08-booking-implementation.md` (guide technique)
- [ ] `docs/s09-rappels-implementation.md` (guide cron)
- [ ] `README.md` (section Booking + Rappels)

**Phase 4-5** :
- [x] `docs/DIAGNOSTIQUE-ACTIONS-VITALES-MANQUANTES.md` (créé)
- [ ] `docs/killer-features-guide.md` (guide utilisateur)
- [ ] `docs/features-pro-guide.md` (guide utilisateur)

**Phase 6** :
- [ ] `docs/ml-scoring-guide.md` (si implémenté)
- [ ] `docs/ia-suggestions-guide.md` (si implémenté)

---

## 🏆 SUCCÈS FINAL

### Dashboard TedScaleWithOuss v3.0

**Métriques** :
- ✅ **343/343 actions opérationnelles** (100%)
- ✅ **9/9 stories complètes** (s01-s09)
- ✅ **49 features vitales** (7 killer + 7 pro + 5 polish)
- ✅ **Productivité CGP** : 9/10
- ✅ **NPS** : 70+

**Résultat** :
🏆 **Meilleur Dashboard CGP France**

---

**Document créé le** : 2026-08-11  
**Auteur** : Process standardisé TedScaleWithOuss  
**Statut** : Plan complet A→Z  
**Prochaine étape** : Phase 0 Quick Wins (1h05)
