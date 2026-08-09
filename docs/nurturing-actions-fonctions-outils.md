# Rapport Nurturing — Actions, Fonctions, Outils

## PARTIE 1 : Actions Utilisateur (47 actions)

### 1. Contact Management (13 actions) — 100% ✅

1. ✅ **Voir liste contacts** — Consulter tous les prospects avec température/prochaine action
2. ✅ **Rechercher contact** — Input texte avec debounce 300ms
3. ✅ **Filtrer par température** — Boutons Tous/Chauds/Tièdes/Froids
4. ✅ **Afficher archivés** — Toggle pour voir contacts archivés
5. ✅ **Sélectionner contact** — Clic sur carte → panneau détail à droite
6. ✅ **Menu contextuel** — Clic droit → actions rapides (appeler, WhatsApp, email, archiver, supprimer)
7. ✅ **Créer nouveau contact** — Modal formulaire (nom, téléphone, email, métier, ville)
8. ✅ **Éditer informations contact** — PATCH `/api/nurturing/contacts` (nom/email/téléphone/profession) — Inline edit actif dans ContactDetail.tsx section Config
9. ✅ **Archiver contact** — Soft delete (nurturing_archived=true)
10. ✅ **Désarchiver contact** — Réactiver prospect
11. ✅ **Supprimer contact** — Hard delete avec confirmation
12. ✅ **Exporter contacts** — CSV de la liste filtrée via GET `/api/nurturing/contacts/export?format=csv&temp=&search=&include_archived=` — 14 colonnes exportées
13. ✅ **Importer contacts** — Upload CSV + mapping auto + validation email/téléphone + détection doublons via POST `/api/nurturing/contacts/import` — résultats détaillés avec erreurs

### 2. Message Sending (10 actions) — 80% ✅

14. ✅ **Composer message** — Textarea avec variable picker {{prenom}}, {{metier}}, etc.
15. ✅ **Sélectionner canal** — Dropdown (Email/WhatsApp/SMS/Call reminder/LinkedIn)
16. ✅ **Choisir template** — Bibliothèque de templates préconfigurés
17. ✅ **Interpoler variables** — Handlebars `interpolateTemplate()` dans `src/lib/nurturing/template-engine.ts` — variables {{prenom}}, {{nom}}, {{metier}}, {{ville}}, {{date}}, {{heure}}, {{montant}}
18. ⚠️ **Joindre document** — Upload fichier → Supabase Storage (UI présent, backend à brancher)
19. ✅ **Programmer envoi** — Date picker + time picker (timezone Paris)
20. ✅ **Envoyer immédiatement** — POST `/api/nurturing/send-message` (Email/SMS via Brevo direct) + WhatsApp/LinkedIn/Call via interactions manuelles
21. ✅ **Prévisualiser message** — Modal Radix UI avec variables interpolées en temps réel
22. ✅ **Sauvegarder brouillon** — Autosave 1000ms via `use-debounce` → table `message_drafts` (upsert par user/prospect/canal) + restauration au changement de contact
23. ✅ **Historique envois** — Timeline messages envoyés par canal dans tab Historique

### 3. Sequence Management (8 actions) — 100% ✅

24. ✅ **Voir séquences actives** — Liste séquences assignées au contact
25. ✅ **Créer nouvelle séquence** — Modal 3 étapes (nom, canaux, steps)
26. ✅ **Éditer séquence** — Bouton "✏️ Éditer" dans view='detail' + PATCH template/steps + ajout/suppression d'étapes
27. ✅ **Assigner séquence** — Dropdown séquences + bouton "Démarrer"
28. ✅ **Pause séquence** — Bouton "⏸️ Pause" + PATCH /api/crm/sequences/:instanceId → status='paused'
29. ✅ **Reprendre séquence** — Bouton "▶️ Reprendre" + PATCH /api/crm/sequences/:instanceId → status='active'
30. ✅ **Arrêter séquence** — Bouton "⏹️ Arrêter" avec confirmation + PATCH cancel → status='cancelled' + skip pending steps
31. ✅ **Dupliquer séquence** — Bouton "📋 Dupliquer" + POST /api/crm/sequences/templates/:id/duplicate

### 4. Interaction History (5 actions) — 100%

32. ✅ **Voir timeline** — Liste chronologique interactions (appels, emails, RDV)
33. ✅ **Filtrer par type** — Checkbox multi-select (Appel/Email/WhatsApp/RDV/LinkedIn) + state `historyTypeFilters`
34. ✅ **Filtrer par période** — Date range picker (input type="date") + state `historyDateRange`
35. ✅ **Ajouter interaction manuelle** — Boutons quick log (appel, email, whatsapp, linkedin, rdv)
36. ✅ **Exporter historique** — GET `/api/nurturing/interactions/export?prospect_id=X&format=csv&types=X&start_date=X&end_date=X` — CSV UTF-8 avec BOM

### 5. Temperature & Scoring (4 actions) — 100% ✅

37. ✅ **Voir score température** — Badge visuel (🔥 chaud, ⚡ tiède, ❄️ froid, 💀 dead) avec icône 🔒 si forcé
38. ✅ **Ajuster manuellement** — Dropdown forcer température (Auto/Chaud/Tiède/Froid/Dead) → colonne `forced_temperature`
39. ✅ **Voir calcul auto** — Tooltip Radix UI sur badge température avec formule complète + message si température forcée
40. ✅ **Voir score pression** — Badge coloré (✓ Normale / ⚡ Varier / 🛑 STOP) dans section Config

### 6. Configuration Contact (4 actions) — 100% ✅

41. ✅ **Définir fréquence maximale** — Select jours (7/14/30/60) dans config panel → `contact_frequency_days`
42. ✅ **Exclure canaux** — Boutons cliquables (téléphone/email/whatsapp/linkedin/courrier/sms) → `excluded_channels`
43. ✅ **Définir timezone** — Select timezone (Paris/New York/Los Angeles/Londres/Dubaï/Tokyo/Sydney) → `timezone` → `fromZonedTime()` pour messages schedulés
44. ✅ **Thèmes de prospection** — Multi-select éditable avec boutons thèmes + sauvegarde via PUT `/api/nurturing/prospect-themes` → table `prospect_themes`

### 7. Analytics & KPIs (3 actions) — 66%

45. ✅ **Voir KPIs globaux** — Barre 6 metrics (conversion, response time, pression, actifs, relances, response rate)
46. ✅ **Filtrer KPIs par période** — Date range picker (input type="date") + state `kpisDateRange` + GET `/api/nurturing/kpis?start_date=X&end_date=X`
47. ❌ **Exporter rapport** — PDF dashboard analytics (jsPDF à implémenter si besoin)

---

## PARTIE 2 : Fonctions Techniques

### Frontend (React)

**State Management:**
- Local state : `useState<Contact[]>`, `useState<selectedContact>`
- Global cache : `@tanstack/react-query` (queryKey: ['nurturing-contacts'])
- Form state : `react-hook-form` + `@hookform/resolvers/zod`

**Form Handling:**
- Validation : Zod schemas (téléphone, email, champs requis)
- Debounced inputs : `use-debounce` (search 300ms, auto-save 1000ms)
- Multi-step forms : state machine custom (step 1→2→3)

**UI Updates:**
- Optimistic UI : React Query `onMutate` + rollback `onError`
- Loading states : `isLoading`, `isMutating` booleans
- Toast notifications : `sonner` (success/error/info)

**Components:**
- Modals : `@radix-ui/react-dialog`
- Confirmations : `@radix-ui/react-alert-dialog`
- Dropdowns : `@radix-ui/react-dropdown-menu`
- Selects : `@radix-ui/react-select`
- Date pickers : `react-day-picker@9`
- Time pickers : `react-time-picker`
- Checkboxes : `@radix-ui/react-checkbox`
- Tabs : `@radix-ui/react-tabs`
- Switches : `@radix-ui/react-switch`
- Collapsible : `@radix-ui/react-collapsible`

**Search & Filters:**
- Debounced search : `useDebouncedValue(searchTerm, 300)`
- Highlight results : `react-highlight-words`
- Multi-filters : `Array.filter()` client-side

**Performance:**
- Virtualization (>500 contacts) : `react-window`
- Skeleton loading : `react-loading-skeleton`

### Backend (API Routes)

**Endpoints:**
- `GET /api/nurturing/contacts` — Liste contacts
- `POST /api/nurturing/contacts` — Créer contact
- `PATCH /api/nurturing/contacts/:id` — Éditer contact
- `DELETE /api/nurturing/contacts/:id` — Supprimer contact
- `POST /api/crm/sequences/assign` — Assigner séquence
- `POST /api/crm/sequences/send` — Envoyer message
- `POST /api/crm/sequences/schedule` — Programmer message
- `GET /api/crm/sequences/:id/interactions` — Historique
- `GET /api/nurturing/analytics` — KPIs

**Validation:**
- Zod schemas : `z.object({ full_name, phone, email })`
- Phone validation : `libphonenumber-js` → `isValidPhoneNumber(phone, 'FR')`
- Email validation : `validator.isEmail(email)`

**Business Logic:**
- Template interpolation : `handlebars.compile(template)(data)`
- Temperature calculation : `+1 interaction, +3 RDV, -1/semaine silence`
- Pressure calculation : `(messages_sent / days_active) * 7`
- Next action scheduling : `date-fns/addDays(lastSent, delayDays)`

**Database:**
- Supabase query builder : `.from('prospects').select().eq('user_id', userId)`
- Joins : `.select('*, sequence_instances(*)').single()`
- Aggregations : `.count()`, `.sum()`

### Services Externes

**Brevo (Email/SMS):**
- Email : `sendBrevoEmail({ to, subject, htmlContent })`
- SMS : `sendBrevoSms({ to, content })`
- Wrapper : `src/lib/sequences/brevo.ts`
- Status : ✅ Opérationnel

**WhatsApp Business API:**
- Endpoint : `https://graph.facebook.com/v21.0/{phoneNumberId}/messages`
- Auth : `WHATSAPP_ACCESS_TOKEN`
- Wrapper : Custom dans `/api/cron/rdv-reminder/route.ts`
- Status : ✅ Opérationnel (messaging text)
- À implémenter : Templates, médias, boutons interactifs

**LinkedIn API:**
- Package recommandé : `linkedin-api-client@1.2`
- Status : ❌ Non implémenté (skip dans executor.ts)

**Telegram Bot:**
- Notifications internes Ted
- Wrapper : `src/lib/telegram/bot.ts`
- Status : ✅ Opérationnel

**Supabase Storage:**
- Upload documents : `.storage.from('documents').upload(path, file)`
- Public URL : `.getPublicUrl(path)`
- Status : ✅ Opérationnel

**Google Calendar:**
- Interactions liées RDV
- Wrapper : `src/lib/google/calendar.ts`
- Status : ⚠️ OAuth implémenté, à tester

---

## PARTIE 3 : Mapping Outils

| Fonction | Package | Version | Status | Notes |
|----------|---------|---------|--------|-------|
| **Forms** |
| Form management | react-hook-form | 7.75 | ✅ | Utilisé partout |
| Validation | zod | 4.4 | ✅ | Intégré RHF |
| Zod integration | @hookform/resolvers | 5.2 | ✅ | |
| **State** |
| Server state | @tanstack/react-query | 5.100 | ✅ | Cache + mutations |
| Client state | zustand | 5.0 | ✅ | État global |
| **UI Primitives** |
| Modals | @radix-ui/react-dialog | 1.1 | ✅ | À styler PSG |
| Confirmations | @radix-ui/react-alert-dialog | 1.1 | ✅ | À styler PSG |
| Dropdown menus | @radix-ui/react-dropdown-menu | 2.1 | ✅ | Menu contextuel |
| Selects | @radix-ui/react-select | 2.1 | ✅ | Séquences, canaux |
| Checkboxes | @radix-ui/react-checkbox | 1.1 | ✅ | Filtres multi |
| Tabs | @radix-ui/react-tabs | 1.1 | ✅ | Détail contact |
| Switches | @radix-ui/react-switch | 1.1 | ✅ | Toggle archivés |
| Collapsible | @radix-ui/react-collapsible | 1.1 | ✅ | Steps séquence |
| Tooltips | @radix-ui/react-tooltip | 1.1 | ✅ | Badge température OK |
| **Date & Time** |
| Date manipulation | date-fns | 4.1 | ✅ | Partout |
| Timezone | date-fns-tz | 3.3 | ✅ | Messages schedulés |
| Date picker | react-day-picker | 9.5 | ✅ | Planification |
| Time picker | react-time-picker | 7.0 | ✅ | Planification |
| **Search & Filters** |
| Debouncing | use-debounce | 10.0 | ✅ | Search + auto-save |
| Highlight search | react-highlight-words | 0.20 | ✅ | ContactList |
| **Performance** |
| Virtualization | react-window | 1.8 | ✅ | >500 contacts |
| Skeleton loading | react-loading-skeleton | 3.5 | ✅ | Loading states |
| **Templating** |
| Variable interpolation | handlebars | 4.7 | ✅ | Helper `src/lib/nurturing/template-engine.ts` |
| **Validation** |
| Phone validation | libphonenumber-js | 1.11 | ✅ | Wrapper lib/phone.ts |
| Email validation | validator | 13.12 | ✅ | isEmail() |
| **Notifications** |
| Toasts | sonner | 2.0 | ✅ | Success/error |
| **Utilities** |
| Lodash | lodash | 4.17 | ✅ | groupBy, debounce |
| Class names | clsx | 2.1 | ✅ | Conditional CSS |
| Tailwind merge | tailwind-merge | 3.5 | ✅ | Merge classes |
| **Icons** |
| Icon library | lucide-react | 1.14 | ✅ | Partout |
| **Charts** |
| KPI charts | recharts | 3.8 | ✅ | Barre KPIs |
| **File Upload** |
| Dropzone | react-dropzone | 15.0 | ✅ | Upload docs |
| **External APIs** |
| Brevo Email/SMS | Custom wrapper | - | ✅ | lib/sequences/brevo.ts |
| WhatsApp Business | Custom fetch | - | ✅ | À améliorer (@green-api) |
| LinkedIn | linkedin-api-client | 1.2 | ❌ | À installer |
| Telegram Bot | Custom wrapper | - | ✅ | lib/telegram/bot.ts |
| Supabase | @supabase/supabase-js | 2.105 | ✅ | DB + Storage |
| **NOT NEEDED** |
| Rich text editor | @tiptap/react | - | ❌ | Overkill (textarea suffit) |
| Email preview | @react-email/render | - | ❌ | Pas prioritaire |
| Timeline viz | react-vertical-timeline | - | ❌ | Custom suffit |
| Flow viz | @xyflow/react | - | ❌ | Pas nécessaire |

---

## Résumé Exécutif

### ✅ Ce qui est prêt (100%)

Le stack Nurturing est **complet** :
- Forms : react-hook-form + zod ✅
- UI : Radix UI (dialog, dropdown, select, checkbox, tabs, switch, collapsible, **tooltip**) ✅
- Date/Time : date-fns, **date-fns-tz** (timezone par contact), react-day-picker, react-time-picker ✅
- Search : use-debounce, react-highlight-words ✅
- Validation : libphonenumber-js, validator ✅
- APIs externes : Brevo, WhatsApp, Telegram ✅
- Templating : Handlebars avec helper personnalisé ✅
- Autosave brouillons : use-debounce 1000ms + table message_drafts ✅
- **Temperature & Config** : Forçage température manuel + tooltip calcul + timezone + thèmes éditables ✅

### ❌ Manquants optionnels

1 outil à installer si besoin :
1. **linkedin-api-client** → Envoyer messages LinkedIn (actuellement skip dans executor)
2. **react-window** → Virtualiser liste si >500 contacts (performance)

### 🎯 Modules complétés

**Module Temperature & Themes finalisé (4/4 tâches complétées)** :

✅ #38 Ajuster température manuellement — Dropdown forcer température (Auto/Chaud/Tiède/Froid/Dead) + icône 🔒 sur badge
✅ #39 Tooltip calcul température — Tooltip Radix UI avec formule complète (+1 interaction, +3 RDV, -1/semaine)
✅ #43 Définir timezone par contact — Select timezone + `fromZonedTime()` pour messages schedulés
✅ #44 Thèmes de prospection éditables — Multi-select avec boutons + PUT `/api/nurturing/prospect-themes`

**Module History & Analytics finalisé (4/4 tâches complétées)** :

✅ #33 Filtrer historique par type — Checkboxes multi-select (Appel/Email/WhatsApp/RDV/LinkedIn)
✅ #34 Filtrer historique par période — Date range picker (input type="date")
✅ #36 Exporter historique CSV — `/api/nurturing/interactions/export` avec filtres
✅ #46 Filtrer KPIs par période — Date range picker + recalcul auto

**Module Sequence Management finalisé (5/5 tâches complétées)** :

✅ #26 Éditer séquence — Vue 'edit' avec formulaire pré-rempli + PATCH template + DELETE/POST steps
✅ #28 Pause séquence — Bouton ⏸️ + PATCH action='pause' → status='paused' + cron skip paused
✅ #29 Reprendre séquence — Bouton ▶️ + PATCH action='resume' → status='active'
✅ #30 Arrêter séquence — Bouton ⏹️ + confirmation + PATCH action='cancel' → status='cancelled' + skip steps
✅ #31 Dupliquer séquence — Bouton 📋 + POST /api/crm/sequences/templates/:id/duplicate → copie avec "(Copie)"

**Fonctionnalité bonus non implémentée** :
❌ #47 Exporter rapport PDF — jsPDF (à implémenter si besoin futur)

**Module Nurturing progression globale** : ~92%

Prochaines priorités :
1. Compléter templates vides (messages 1-4 séquences)
2. Implémenter canal LinkedIn dans executor
3. Tests E2E gestion séquences (pause/resume/stop/edit/duplicate)
4. Remplir les steps des séquences seed avec des messages pertinents
