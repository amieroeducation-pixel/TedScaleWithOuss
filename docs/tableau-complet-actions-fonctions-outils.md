# Dashboard TedScaleWithOuss — Tableau Exhaustif Actions/Fonctions/Outils

**Méthodologie killer-saas** : Analyse complète des 9 stories pour documenter TOUTES les actions utilisateur, fonctions techniques, outils et statut fonctionnel.

---

## 📊 Résumé Exécutif

| Story | Actions | ✅ Opérationnel | ⚠️ Partiel | ❌ Non implémenté |
|-------|---------|----------------|------------|-------------------|
| s05-nurturing | 47 | 38 | 5 | 4 |
| s01-menu-dynamique | 12 | 9 | 0 | 3 |
| s04-tasks | 38 | 36 | 1 | 1 |
| s03-crm-kanban | 95 | 91 | 3 | 1 |
| s06-prospection-tns | 31 | 30 | 1 | 0 |
| s07-google-calendar | 10 | 10 | 0 | 0 |
| s02-today-refonte | 52 | 51 | 1 | 0 |
| s08-booking-page | 0 | 0 | 0 | 0 (page à créer) |
| s09-rappels-sms | 0 | 0 | 0 | 0 (cron à créer) |
| **TOTAL** | **285** | **265** | **11** | **9** |

**Taux de fonctionnalité globale : 93%** (265/285 actions opérationnelles)

---

## 🎯 Stories analysées (9/9)

### ✅ s05-nurturing-consolidation
**47 actions** documentées dans `docs/nurturing-actions-fonctions-outils.md`
- Contact Management (13 actions)
- Message Sending (10 actions)
- Sequence Management (8 actions)
- Interaction History (5 actions)
- Temperature & Scoring (4 actions)
- Configuration Contact (4 actions)
- Analytics & KPIs (3 actions)

### 📋 s01-menu-dynamique — Menu latéral actif/sommeil
**12 actions** — **9 ✅** / **0 ⚠️** / **3 ❌**

| # | Action | Fonctions | Outils | Statut |
|---|--------|-----------|--------|--------|
| 1-9 | Voir menu, navigation, badges dynamiques, toggle sidebar | NAV_SECTIONS.map(), usePathname, fetch /api/achievements | React, Next.js Link | ✅ |
| 10-12 | **[NON IMPL]** Sections sommeil dans Settings, toggle visibilité, persist DB | — | — | ❌ |

**Actions manquantes** :
- Aucune logique toggle visibilité menu dans settings/page.tsx
- Pas de route `/api/settings/menu-visibility`
- NAV_SECTIONS hardcodé sans champ `visible`

---

### 📋 s04-tasks-fiabilisation — Tâches 100% opérationnel
**38 actions** — **36 ✅** / **1 ⚠️** / **1 ❌**

| # | Action | Fonctions | Outils | Statut |
|---|--------|-----------|--------|--------|
| 13-38 | CRUD complet, filtres (Toutes/Urgentes/Semaine/Terminées), modal détail, cocher, métriques | fetch /api/tasks (GET/POST/PATCH), applyFilter(), TaskCard, PriorityDots | React, fetch API | ✅ (36) |
| 39 | Persister cocher → PATCH | fetch /api/tasks/:id PATCH | — | ⚠️ (dépend DB) |
| 46 | **[NON IMPL]** Drag-drop entre colonnes | — | — | ❌ (dnd-kit absent) |

---

### 📋 s03-crm-kanban-fiabilisation — CRM Kanban sans bugs
**95 actions** — **91 ✅** / **3 ⚠️** / **1 ❌**

| # | Action | Fonctions | Outils | Statut |
|---|--------|-----------|--------|--------|
| 51-145 | Kanban drag-drop 6 colonnes, CRUD prospects, séquences (start/pause/resume), scripts WA/LI, drawer édition, filtres/recherche/tri | @dnd-kit, fetch /api/prospects, /api/pipeline/move, /api/crm/sequences, ProspectCard | dnd-kit, React, fetch | ✅ (91) |
| 89 | Modifier fiche (composant externe) | ProspectEditForm | — | ⚠️ (externe) |
| 98 | Persister pression | fetch PATCH (UUID check) | — | ⚠️ (UUID) |
| 143 | Highlight prospect URL param | DOM query scrollIntoView | — | ⚠️ (incomplet) |

---

### 📋 s06-prospection-tns-fiabilisation — TNS données correctes
**31 actions** — **30 ✅** / **1 ⚠️** / **0 ❌**

| # | Action | Fonctions | Outils | Statut |
|---|--------|-----------|--------|--------|
| 146-176 | Recherche multi-métiers (68), 3 canaux parallèles (Data.gouv + Pappers + Google), déduplication, scoring dynamique, panier persistant, export CSV, exclusion CRM/perdus | POST /api/prospection/tns, inferMetierFromLibelle(), computeLeadScore() | Data.gouv API, Pappers API, Google Places | ✅ (30) |
| 170 | Filtrer base TNS par métier | Tabs hardcodés (medecin/infirmier/kine/avocat) | — | ⚠️ (incomplet) |

---

### 📋 s07-google-calendar-sync — Synchro bidirectionnelle
**10 actions** — **10 ✅** / **0 ⚠️** / **0 ❌**

| # | Action | Fonctions | Outils | Statut |
|---|--------|-----------|--------|--------|
| 177-186 | OAuth Google, refresh token auto, GET événements semaine, POST créer événement, timezone Paris, allDay | GET/POST /api/calendar/events, getValidToken(), OAuth callback | Google Calendar API v3, OAuth2 | ✅ (10) |

---

### 📋 s02-today-refonte — Page Aujourd'hui fiable
**52 actions** — **51 ✅** / **1 ⚠️** / **0 ❌**

| # | Action | Fonctions | Outils | Statut |
|---|--------|-----------|--------|--------|
| 187-238 | Weekly Signal (relances 7j + RDV semaine), timer centisecondes persistant (52min blocs), compteurs jour avec célébrations, agenda éditable + export Fantastical, audio/video players (IndexedDB + YouTube), Kanban relances 4 colonnes, bilan journée | fetch /api/today/signal, localStorage timer, IndexedDB vidéos, CallingSessionPanel | setInterval 10ms, IndexedDB, Audio/Video API, YouTube embed | ✅ (51) |
| 214 | Export Fantastical | fantasticalUrl() génère lien x-callback-url | Fantastical URL scheme | ⚠️ (app externe) |

---

### 📋 s08-booking-page — Page publique prise RDV (Kill Calendly)
**0 actions** — Page à créer (story non démarrée)

**Actions attendues** (d'après `docs/stories.md`) :
1. Voir URL publique `/booking/[slug]`
2. Voir créneaux disponibles semaine (lun-ven)
3. Masquer créneaux occupés Calendar
4. Saisir nom/tel/email
5. Sélectionner créneau
6. Confirmer RDV → POST bookings + Google Calendar
7. Voir confirmation
8. (CGP) Voir RDV dans Today

**Fichiers à créer** : `src/app/booking/[slug]/page.tsx`, table `bookings`, modifier `middleware.ts` pour exclure `/booking` de l'auth

---

### 📋 s09-rappels-sms — Rappels SMS automatiques avant RDV
**0 actions** — Cron à créer (story non démarrée)

**Actions attendues** (d'après `docs/stories.md`) :
1. Cron vérifie RDV à venir
2. Envoyer SMS 24h avant
3. Envoyer SMS 1h avant
4. Personnaliser contenu ({Prénom}, {Date}, {Heure})
5. Configurer délais dans Settings
6. Logger dans cron_logs
7. Anti-doublon (status='sent')

**Fichiers à créer** : `/api/cron/rdv-reminder`, logique Brevo SMS, configuration Settings

---

## 🔧 Outils Utilisés (par story)

### s05-nurturing
- TanStack Query, Supabase, react-hook-form, zod, @radix-ui/react-dialog, @radix-ui/react-dropdown-menu, use-debounce, react-highlight-words, react-day-picker@9, react-time-picker, date-fns-tz, Supabase Storage, react-dropzone, handlebars (installé non utilisé)

### s01-menu
- React (useState, useEffect, usePathname), Next.js Link, CSS inline transitions

### s04-tasks
- React, fetch /api/tasks, PriorityDots, TaskCard, filtres React

### s03-crm
- @dnd-kit/core, @dnd-kit/sortable, React, fetch /api/prospects + /pipeline/move + /crm/sequences + /call-scripts, ProspectEditForm, LinkChip, openWhatsApp, openLinkedIn

### s06-tns
- Data.gouv API, Pappers API, Google Places API, phone-utils, METIERS mapping, scoring dynamique

### s07-calendar
- Google Calendar API v3, OAuth2, getValidToken(), Supabase user_settings

### s02-today
- setInterval 10ms, localStorage, IndexedDB (ted_videos), Audio/Video API, YouTube embed, CallingSessionPanel, useCelebrations, Supabase (daily_kpis, user_agenda, user_relances)

---

## ❌ Actions Non Implémentées (9 total)

| Story | Action | Raison |
|-------|--------|--------|
| s01 | Sections sommeil dans Settings | Aucune logique toggle visibilité |
| s01 | Toggle visibilité menu | Pas de composant Toggle |
| s01 | Persist choix DB | Pas de route /api/settings/menu-visibility |
| s04 | Drag-drop tasks | dnd-kit absent du fichier tasks/page.tsx |
| s05 | Prévisualiser message | Aucune modal preview |
| s05 | Sauvegarder brouillon | Pas de table message_drafts utilisée |
| s05 | Pause séquence | Pas de logique pause/resume |
| s05 | Reprendre séquence | Pas de logique pause/resume |
| s05 | Arrêter séquence | status='stopped' non implémenté |

---

## ⚠️ Actions Partielles (11 total)

| Story | Action | Problème |
|-------|--------|----------|
| s04 | PATCH persistence | Dépend DB connectée (test manuel requis) |
| s03 | ProspectEditForm | Composant externe non analysé |
| s03 | Persist pression | UUID check fallback silencieux |
| s03 | Highlight prospect | DOM query incomplète |
| s05 | Interpoler variables | String replace manuel (handlebars installé non utilisé) |
| s05 | Envoyer message | mailto:/window.open() workarounds (pas Brevo direct) |
| s05 | Éditer contact | Config panel uniquement (pas édition inline) |
| s05 | Définir timezone | Paris hardcodé (date-fns-tz installé non utilisé) |
| s05 | Thèmes prospection | Affiché mais édition manquante |
| s06 | Filtrer TNS | Filtres hardcodés incomplets |
| s02 | Export Fantastical | Dépend app externe |

---

## 📈 Prochain Sprint (stories s08 + s09)

**s08-booking-page** (complexité 3) :
- Créer page publique `/booking/[slug]`
- Intégration Google Calendar (vérif dispos)
- Table `bookings` Supabase
- Middleware auth exclusion `/booking`
- Design PSG Cosmos responsive
- ~25-30 actions estimées

**s09-rappels-sms** (complexité 2) :
- Cron Edge Function `/api/cron/rdv-reminder`
- Brevo SMS API
- Logs cron_logs
- Configuration Settings (délais)
- ~8-10 actions estimées

---

**Document généré par analyse killer-saas — 285 actions documentées sur 9 stories**
