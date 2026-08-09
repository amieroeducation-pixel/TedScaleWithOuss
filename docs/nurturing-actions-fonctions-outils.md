# Rapport Nurturing — Actions, Fonctions, Outils

## PARTIE 1 : Actions Utilisateur (47 actions)

### 1. Contact Management (13 actions)

1. **Voir liste contacts** — Consulter tous les prospects avec température/prochaine action
2. **Rechercher contact** — Input texte avec debounce 300ms
3. **Filtrer par température** — Boutons Tous/Chauds/Tièdes/Froids
4. **Afficher archivés** — Toggle pour voir contacts archivés
5. **Sélectionner contact** — Clic sur carte → panneau détail à droite
6. **Menu contextuel** — Clic droit → actions rapides (appeler, WhatsApp, email, archiver, supprimer)
7. **Créer nouveau contact** — Modal formulaire (nom, téléphone, email, métier, ville)
8. **Éditer informations contact** — Inline editing ou modal
9. **Archiver contact** — Soft delete (nurturing_archived=true)
10. **Désarchiver contact** — Réactiver prospect
11. **Supprimer contact** — Hard delete avec confirmation
12. **Exporter contacts** — CSV/Excel de la liste filtrée
13. **Importer contacts** — Upload CSV + mapping colonnes

### 2. Message Sending (10 actions)

14. **Composer message** — Textarea avec variable picker {Prénom}, {Métier}, etc.
15. **Sélectionner canal** — Dropdown (Email/WhatsApp/SMS/Call reminder/LinkedIn)
16. **Choisir template** — Bibliothèque de templates préconfigurés
17. **Interpoler variables** — Autocomplete {Prénom}, {Ville}, {Date}, etc.
18. **Joindre document** — Upload fichier → Supabase Storage
19. **Programmer envoi** — Date picker + time picker (timezone Paris)
20. **Envoyer immédiatement** — POST /api/crm/sequences/send
21. **Prévisualiser message** — Modal preview avec variables remplacées
22. **Sauvegarder brouillon** — Persister message non envoyé
23. **Historique envois** — Timeline messages envoyés par canal

### 3. Sequence Management (8 actions)

24. **Voir séquences actives** — Liste séquences assignées au contact
25. **Créer nouvelle séquence** — Modal 3 étapes (nom, canaux, steps)
26. **Éditer séquence** — Modification nom/canaux/steps
27. **Assigner séquence** — Dropdown séquences + bouton "Démarrer"
28. **Pause séquence** — Stopper exécution temporairement
29. **Reprendre séquence** — Continuer où on s'était arrêté
30. **Arrêter séquence** — Stop définitif (status=stopped)
31. **Dupliquer séquence** — Créer copie avec nouveau nom

### 4. Interaction History (5 actions)

32. **Voir timeline** — Liste chronologique interactions (appels, emails, RDV)
33. **Filtrer par type** — Checkbox multi-select (Appel/Email/WhatsApp/RDV/LinkedIn)
34. **Filtrer par période** — Date range picker
35. **Ajouter interaction manuelle** — Modal formulaire (type, date, notes)
36. **Exporter historique** — CSV/PDF du timeline

### 5. Temperature & Scoring (4 actions)

37. **Voir score température** — Badge visuel (🔥 chaud, ⚡ tiède, ❄️ froid, 💀 dead)
38. **Ajuster manuellement** — Dropdown forcer température
39. **Voir calcul auto** — Tooltip explique formule (+1 interaction, +3 RDV, -1/semaine)
40. **Voir score pression** — Progress bar 0-100 (fréquence messages)

### 6. Configuration Contact (4 actions)

41. **Définir fréquence maximale** — Input nombre messages/semaine
42. **Exclure canaux** — Checkbox multi-select canaux à ne pas utiliser
43. **Définir timezone** — Select timezone (défaut Paris)
44. **Thèmes de prospection** — Multi-select tags (TNS, chefs, particuliers)

### 7. Analytics & KPIs (3 actions)

45. **Voir KPIs globaux** — Barre 6 metrics (conversion, response time, pression, actifs, relances, response rate)
46. **Filtrer KPIs par période** — Date range picker
47. **Exporter rapport** — PDF dashboard analytics

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
| Tooltips | @radix-ui/react-tooltip | 1.1 | ❌ | À installer |
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
| Variable interpolation | handlebars | 4.7 | ⚠️ | Installé, à utiliser |
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

### ✅ Ce qui est prêt (95%)

Le stack Nurturing est **quasi-complet** :
- Forms : react-hook-form + zod ✅
- UI : Radix UI (dialog, dropdown, select, checkbox, tabs, switch, collapsible) ✅
- Date/Time : date-fns, date-fns-tz, react-day-picker, react-time-picker ✅
- Search : use-debounce, react-highlight-words ✅
- Validation : libphonenumber-js, validator ✅
- APIs externes : Brevo, WhatsApp, Telegram ✅

### ⚠️ À configurer (5%)

3 outils installés mais pas utilisés :
1. **handlebars** → Remplacer interpolation string custom par Handlebars templates
2. **react-window** → Virtualiser liste si >500 contacts
3. **date-fns-tz** → Vérifier timezone dans messages schedulés

### ❌ Manquants optionnels

2 outils à installer si besoin :
1. **@radix-ui/react-tooltip** → Infos bulles (score température, pression)
2. **linkedin-api-client** → Envoyer messages LinkedIn (actuellement skip)

### 🎯 Prochaine étape

**Story s05-nurturing-consolidation** peut être exécutée maintenant avec le stack actuel.

Fixes prioritaires :
1. Remplacer interpolation custom par handlebars
2. Corriger optimistic lock inversé (executor.ts)
3. Compléter 14 templates vides (messages 1-4)
4. Implémenter canaux WhatsApp/LinkedIn (actuellement skip)
