# Dashboard TedScaleWithOuss — Actions Non Opérationnelles

**Méthodologie killer-saas** — Liste exhaustive de TOUTES les actions ⚠️ partielles et ❌ non implémentées

---

## 📊 Résumé Global

| Type | Nombre | % du total (294) |
|------|--------|------------------|
| ⚠️ Partielles | 6 | 2% |
| ❌ Non implémentées | 20 | 8% |
| **TOTAL à corriger** | **26** | **10%** |

---

## ⚠️ ACTIONS PARTIELLES (6 actions)

### s04-tasks : Persistance cocher (2 actions)

| # | Action | Problème | Solution | Effort |
|---|--------|----------|----------|--------|
| 18 | Cocher "Terminé" | UI présent, PATCH fonctionne MAIS race condition possible entre optimistic update et serveur | Ajouter debounce 500ms + retry logic + rollback si erreur | 30min |
| 19 | Décocher "Terminé" | Même problème que #18 | Même solution que #18 | 30min |

**Test requis** : DB Supabase connectée + user_id valide + observer que le statut persiste après reload page

**Fichier** : `src/app/(dashboard)/tasks/page.tsx`

---

### s03-crm : CRM Kanban (3 actions)

| # | Action | Problème | Solution | Effort |
|---|--------|----------|----------|--------|
| 24 | Modifier fiche prospect (ProspectEditForm externe) | Composant externe non analysé dans diagnostique initial — probablement opérationnel mais non vérifié | Analyser `ProspectEditForm.tsx` + tester modification complète dans navigateur | 15min |
| 32 | Persister score pression | UUID check avec fallback silencieux — fonctionne MAIS ne montre pas d'erreur si UUID invalide | Ajouter `toast.error()` si UUID invalide au lieu de fallback silencieux | 10min |
| 92 | Highlight prospect depuis URL param | DOM query `scrollIntoView` incomplète — fonctionne parfois, échoue si prospect pas encore rendu | Ajouter retry logic (wait for render) + useEffect cleanup | 20min |

**Fichiers** :
- `src/app/(dashboard)/crm/page.tsx` (actions #32, #92)
- `src/components/ProspectEditForm.tsx` (action #24)

---

### s06-tns : Prospection TNS (1 action)

| # | Action | Problème | Solution | Effort |
|---|--------|----------|----------|--------|
| 31 | Filtrer base TNS par métier | Tabs métiers hardcodés (Médecins, Notaires, Architectes) MAIS filtre backend incomplet — 21 codes NAF supportés vs 3 tabs affichés | **Option A** : Implémenter filtre réel (dropdown 68 métiers) + query backend par métier. **Option B** : Retirer tabs hardcodés incomplets (plus simple) | 1h (A) / 5min (B) |

**Fichier** : `src/app/(dashboard)/prospection/tns/page.tsx`

**Recommandation** : Option B (retirer tabs) car feature "filtrer métier" pas critique — recherche multi-métiers suffit

---

### s02-today : Page Aujourd'hui (1 action)

| # | Action | Problème | Solution | Effort |
|---|--------|----------|----------|--------|
| 36 | Export Fantastical (grille agenda) | Dépend app externe Fantastical installée sur machine — comportement attendu, pas un bug | **Aucune action requise** — fonctionnalité optionnelle qui marche SI Fantastical installé | 0min |

**Fichier** : `src/app/(dashboard)/today/page.tsx`

**Note** : Marquer ✅ dans diagnostique car comportement correct (ouvre Fantastical si disponible, sinon fallback .ics download)

---

## ❌ ACTIONS NON IMPLÉMENTÉES (20 actions)

### s01-menu : Configuration visibilité (3 actions)

| # | Action | Problème | Solution | Effort |
|---|--------|----------|----------|--------|
| 10 | Sections sommeil dans Settings | Aucun onglet "Menu" dans settings/page.tsx | Ajouter onglet "Menu" dans TABS + créer TabMenu composant | 20min |
| 11 | Toggle visibilité menu | Pas de composant Toggle pour sections menu | Utiliser Toggle existant (settings/shared.tsx) + state menu_sections_visible | 15min |
| 12 | Persist choix DB | Pas de route API `/api/settings/menu-visibility` + colonne DB manquante | Route déjà supportée par `/api/settings` générique + migration colonne `menu_sections_visible jsonb` | 30min |

**Fichiers à créer/modifier** :
- `src/app/(dashboard)/settings/shared.tsx` — TabMenu composant
- `src/app/(dashboard)/settings/page.tsx` — Ajouter onglet "Menu"
- `src/app/(dashboard)/layout.tsx` — Filtrer NAV_SECTIONS selon menu_sections_visible
- `supabase/migrations/009_add_menu_visibility.sql` — Colonne jsonb

**Estimation totale** : 1h15

---

### s04-tasks : Drag-drop (1 action)

| # | Action | Problème | Solution | Effort |
|---|--------|----------|----------|--------|
| 23 | Drag-drop tâches entre colonnes | dnd-kit absent du fichier tasks/page.tsx | Installer `@dnd-kit/core @dnd-kit/sortable` + wrap colonnes dans DndContext + implémenter onDragEnd handler + PATCH status | 1h |

**Fichiers** :
- `src/app/(dashboard)/tasks/page.tsx` — Implémenter DndContext + onDragEnd
- `src/components/TaskCard.tsx` — useSortable() hook

**Pattern code** :
```tsx
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

const handleDragEnd = async (event: DragEndEvent) => {
  const { active, over } = event;
  if (!over) return;
  
  const taskId = active.id as string;
  const newStatus = over.id as string;
  
  // Optimistic update
  setAllTasks(prev => prev.map(t => t.id === taskId ? {...t, status: newStatus} : t));
  
  // Persist
  await fetch(`/api/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: newStatus })
  });
};
```

---

### s03-crm : Bouton Nouveau prospect (1 action)

| # | Action | Problème | Solution | Effort |
|---|--------|----------|----------|--------|
| 23 | Bouton "Nouveau prospect" | UI présent MAIS onClick non câblé — bouton mort | Ajouter onClick handler + modal ProspectForm (déjà existant pour édition, réutilisable) + POST /api/prospects | 15min |

**Fichiers** :
- `src/app/(dashboard)/crm/page.tsx` — Câbler onClick bouton
- `src/components/ProspectForm.tsx` — Réutiliser modal existant

---

### s08-booking : Page publique prise RDV (8 actions)

**Statut** : ❌ **PAGE COMPLÈTE À CRÉER** (0/8 actions)

| # | Action | Description | Effort |
|---|--------|-------------|--------|
| 1 | Page publique `/booking/[slug]` | Route publique (middleware auth exclusion) + slug = user_settings.booking_slug | 1h |
| 2 | Afficher créneaux disponibles | Query Google Calendar API → liste slots 30min sur 14 jours | 2h |
| 3 | Masquer créneaux occupés | Filtrer slots où Calendar event existe | 30min |
| 4 | Formulaire prise RDV | Inputs nom/prénom/email/tel/message + validation zod | 1h |
| 5 | Confirmation RDV | Toast + redirect page succès `/booking/success` | 30min |
| 6 | Créer événement Calendar | POST Google Calendar API + INSERT table `bookings` Supabase | 1h30 |
| 7 | Email confirmation | Brevo transactional email avec détails RDV (ics attachment) | 1h |
| 8 | Timezone utilisateur | Détection auto timezone + conversion Paris (Europe/Paris) | 30min |

**Fichiers à créer** :
- `src/app/booking/[slug]/page.tsx` — Page publique
- `src/app/booking/success/page.tsx` — Page confirmation
- `src/app/api/booking/slots/route.ts` — GET créneaux disponibles
- `src/app/api/booking/reserve/route.ts` — POST réservation
- `src/lib/calendar.ts` — Helper Google Calendar
- `src/lib/booking.ts` — Logique slots + validation
- `supabase/migrations/010_create_bookings.sql` — Table bookings

**Migration DB** :
```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  prospect_name TEXT NOT NULL,
  prospect_email TEXT NOT NULL,
  prospect_phone TEXT,
  booking_date TIMESTAMPTZ NOT NULL,
  booking_duration_minutes INT DEFAULT 30,
  status TEXT DEFAULT 'confirmed', -- confirmed | cancelled | no_show
  message TEXT,
  google_event_id TEXT,
  sms_24h_sent BOOLEAN DEFAULT false,
  sms_1h_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bookings_user_date ON bookings(user_id, booking_date);
CREATE INDEX idx_bookings_status ON bookings(status);
```

**Estimation totale s08** : ~9h

---

### s09-rappels : Rappels SMS automatiques (7 actions)

**Statut** : ❌ **CRON COMPLET À CRÉER** (0/7 actions)

| # | Action | Description | Effort |
|---|--------|-------------|--------|
| 1 | Cron vérifie RDV à venir | Edge Function Supabase OU Task Scheduler Windows → appelle `/api/cron/rdv-reminder` toutes les heures | 1h |
| 2 | Envoyer SMS 24h avant | Filtrer bookings date = NOW() + 24h ±1h AND sms_24h_sent = false → Brevo SMS API → UPDATE flag | 1h30 |
| 3 | Envoyer SMS 1h avant | Filtrer bookings date = NOW() + 1h ±15min AND sms_1h_sent = false → Brevo SMS API → UPDATE flag | 1h30 |
| 4 | Personnaliser contenu SMS | Templates avec variables {Prénom} {Date} {Heure} {NomCGP} {TelCGP} — handlebars ou string replace | 1h |
| 5 | Configurer délais Settings | Onglet "Rappels SMS" dans settings/page.tsx avec enable 24h/1h + templates éditables | 1h |
| 6 | Logger cron_logs | INSERT cron_logs (type='rdv_reminder_24h', status, details) + affichage page /automatisations | 30min |
| 7 | Anti-doublon (optimistic lock) | UPDATE sms_24h_sent = true AVANT envoi (éviter doublon si cron lancé 2x) | 30min |

**Fichiers à créer** :
- `src/app/api/cron/rdv-reminder/route.ts` — Cron principal
- `src/lib/brevo-sms.ts` — Helper Brevo SMS API
- `src/lib/sms-templates.ts` — Templates + interpolation
- `src/app/(dashboard)/settings/shared.tsx` — TabSMSReminders composant
- `supabase/migrations/011_add_sms_tracking.sql` — Colonnes sms_sent

**Migration DB** :
```sql
ALTER TABLE bookings ADD COLUMN sms_24h_sent BOOLEAN DEFAULT false;
ALTER TABLE bookings ADD COLUMN sms_1h_sent BOOLEAN DEFAULT false;
ALTER TABLE bookings ADD COLUMN sms_24h_sent_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN sms_1h_sent_at TIMESTAMPTZ;

ALTER TABLE user_settings ADD COLUMN sms_reminders JSONB DEFAULT '{
  "24h_enabled": true,
  "1h_enabled": true,
  "24h_template": "Bonjour {Prénom}, rappel RDV demain {Date} à {Heure} avec {NomCGP}. À bientôt !",
  "1h_template": "Bonjour {Prénom}, votre RDV est dans 1h ({Heure}). À tout de suite !"
}'::jsonb;
```

**Cron configuration** :
```powershell
# Task Scheduler Windows (toutes les heures)
$action = New-ScheduledTaskAction -Execute "pwsh.exe" `
  -Argument "-Command Invoke-WebRequest -Uri 'http://localhost:3000/api/cron/rdv-reminder' -Method POST"
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours 1)
Register-ScheduledTask -TaskName "TedScaleWithOuss-RDVReminder" -Action $action -Trigger $trigger
```

**Estimation totale s09** : ~7h

---

## 📊 Récapitulatif par Story

| Story | ⚠️ Partielles | ❌ Non impl | Total à corriger | Effort |
|-------|--------------|-------------|------------------|--------|
| s01-menu | 0 | 3 | 3 | 1h15 |
| s04-tasks | 2 | 1 | 3 | 2h |
| s03-crm | 3 | 1 | 4 | 1h |
| s06-tns | 1 | 0 | 1 | 5min (retirer tabs) |
| s02-today | 1 | 0 | 1 | 0min (déjà OK) |
| s08-booking | 0 | 8 | 8 | 9h |
| s09-rappels | 0 | 7 | 7 | 7h |
| **TOTAL** | **6** | **20** | **26** | **~20h** |

---

## 🎯 Priorisation

### 🔥 Quick Wins (< 1h, impact immédiat)

1. **s02-today #36** — Marquer ✅ (0min, juste doc update)
2. **s06-tns #31** — Retirer tabs métiers (5min)
3. **s03-crm #23** — Câbler bouton Nouveau prospect (15min)
4. **s03-crm #32** — Toast erreur UUID (10min)
5. **s03-crm #24** — Analyser ProspectEditForm (15min)
6. **s03-crm #92** — Fix scrollIntoView (20min)

**Total Quick Wins** : 1h05 → **4 actions ✅**

---

### 🟢 Court Terme (1-2h, features manquantes stories déployées)

7. **s01-menu #10-12** — Sections sommeil Settings (1h15)
8. **s04-tasks #18-19** — Fix persistence checkbox (1h)
9. **s04-tasks #23** — Drag-drop tasks (1h)

**Total Court Terme** : 3h15 → **6 actions ✅**

---

### 🟡 Moyen Terme (9h, story s08 complète)

10. **s08-booking** — Page publique prise RDV (9h)

**Total Moyen Terme** : 9h → **8 actions ✅**

---

### 🟠 Long Terme (7h, story s09 complète)

11. **s09-rappels** — Rappels SMS automatiques (7h)

**Total Long Terme** : 7h → **7 actions ✅**

---

## 🚀 Plan d'Implémentation Recommandé

### Phase 1 — Quick Wins (1 session, 1h)
- Corriger les 6 quick wins → passer de 96% à 97% opérationnel
- Mettre à jour tableaux ASCII diagnostique avec nouveaux statuts

### Phase 2 — Fiabilisation Stories Déployées (2 sessions, 4h)
- Compléter s01-menu (sections sommeil)
- Fiabiliser s04-tasks (persistence + drag-drop)
- Mettre à jour diagnostique → 100% opérationnel sur 7/9 stories

### Phase 3 — Story s08-booking (3 sessions, 9h)
- Migration DB bookings
- Page publique + API slots
- Intégration Calendar + Brevo
- Tests E2E Playwright

### Phase 4 — Story s09-rappels (2 sessions, 7h)
- Migration DB sms_tracking
- API cron + Brevo SMS
- Settings onglet Rappels
- Task Scheduler Windows

---

## 📝 Validation Tests

### Critères de passage ⚠️ → ✅

**s04-tasks #18-19 (Persistence checkbox)** :
1. Cocher tâche → reload page → tâche reste cochée ✅
2. Décocher tâche → reload page → tâche reste décochée ✅
3. Cocher multiple tâches rapidement → toutes persistent ✅

**s03-crm #24 (ProspectEditForm)** :
1. Ouvrir fiche prospect → clic Éditer → formulaire pré-rempli ✅
2. Modifier tous champs → Sauvegarder → changements persistent ✅
3. Annuler édition → aucun changement sauvegardé ✅

**s03-crm #32 (UUID validation)** :
1. URL `/crm?prospect=invalid-uuid` → toast.error("UUID invalide") ✅
2. URL `/crm?prospect=valid-uuid-not-found` → toast.error("Prospect introuvable") ✅
3. URL `/crm?prospect=valid-uuid` → highlight prospect ✅

**s03-crm #92 (scrollIntoView)** :
1. URL `/crm?prospect=valid-uuid` → scroll automatique vers prospect ✅
2. Prospect dans colonne cachée (ex: Converti) → scroll + reveal colonne ✅
3. Prospect pas encore rendu → retry après 100ms + 200ms + 500ms ✅

---

### Critères de passage ❌ → ✅

**s01-menu #10-12 (Sections sommeil)** :
1. Settings > Menu → voir liste 5 sections avec toggles ✅
2. Désactiver "Acquisition" → section disparaît du menu latéral ✅
3. Reload page → section reste masquée ✅
4. Réactiver → section réapparaît ✅

**s04-tasks #23 (Drag-drop)** :
1. Glisser tâche de "À faire" vers "Urgent" → statut change ✅
2. Glisser vers "Cette semaine" → badge s'adapte ✅
3. Glisser vers "Terminées" → checkbox auto-coché ✅
4. Reload page → nouveau statut persiste ✅

**s03-crm #23 (Nouveau prospect)** :
1. Clic bouton "Nouveau prospect" → modal formulaire s'ouvre ✅
2. Remplir champs → Sauvegarder → prospect apparaît colonne "À contacter" ✅
3. Toast confirmation "Prospect créé" ✅

**s08-booking (8 critères)** :
1. URL `/booking/ted-ouss` → page publique accessible sans auth ✅
2. Calendrier affiche créneaux 14 jours ✅
3. Créneaux occupés masqués ✅
4. Formulaire validation zod (email + tel requis) ✅
5. Confirmation → event créé Google Calendar ✅
6. Email Brevo envoyé avec .ics attachment ✅
7. Ligne insérée table `bookings` ✅
8. Page `/booking/success` affichée ✅

**s09-rappels (7 critères)** :
1. Cron tourne toutes les heures (Task Scheduler) ✅
2. RDV demain 10h → SMS 24h envoyé aujourd'hui 10h ✅
3. RDV aujourd'hui 15h → SMS 1h envoyé 14h ✅
4. Templates interpolent {Prénom} {Date} {Heure} ✅
5. Settings > Rappels → toggles 24h/1h + templates éditables ✅
6. Logs visibles dans `/automatisations` ✅
7. SMS jamais envoyé 2x (flag sms_sent) ✅

---

## 📈 Impact Attendu

### Après Phase 1 (Quick Wins)
- **97% opérationnel** (285/294 actions)
- Stories déployées : s05 100%, s07 100%, s02 100%, s06 100%, s03 97%, s04 97%, s01 75%

### Après Phase 2 (Fiabilisation)
- **100% opérationnel sur 7/9 stories** (291/294 actions opérationnelles dans stories déployées)
- Stories 100% : s05, s07, s02, s06, s03, s04, s01

### Après Phase 3 (s08)
- **8/9 stories complètes** (299/302 actions)
- Booking page publique opérationnelle → feature killer CGP

### Après Phase 4 (s09)
- **9/9 stories complètes** (306/309 actions)
- **100% fonctionnel** — Dashboard CGP complet

---

## 🛠️ Outils Requis

### Développement
- **dnd-kit** : `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
- **handlebars** : `npm install handlebars @types/handlebars` (templates SMS)
- **papaparse** : déjà installé (export CSV)
- **jsPDF** : déjà installé (export PDF)

### Infra
- **Supabase CLI** : Migrations DB (009, 010, 011)
- **Task Scheduler Windows** : Cron rappels SMS
- **Brevo SMS API** : Clé API + crédit SMS
- **Google Calendar API** : OAuth tokens déjà configurés

---

**Document créé le** : 2026-08-11  
**Statut** : Liste complète 26 actions à corriger  
**Prochaine étape** : Phase 1 Quick Wins (1h)
