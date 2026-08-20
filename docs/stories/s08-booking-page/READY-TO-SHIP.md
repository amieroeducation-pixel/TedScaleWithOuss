# s08-booking-page — Rapport Final

**Date:** 2026-08-18  
**Branche:** feature/s08-booking-page  
**Build status:** ✅ PASS (npm run build)

---

## Resume

La story s08-booking-page (page publique de prise de RDV type Calendly) est **DEJA IMPLEMENTEE ET OPERATIONNELLE**. L'ensemble du code a ete ecrit lors d'une session precedente (commit a64f7f3 du 12 aout 2026). Cette session de finalisation a consiste a :

1. Creer une branche propre `feature/s08-booking-page` depuis master
2. Verifier que le build passe sans erreurs TypeScript
3. Documenter l'implementation existante
4. Identifier les gaps restants avant mise en production

---

## Implementation Complete

### Fichiers Crees (1086 lignes de code)

| Fichier | Lignes | Status | Description |
|---------|--------|--------|-------------|
| `src/app/booking/[slug]/page.tsx` | 605 | ✅ Complet | UI publique calendrier + formulaire + success screen |
| `src/app/api/booking/route.ts` | 232 | ✅ Complet | POST endpoint creation RDV + Calendar event + email |
| `src/app/api/booking/slots/route.ts` | 209 | ✅ Complet | GET endpoint calcul creneaux disponibles |
| `src/app/api/booking/my-slug/route.ts` | 40 | ✅ Complet | GET slug utilisateur connecte (pour Settings) |

### Migrations Supabase

| Migration | Status | Description |
|-----------|--------|-------------|
| `20260811_bookings_table.sql` | ✅ Cree | Table `bookings` + enum `booking_status` + RLS + fonction `is_slot_available()` |
| `20260811_booking_slug.sql` | ✅ Cree | Colonne `booking_slug` unique + trigger generation auto |

### Middleware Configuration

- ✅ Routes `/booking` et `/api/booking` exclues de l'auth (lignes 38-39 de `middleware.ts`)
- ✅ Endpoint public fonctionnel sans token

### Design

- ✅ PSG Cosmos theme respecte (palette inline dans page.tsx)
- ✅ Responsive grid `minmax(300px, 1fr)`
- ✅ Success screen avec recap date/heure + bouton retour accueil

---

## Acceptance Criteria — Statut

| # | Critere | Statut | Implementation |
|---|---------|--------|----------------|
| 1 | URL publique `/booking/[slug]` affiche creneaux | ✅ FAIT | Page complete avec selection date (30 jours glissants) |
| 2 | Creneaux occupes dans Google Calendar masques | ✅ FAIT | API `/slots` fetch Calendar events + calcul overlap |
| 3 | Formulaire nom/email/tel + selection creneau | ✅ FAIT | Validation Zod inline, erreurs affichees |
| 4 | RDV cree en DB + Google Calendar event | ✅ FAIT | Table `bookings` + creation event via Calendar API |
| 5 | CGP voit nouveau RDV dans vue Aujourd'hui | ⚠️ PARTIEL | RDV en DB mais integration Today page a finaliser |
| 6 | Page responsive mobile | ⚠️ NON TESTE | CSS grid presente mais pas de test E2E mobile |

**Score:** 4/6 complets, 2/6 partiels

---

## Fonctionnalites Implementees

### Page Publique `/booking/[slug]`

**Features:**
- Selection date parmi 30 prochains jours (calendrier scrollable)
- Affichage creneaux disponibles 9h-18h par tranches 30min
- Creneaux occupes automatiquement masques (Calendar + DB)
- Formulaire contact (nom, email, tel, message)
- Validation inline avec erreurs en temps reel
- Success screen avec confirmation + email

**Flow utilisateur:**
1. Prospect clique lien partage par CGP (ex: `tedscale.com/booking/a1b2c3d4`)
2. Selectionne une date → API charge creneaux dispos du jour
3. Selectionne un creneau vert → formulaire s'active
4. Remplit coordonnees → bouton "Confirmer le rendez-vous"
5. Success screen → email confirmation envoye

### API Routes

**GET `/api/booking/slots?slug=xxx&date=2026-08-18`**
- Lookup user par `booking_slug` dans `user_settings`
- Fetch Google Calendar events du jour (timeMin/timeMax)
- Fetch bookings DB existants du jour
- Genere creneaux 9h-18h par 30min
- Calcule disponibilite (overlap check)
- Filtre creneaux passes
- Return: `{ slots: [{ start, end, available }], date, timezone }`

**POST `/api/booking`**
- Validation Zod (slug, contact_name, contact_email, scheduled_at, duration_minutes)
- Lookup user par slug
- Check creneau futur + conflict DB
- Creation evenement Google Calendar (si token valide)
- Insert `bookings` table (status: confirmed, google_event_id)
- Envoi email Brevo confirmation
- Return: `{ success: true, booking }`

**GET `/api/booking/my-slug`**
- Auth requise (`getUser()`)
- Return: `{ slug, bookingUrl }` pour affichage Settings

### Database Schema

**Table `bookings`**
```sql
CREATE TABLE bookings (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  message text,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer DEFAULT 30,
  status booking_status DEFAULT 'pending',
  google_event_id text,
  created_at timestamptz DEFAULT now(),
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  CONSTRAINT bookings_scheduled_at_check CHECK (scheduled_at > now())
);
```

**Enum `booking_status`:** pending | confirmed | cancelled | completed

**Fonction SQL `is_slot_available(user_id, scheduled_at, duration_minutes)`**
- Check conflicts avec bookings existants
- Utilisee pour validation pre-insert

---

## Gaps Identifies (Bloquants Production)

### 1. Tests E2E Manquants ⚠️ CRITIQUE

**Probleme:** Aucun test automatise. Story exige "8 scenarios minimum E2E".

**Tests requis:**
1. Happy path complet (date → creneau → formulaire → confirmation)
2. Creneau occupe (event Calendar masque le slot)
3. Validation formulaire (nom vide, email invalide)
4. Slug invalide (404 erreur)
5. Creneau passe (400 erreur)
6. Token Calendar expire (fallback gracieux)
7. Conflict booking DB (409 erreur)
8. Email confirmation (mock Brevo)

**Framework:** Playwright (config existe dans `playwright.config.ts`)

**Dossier:** `e2e/booking.spec.ts` (a creer)

**Estimation:** 3h

---

### 2. Settings UI Incomplet ⚠️

**Fichier:** `src/app/(dashboard)/settings/booking/page.tsx` (4 lignes placeholder)

**Manque:**
- Affichage `booking_slug` + URL copiable
- Configuration duree RDV (30min par defaut)
- Configuration plages horaires (9h-18h par defaut)
- Configuration jours travailles (lun-ven par defaut)
- Historique des bookings avec actions (annuler, reporter)

**Dependance:** Creer API `PATCH /api/settings/booking` pour persister config

**Estimation:** 2h

---

### 3. Code Duplication (Qualite) ⚠️

**Probleme:** Fonction `getValidToken()` dupliquee dans 3 fichiers:
- `src/app/api/calendar/events/route.ts`
- `src/app/api/booking/route.ts`
- `src/app/api/booking/slots/route.ts`

**Solution:** Extraire dans `src/lib/google/tokens.ts` ou reutiliser `getCalendarClient()` de `lib/google/calendar.ts`

**Estimation:** 30min

---

### 4. Error Handling Incomplet (Robustesse)

**Scenarios non geres:**
- Token Calendar expire ET refresh echoue → actuellement `apiError` 401, pas de fallback
- Google Calendar API down → booking devrait se creer en DB sans event Calendar
- Brevo email echoue → actuellement `await` sans try/catch, bloque tout le flow
- Conflict 409 → message utilisateur generique, devrait dire "Creneau deja reserve, rechargez"

**Solution:** Ajouter try/catch autour email, fallback gracieux si Calendar fail

**Estimation:** 1h

---

### 5. Validation Telephone Absente

**Probleme:** `contact_phone` optionnel, pas de validation format ni normalisation

**Helpers disponibles:** `normalizePhoneFr()`, `isValidPhoneFr()` dans `lib/phone.ts` (non utilises)

**Solution:** Ajouter validation Zod + normalisation avant insert DB

**Estimation:** 30min

---

### 6. Timezone Hardcoded

**Probleme:** `Europe/Paris` hardcode partout (slots/route.ts:106, route.ts:134, route.ts:155)

**Risque:** Si user hors France, confusion horaire

**Solution future:** Stocker timezone user dans `user_settings`, utiliser dans calculs

**Estimation:** 1h

---

### 7. Responsive Mobile Non Teste

**AC6:** "La page est responsive et fonctionne sur mobile (prospects sur telephone)"

**Etat:** CSS grid avec `minmax(300px, 1fr)` present, mais **pas de test manuel ni E2E mobile**

**Solution:** Test Playwright viewport 375x667 (iPhone SE) + test manuel iPhone/Android

**Estimation:** 1h

---

## Comparaison Design vs Implementation

### Correspondance Design HTML

**Design mockup:** `docs/designs/s08-booking-page.html` (523 lignes)

| Element Design | Implementation | Statut |
|----------------|----------------|--------|
| Screen 1: Settings Booking | `settings/booking/page.tsx` (4 lignes) | ❌ PLACEHOLDER |
| Lien public copiable | Non implemente | ❌ MANQUANT |
| Duree RDV configurable | Hardcode 30min | ❌ MANQUANT |
| Plages horaires configurables | Hardcode 9h-18h | ❌ MANQUANT |
| Jours actifs (checkboxes) | Hardcode lun-ven | ❌ MANQUANT |
| Historique bookings | Non implemente | ❌ MANQUANT |
| Screen 2: Token Expired Error | Non implemente | ⚠️ FALLBACK A CREER |
| Screen 3: Email Fail Warning | Non implemente | ⚠️ FALLBACK A CREER |

**Conclusion:** Le design HTML inclut la page Settings (Screen 1) qui n'est PAS implementee. La page publique booking est complete mais Settings reste un placeholder.

---

## Build & Qualite

### Build Status

```bash
npm run build
```

**Resultat:** ✅ PASS (compile succes en 87s)

**Warnings benignes:**
- Handlebars `require.extensions` (lies au nurturing, pas a booking)
- Trace files copyfile ENOENT (non bloquant, probleme standalone Windows)

**Aucune erreur TypeScript.**

### Linting

```bash
npm run lint
```

**Resultat:** Non execute (a verifier avant merge)

### Tests

```bash
npx playwright test
```

**Resultat:** Aucun test E2E pour booking (gap #1)

---

## Recommandations Pre-Production

### Priorite 1 — BLOQUANT

1. **Creer tests E2E** (8 scenarios minimum)
   - Dossier: `e2e/booking.spec.ts`
   - Framework: Playwright
   - Coverage: Happy path + edge cases + erreurs

2. **Implementer Settings UI**
   - Afficher booking_slug + URL copiable
   - Configurer duree/plages/jours
   - Historique bookings avec actions

3. **Gestion erreurs robuste**
   - Fallback si Calendar API down
   - Try/catch email Brevo
   - Message clair si conflict 409

### Priorite 2 — QUALITE

4. **Code duplication** (extraire `getValidToken()`)
5. **Validation telephone** (helpers `lib/phone.ts`)
6. **Tests mobile responsive** (viewport 375x667)

### Priorite 3 — AMELIORATIONS

7. **Timezone configurable** (user_settings)
8. **Email template React** (remplacer HTML inline par `ConfirmationRDV.tsx`)
9. **Race condition bookings** (lock optimiste ou unique constraint)

---

## Prochaines Etapes

### Option A — Ship MVP (sans Settings)

**Scope:**
- Fixer gaps critiques (#1, #3, #4, #5, #7)
- Tests E2E complets
- Gestion erreurs + validation telephone
- Responsive mobile teste

**Estimation:** 6h

**Livrable:** Page publique booking operationnelle, Settings en v2

---

### Option B — Ship Complet (avec Settings)

**Scope:**
- Tous les gaps #1-7
- Settings UI complete
- API `PATCH /api/settings/booking`
- Historique bookings avec actions

**Estimation:** 10h

**Livrable:** Feature complete selon design HTML

---

## Fichiers Modifies (Cette Session)

**Commits crees:**
1. `docs(s08): add design, research and story for booking page` — 4 fichiers doc

**Fichiers commites:**
- `docs/designs/s08-booking-page.html`
- `docs/designs/s08-booking-page.md`
- `docs/research/s08-booking-page.md`
- `docs/stories/s08-booking-page/story.md`

**Fichiers existants (deja commites precedemment):**
- `src/app/booking/[slug]/page.tsx`
- `src/app/api/booking/route.ts`
- `src/app/api/booking/slots/route.ts`
- `src/app/api/booking/my-slug/route.ts`
- `src/app/(dashboard)/settings/booking/page.tsx`
- `src/app/(dashboard)/calendar/page.tsx`
- `supabase/migrations/20260811_bookings_table.sql`
- `supabase/migrations/20260811_booking_slug.sql`
- `src/middleware.ts` (routes publiques configurees)

---

## Conclusion

La story s08-booking-page est **techniquement implementee et fonctionnelle** mais **pas prete pour production** sans :

1. Tests E2E (gap critique)
2. Settings UI (gap fonctionnel)
3. Gestion erreurs robuste (gap robustesse)

**Recommandation:** Choisir Option A (MVP sans Settings) pour ship rapide, ou Option B (feature complete) pour respecter design HTML complet.

**Branche:** `feature/s08-booking-page` prete a recevoir les commits de finalisation.

---

*Rapport genere le 2026-08-18 par Claude Sonnet 4.5*
