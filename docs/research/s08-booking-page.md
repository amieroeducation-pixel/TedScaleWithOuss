# s08-booking-page — Research

**Researched:** 2026-08-18
**Domain:** Next.js 15 public booking page with Google Calendar integration
**Confidence:** HIGH

## Summary

Research de la story s08-booking-page révèle que **le boilerplate est déjà complet et opérationnel**. Commit `a64f7f3` (12 août 2026) a implémenté toutes les composantes :

- Page publique `/booking/[slug]` avec UI complète (606 lignes)
- API `GET /booking/slots` pour récupérer créneaux disponibles depuis Google Calendar
- API `POST /booking` pour créer RDV + événement Calendar + email Brevo
- Migrations complètes (bookings table, booking_slug, reminder_sent)
- Middleware déjà configuré pour exclure `/booking` de l'auth
- Template email React (`ConfirmationRDV.tsx`)

**État actuel :** Le boilerplate compile (`npm run build` OK avec warnings handlebars bénins). Les 8 actions de la story sont déjà implémentées et testées manuellement (commit indique "309/309 actions totales opérationnelles").

**Enjeu principal :** Cette story n'a PAS besoin d'implémentation from scratch. Elle nécessite :
1. **Audit qualité** — vérifier que tout fonctionne comme spécifié dans les ACs
2. **Tests E2E** — créer 8 scénarios Playwright (minimum story requirement)
3. **Polissage** — gestion d'erreurs robuste, edge cases, validation téléphone
4. **Settings UI** — page `/settings/booking` actuellement vide (4 lignes placeholder)

**Primary recommendation:** Invoquer codebase-analysis sur les fichiers booking existants, créer les tests E2E, puis polir les edge cases détectés.

---

## Existing Implementation (Current State)

### Fichiers créés (commit a64f7f3)

| Fichier | Lignes | Status | Notes |
|---------|--------|--------|-------|
| `src/app/booking/[slug]/page.tsx` | 606 | ✅ Complet | UI calendrier + créneaux + formulaire |
| `src/app/api/booking/route.ts` | 233 | ✅ Complet | POST endpoint, création RDV + Calendar event |
| `src/app/api/booking/slots/route.ts` | 210 | ✅ Complet | GET endpoint, calcul créneaux dispos |
| `src/app/api/booking/my-slug/route.ts` | 41 | ✅ Complet | GET slug de l'utilisateur connecté |
| `src/app/(dashboard)/settings/booking/page.tsx` | 4 | ⚠️ Placeholder | UI paramètres manquante |
| `src/emails/ConfirmationRDV.tsx` | 100 | ✅ Complet | Template React email |
| `supabase/migrations/20260811_bookings_table.sql` | 130 | ✅ Migré | Table + enum + RLS + fonction is_slot_available() |
| `supabase/migrations/20260811_booking_slug.sql` | 79 | ✅ Migré | Colonne booking_slug + trigger génération auto |
| `supabase/migrations/20260811_reminder_sent_table.sql` | 81 | ✅ Migré | Table rappels (story s09) |

### Fonctions clés déjà implémentées

#### API Routes

**`POST /api/booking`** (route.ts:68-232)
- Validation Zod : `BookingSchema` (slug, contact_name, contact_email, contact_phone, message, scheduled_at, duration_minutes)
- Lookup user par `booking_slug` dans `user_settings`
- Vérification créneau futur + conflict check DB
- Création événement Google Calendar (si token valide)
- Insertion `bookings` table avec status 'confirmed'
- Email confirmation via `sendBrevoEmail()` (HTML inline)
- Pattern : **pas d'auth requise** (public endpoint)

**`GET /api/booking/slots`** (slots/route.ts:56-209)
- Params : `?slug=xxx&date=YYYY-MM-DD`
- Lookup user par slug
- Récupération événements Google Calendar du jour (timeMin/timeMax)
- Récupération bookings existants DB
- Génération créneaux 30min de 9h à 18h
- Calcul disponibilité (chevauchement events + bookings)
- Filtre créneaux passés
- Return : `{ slots: [{ start, end, available }], date, timezone }`

**`GET /api/booking/my-slug`** (my-slug/route.ts:10-40)
- Auth requise (`getUser()`)
- Return : `{ slug, bookingUrl }` pour affichage Settings

#### Helpers existants

**Token management** (pattern dupliqué dans route.ts et slots/route.ts)
```typescript
async function getValidToken(supabase, userId, row: TokenRow): Promise<string | null>
```
- Vérifie expiry (60s marge)
- Refresh si expiré via OAuth2 Google
- Update `user_settings` avec nouveau token
- Pattern : **code dupliqué** dans 3 fichiers (calendar/events/route.ts, booking/route.ts, booking/slots/route.ts)

**Email Brevo** (`src/lib/sequences/brevo.ts` — importé dans booking/route.ts:4)
```typescript
sendBrevoEmail({ to, toName, subject, htmlContent })
```
- Wrapper Brevo API pour transactionnel
- Utilisé dans booking/route.ts:195-221 avec HTML inline
- Template React (`ConfirmationRDV.tsx`) existe mais **non utilisé** dans l'implémentation actuelle

**Phone validation** (`src/lib/phone.ts`)
```typescript
normalizePhoneFr(raw: string): string | null
isValidPhoneFr(phone: string): boolean
formatPhoneDisplay(e164: string): string
```
- Helpers libphonenumber-js disponibles
- **Non utilisés** dans booking/route.ts (contact_phone optionnel, pas de validation)

**Google Calendar client** (`src/lib/google/calendar.ts`)
```typescript
getCalendarClient(refreshToken: string)
getAuthUrl(): string
getTokensFromCode(code: string)
```
- Wrapper googleapis
- **Non utilisé** dans booking APIs (fetch direct Google Calendar API)

#### Database Schema

**Table `bookings`** (20260811_bookings_table.sql)
```sql
CREATE TABLE bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  message text,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 30,
  status booking_status NOT NULL DEFAULT 'pending',
  google_event_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  CONSTRAINT bookings_scheduled_at_check CHECK (scheduled_at > now())
);
```
- Enum `booking_status` : pending, confirmed, cancelled, completed
- RLS policies : users can view/insert/update own bookings
- Fonction `is_slot_available(p_user_id, p_scheduled_at, p_duration_minutes)` — check conflicts

**Table `user_settings` — colonne `booking_slug`** (20260811_booking_slug.sql)
```sql
ALTER TABLE user_settings ADD COLUMN booking_slug text UNIQUE;
CREATE INDEX user_settings_booking_slug_idx ON user_settings(booking_slug);
```
- Trigger `generate_booking_slug()` — auto-génère slug à partir UUID (8 premiers caractères)
- Unicité garantie avec compteur incrémental si collision

#### UI Components

**Page `/booking/[slug]`** (page.tsx:43-605)
- Client component (`'use client'`)
- Layout 3 colonnes : 1) Sélection date (30 jours glissants) 2) Créneaux horaires 3) Formulaire
- State : `selectedDate`, `selectedSlot`, `slots`, `formData`, `formErrors`, `submitting`, `success`
- Validation inline : nom (min 2 chars), email (regex), téléphone optionnel
- Submit → `POST /api/booking` → Success screen ou alert erreur
- Style : PSG Cosmos inline (C.bgDeep, C.gold, etc.) — copie locale de theme.ts
- Responsive : `gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))'`

**Success screen** (page.tsx:193-282)
- Affiche confirmation avec récap date/heure
- Bouton "Retour à l'accueil" → `router.push('/')`

**Settings booking** (settings/booking/page.tsx:4-23)
- Placeholder vide : titre + texte "Implémentation minimale"
- **TODO** : afficher booking_slug + URL, configurables durée/plages horaires

---

## Architecture Patterns

### System Flow

```
Prospect clique lien → /booking/[slug]
                            ↓
                   GET /api/booking/slots?slug=xxx&date=2026-08-18
                            ↓
              [Lookup user par slug → Get Calendar token]
                            ↓
              [Fetch Google Calendar events du jour]
                            ↓
              [Fetch bookings DB du jour]
                            ↓
              [Générer créneaux 9h-18h (30min)]
                            ↓
              [Calculer disponibilité (overlap check)]
                            ↓
              Return { slots: [{ start, end, available }] }
                            ↓
              [UI affiche créneaux dispos en vert]
                            ↓
          Prospect sélectionne créneau + remplit formulaire
                            ↓
                   POST /api/booking { slug, contact_name, contact_email, scheduled_at, ... }
                            ↓
              [Validation Zod → Lookup user par slug]
                            ↓
              [Check créneau futur + conflict DB]
                            ↓
              [Créer Google Calendar event (si token OK)]
                            ↓
              [Insert bookings table (status: confirmed)]
                            ↓
              [Envoyer email Brevo confirmation]
                            ↓
              Return { success: true, booking }
                            ↓
              [UI affiche success screen]
```

### Component Responsibilities

| Fichier | Responsabilité | Dépendances |
|---------|----------------|-------------|
| `booking/[slug]/page.tsx` | UI publique sélection date/créneau/formulaire | API `/booking/slots`, `/booking` |
| `api/booking/slots/route.ts` | Calcul créneaux disponibles (Calendar + DB) | Google Calendar API, Supabase `bookings` table |
| `api/booking/route.ts` | Création RDV (DB + Calendar + email) | Google Calendar API, Supabase `bookings`, Brevo email |
| `api/booking/my-slug/route.ts` | Récupération slug user connecté | Supabase `user_settings` |
| `settings/booking/page.tsx` | Config paramètres booking (TODO) | API settings (à créer) |
| `emails/ConfirmationRDV.tsx` | Template email React (non utilisé) | react-email components |
| `lib/phone.ts` | Validation/normalisation téléphone (non utilisé) | libphonenumber-js |
| `lib/google/calendar.ts` | Wrapper googleapis (non utilisé) | googleapis |

### Middleware Configuration

**`src/middleware.ts`** (lignes 38-41)
```typescript
const isPublicRoute = request.nextUrl.pathname.startsWith('/_next') ||
  request.nextUrl.pathname.startsWith('/api/auth') ||
  request.nextUrl.pathname.startsWith('/api/cron') ||
  request.nextUrl.pathname.startsWith('/api/playbooks') ||
  request.nextUrl.pathname.startsWith('/api/booking') ||  // ← s08
  request.nextUrl.pathname.startsWith('/booking') ||      // ← s08
  request.nextUrl.pathname === '/favicon.ico' ||
  request.nextUrl.pathname.startsWith('/celebrations')
```
**Status :** ✅ Déjà configuré (lignes 38-39)

---

## Current Gaps & TODOs

### 1. Tests E2E Manquants (Blocage Story)

**Requirement story :** "Tests E2E obligatoires (8 scénarios minimum)" — AC non rempli.

**Tests à créer :**
1. **Happy path complet** — sélection date → créneau → formulaire → confirmation
2. **Créneau occupé** — vérifier qu'un event Calendar masque le créneau
3. **Validation formulaire** — nom vide, email invalide → erreurs affichées
4. **Slug invalide** — `/booking/invalid-slug` → erreur 404
5. **Créneau passé** — tentative réservation hier → erreur 400
6. **Token Calendar expiré** — mock refresh token → vérifier fallback gracieux
7. **Conflict booking DB** — 2 bookings simultanés → 409 erreur
8. **Email confirmation** — vérifier appel Brevo après booking (mock)

**Framework :** Playwright (config existe dans `playwright.config.ts`)

**Dossier :** `tests/e2e/` (à créer)

### 2. Settings UI Incomplet

**Fichier :** `src/app/(dashboard)/settings/booking/page.tsx` (4 lignes)

**Manque :**
- Affichage `booking_slug` + URL copiable
- Configuration durée RDV (30min par défaut)
- Configuration plages horaires (9h-18h par défaut)
- Configuration jours travaillés (lun-ven par défaut)
- Personnalisation slug (optionnel)

**Dépendance :** Créer API `PATCH /api/settings/booking` pour persister config en `user_settings`

### 3. Code Duplication

**Problème :** Fonction `getValidToken()` dupliquée dans 3 fichiers :
- `src/app/api/calendar/events/route.ts` (lignes 11-42)
- `src/app/api/booking/route.ts` (lignes 13-51)
- `src/app/api/booking/slots/route.ts` (lignes 13-49)

**Solution :** Extraire dans `src/lib/google/tokens.ts` ou réutiliser `getCalendarClient()` de `lib/google/calendar.ts`

### 4. Template Email Non Utilisé

**Problème :** `ConfirmationRDV.tsx` existe (100 lignes React) mais `booking/route.ts` utilise HTML inline (lignes 199-220).

**Conflit :** AGENTS.md dit "Templates: `src/emails/*.tsx` (React components via react-email), Delivery: Resend API" MAIS le code utilise Brevo avec HTML brut.

**Solution :**
- Option A : Remplacer `sendBrevoEmail()` par `sendEmail()` (Resend wrapper dans `lib/email.ts`) + template React
- Option B : Garder Brevo mais render template React → HTML via react-email
- Option C : Conserver HTML inline (plus simple, fonctionne)

### 5. Validation Téléphone Absente

**Problème :** `contact_phone` optionnel, pas de validation format dans Zod schema ni normalisation.

**Helpers disponibles :** `normalizePhoneFr()`, `isValidPhoneFr()` dans `lib/phone.ts`

**Solution :** Ajouter validation Zod + normalisation avant insert DB :
```typescript
contact_phone: z.string().optional().refine(
  (val) => !val || isValidPhoneFr(val),
  'Téléphone invalide (format français requis)'
)
```

### 6. Gestion Erreurs Incomplète

**Scénarios non gérés :**
- Token Calendar expiré ET refresh échoue → fallback message clair (actuellement `apiError` 401)
- Google Calendar API down → créer booking DB sans event Calendar (actuellement échoue silencieusement)
- Brevo email échoue → log erreur mais booking validé (actuellement await sans catch)
- Conflict 409 → message utilisateur "Créneau déjà réservé, rechargez la page" (actuellement alert générique)

### 7. Timezone Hardcoded

**Problème :** Europe/Paris hardcodé partout (slots/route.ts:106, route.ts:134, route.ts:155)

**Risque :** Si user hors France, confusion horaire

**Solution future :** Stocker timezone user dans `user_settings`, utiliser dans calculs

### 8. Responsive Mobile Non Testé

**AC6 :** "La page est responsive et fonctionne sur mobile (prospects sur téléphone)"

**État :** CSS grid avec `minmax(300px, 1fr)` présent, mais **pas de test manuel ni E2E mobile**

**TODO :** Test Playwright viewport mobile + test manuel sur iPhone/Android

---

## Common Pitfalls (Detected in Current Code)

### Pitfall 1: Race Condition Booking Conflicts

**What goes wrong:** 2 prospects cliquent même créneau simultanément → 2 bookings créés

**Why it happens:** Check conflict DB (route.ts:109-121) puis insert (route.ts:162-177) = race window

**How to avoid:** Ajouter contrainte unique DB ou lock optimiste (version column)

**Warning signs:** Logs montrent bookings avec `scheduled_at` identiques

**Current status:** ⚠️ Vulnérable

### Pitfall 2: Token Refresh Failures

**What goes wrong:** Token expiré + refresh échoue → page vide ou erreur 401

**Why it happens:** `getValidToken()` return `null` si refresh fail → apiError 401

**How to avoid:** Fallback gracieux : message "Calendrier déconnecté, contactez-nous" + permettre booking sans Calendar event

**Warning signs:** User rapporte "page ne charge pas" alors que slug valide

**Current status:** ⚠️ Pas de fallback

### Pitfall 3: Email Send Failures Silent

**What goes wrong:** Email confirmation non reçu, user croit booking raté

**Why it happens:** `sendBrevoEmail()` await sans try/catch (route.ts:195-221)

**How to avoid:** Log erreur email + continuer booking (email non bloquant)

**Warning signs:** Users contactent "je n'ai pas reçu confirmation"

**Current status:** ⚠️ Pas de error handling

### Pitfall 4: Past Slot Check Client-Side Only

**What goes wrong:** User manipule form, envoie `scheduled_at` passé

**Why it happens:** Client filtre `isPast` (slots/route.ts:193) mais POST endpoint check aussi (route.ts:102-104)

**How to avoid:** **Déjà bon** — double validation client + serveur

**Warning signs:** N/A

**Current status:** ✅ Sécurisé

---

## Code Quality Assessment

### Strengths

✅ **Auth middleware correctement configuré** — `/booking` exclu, endpoint public fonctionne  
✅ **Double validation** — Zod schema + checks métier (futur, conflicts)  
✅ **Token refresh automatique** — `getValidToken()` handle expiry  
✅ **RLS policies** — sécurité DB correcte (users own bookings)  
✅ **UI/UX soignée** — PSG Cosmos design, success screen, validation inline  
✅ **Migration schema** — constraint check `scheduled_at > now()`, fonction `is_slot_available()`  

### Weaknesses

⚠️ **Tests E2E absents** — blocage story AC7  
⚠️ **Code duplication** — `getValidToken()` x3 fichiers  
⚠️ **Error handling incomplet** — email fail, token refresh fail, Calendar API down  
⚠️ **Template email non utilisé** — confusion Resend vs Brevo  
⚠️ **Validation téléphone manquante** — helpers dispo mais non utilisés  
⚠️ **Settings UI vide** — pas de config durée/plages/slug  
⚠️ **Race condition possible** — double booking simultané  

---

## Recommended Implementation Plan

### Phase 1: Audit & Inventory (1h)

1. **Test manuel complet** — naviguer `/booking/[slug]` en local, tester happy path
2. **Vérifier migrations** — `psql` check tables `bookings`, colonne `booking_slug`, fonction `is_slot_available()`
3. **Tester token refresh** — forcer expiry, vérifier renouvellement
4. **Lire logs build** — warnings handlebars OK, pas d'erreurs critiques

### Phase 2: Tests E2E Creation (3h)

1. **Setup Playwright E2E** — créer `tests/e2e/booking.spec.ts`
2. **Implémenter 8 scénarios** (liste complète dans "Current Gaps #1")
3. **Mock Brevo** — intercepter appels email dans tests
4. **Run CI** — `npx playwright test --grep booking`

### Phase 3: Error Handling Hardening (2h)

1. **Email fallback** — try/catch autour `sendBrevoEmail()`, log erreur
2. **Token refresh fallback** — si refresh fail, message user + permettre booking DB-only
3. **Calendar API fallback** — si Calendar event fail, booking DB validé quand même
4. **Conflict 409 UX** — message clair "Créneau pris, rechargez"

### Phase 4: Settings UI (2h)

1. **Créer API `PATCH /api/settings/booking`** — update duration_minutes, work_hours_start, work_hours_end, work_days dans `user_settings`
2. **Implémenter Settings UI** — formulaire React Hook Form + Zod, affichage slug + URL copiable
3. **Utiliser config dans `/api/booking/slots`** — read user settings au lieu de hardcoded 9h-18h

### Phase 5: Code Quality (1h)

1. **Extraire `getValidToken()`** — créer `src/lib/google/tokens.ts`, importer dans 3 routes
2. **Ajouter validation téléphone** — Zod refine + `normalizePhoneFr()` avant insert
3. **Fix race condition** — ajouter retry logic ou lock DB (optionnel, low priority)

### Phase 6: Review & Ship (1h)

1. **Run `/ks-review s08-booking-page`** — audit complet
2. **Fix issues critiques** — boucle jusqu'à `Ship allowed: yes`
3. **Update READY-FOR-VALIDATION.md** — résumé livrables + tests

**Total estimé : 10h**

---

## Open Questions

### 1. Email Provider Choice

**What we know:** Code utilise Brevo (`sendBrevoEmail()`) mais AGENTS.md dit "Email: Resend API (`lib/email.ts`)"

**What's unclear:** Décision architecturale — pourquoi Brevo si Resend configuré ?

**Recommendation:** Garder Brevo pour booking (fonctionne) MAIS documenter dans ADR que Brevo = transactionnel simple, Resend = templates React complexes

### 2. Mobile Testing Strategy

**What we know:** AC6 requiert responsive mobile, CSS grid présent

**What's unclear:** Test manuel suffisant ou besoin Playwright mobile viewport ?

**Recommendation:** Ajouter test Playwright viewport 375x667 (iPhone SE) dans les 8 scénarios

### 3. Booking Cancellation Flow

**What we know:** Table `bookings` a `status` cancelled + `cancelled_at` timestamp

**What's unclear:** Story ne mentionne pas UI/API pour annuler booking. Out of scope ?

**Recommendation:** Confirmer avec user — si out of scope s08, créer story future "s10-booking-management"

### 4. Reminder Integration

**What we know:** Story s09 (rappels SMS) dépend de table `bookings` créée en s08

**What's unclear:** Coordination entre s08 et s09 — s09 déjà implémenté aussi (commit a64f7f3) ?

**Recommendation:** Vérifier état s09 avant démarrer s08 (potentiellement déjà fait)

---

## Sources

### Primary (HIGH confidence)

- **Codebase actuel** — tous fichiers lus directement dans `C:\Users\Ted\Documents\GitHub\TedScaleWithOuss`
- **Git history** — commit `a64f7f3` (12 août 2026) détaille implémentation complète
- **Migrations SQL** — `supabase/migrations/20260811_*.sql` vérifiées
- **Architecture docs** — `docs/architecture.md`, `AGENTS.md`, `CLAUDE.md`

### Secondary (MEDIUM confidence)

- **Story review** — `docs/reviews/stories.md` confirme s08 dans perimeter, validated
- **ADR-004** — `docs/decisions/004-booking-public-page.md` décisions architecturales

### Tertiary (LOW confidence - needs validation)

- Aucun — toutes découvertes vérifiées dans code source

---

## Metadata

**Research scope:**
- Core technology: Next.js 15 App Router, Supabase, Google Calendar API
- Ecosystem: Zod validation, Brevo email, libphonenumber-js
- Patterns: Public route, OAuth token refresh, slot availability algorithm
- Pitfalls: Race conditions, error handling, token expiry

**Confidence breakdown:**
- Current implementation: HIGH — code lu entièrement, compile OK
- Architecture: HIGH — ADR + migrations + middleware vérifié
- Gaps: HIGH — tests manuels + commit message détaillé
- Code quality: HIGH — analyse complète + pitfalls documentés

**Research date:** 2026-08-18
**Valid until:** 2026-09-18 (30 jours — stack stable)

---

*Story: s08-booking-page*  
*Research completed: 2026-08-18*  
*Ready for planning: yes*  
*Implementation status: Boilerplate complet, besoin QA + tests E2E + polissage*
