---
story: s08-booking-page
date: 2026-08-18
status: active
validated: yes
complexity: 3
tasks_total: 9
---

# Plan — s08-booking-page

## Story Goal

Créer une page publique de prise de rendez-vous accessible via lien partageable (`/booking/[slug]`), permettant aux prospects de réserver un créneau disponible, avec synchronisation Google Calendar automatique et notification email. Kill Calendly.

## Acceptance Criteria (from docs/stories.md)

1. Une URL publique `/booking/[slug]` affiche les créneaux disponibles de la semaine (lun-ven, plages configurables)
2. Les créneaux occupés dans Google Calendar sont masqués
3. Le prospect saisit son nom, téléphone, email et sélectionne un créneau → le RDV est confirmé
4. Le RDV confirmé crée un événement Google Calendar + une entrée en DB (`bookings` table)
5. Le CGP voit le nouveau RDV dans sa vue Aujourd'hui
6. La page est responsive et fonctionne sur mobile (prospects sur téléphone)

---

## Prerequisites

### Research
- ❌ `docs/research/s08-booking-page.md` n'existe pas
- ✅ Diagnostique: `docs/diagnostique-s08-booking-tableau-ascii.md` existe
- ⚠️ **Recommendation**: `/ks-research s08-booking-page` devrait être exécuté pour identifier tous les traps et dépendances. Ce plan procède sans research complète.

### Design
- ❌ `docs/designs/s08-booking-page.html` n'existe pas
- ✅ Code existant suit PSG Cosmos design system
- ✅ Page actuelle: UI fonctionnelle avec 3 colonnes (date, créneau, formulaire)

### Architecture
- ✅ Pattern: Page publique (`'use client'` component)
- ✅ API: `/api/booking` (POST), `/api/booking/slots` (GET), `/api/booking/my-slug` (GET)
- ✅ DB: Table `bookings` existe (migration antérieure confirmée par code)
- ✅ Google Calendar: Intégration OAuth + refresh token dans `user_settings`
- ✅ Email: Brevo API (`sendBrevoEmail`) pour confirmation

### Code Existant
- ✅ `src/app/booking/[slug]/page.tsx` — Page client complète (605 lignes)
- ✅ `src/app/api/booking/route.ts` — POST créer booking (232 lignes)
- ✅ `src/app/api/booking/slots/route.ts` — GET slots disponibles (209 lignes)
- ✅ `src/app/api/booking/my-slug/route.ts` — GET slug utilisateur (40 lignes)

**État actuel**: Code complet existe déjà. Ce plan documente les tâches de **validation, fix bugs potentiels, et intégration complète** plutôt que création from scratch.

---

## Implementation Strategy

### Approach

**Code-first validation**: Le code booking existe déjà. Ce plan se concentre sur:
1. Vérifier que le middleware exclut `/booking` de l'auth redirect
2. Tester le flow complet utilisateur (booking → email → Calendar → Today)
3. Fixer les bugs identifiés lors des tests
4. Créer la migration DB `bookings` si absente
5. Intégrer l'affichage des bookings dans la page Today

**Alternative rejetée**: Réécrire from scratch → rejeté car code existant est complet, suit PSG Cosmos, et implémente déjà tous les AC.

### Pattern choisi

1. **Database**: Vérifier table `bookings` existe, sinon créer migration
2. **Middleware**: Exclure `/booking/` de l'auth redirect
3. **Settings**: Ajouter interface pour générer/afficher booking_slug + URL partageable
4. **Today Integration**: Fetch bookings du jour et afficher dans section RDV
5. **Tests E2E**: Flow complet booking → confirmation → affichage CGP

Conforme AGENTS.md:
- ✅ Client Component avec fetch vers API route
- ✅ Inline CSS via `C` object (déjà dans code existant)
- ✅ Public route (middleware exclusion nécessaire)
- ✅ Google Calendar API server-side (token refresh implémenté)
- ✅ Brevo email confirmation (sendBrevoEmail déjà utilisé)

---

## Tasks

### Task 1: Vérifier/créer migration bookings table [✅ AUDIT REQUIS]

**File**: `supabase/migrations/YYYYMMDD_create_bookings_table.sql` (CHECK or NEW)

**Action**:
1. Vérifier si table `bookings` existe en DB:
   ```sql
   SELECT * FROM information_schema.tables WHERE table_name = 'bookings';
   ```

2. Si absente, créer migration:
   ```sql
   CREATE TABLE IF NOT EXISTS bookings (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
     contact_name TEXT NOT NULL,
     contact_email TEXT NOT NULL,
     contact_phone TEXT,
     message TEXT,
     scheduled_at TIMESTAMPTZ NOT NULL,
     duration_minutes INT DEFAULT 30,
     status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
     google_event_id TEXT,
     confirmed_at TIMESTAMPTZ,
     cancelled_at TIMESTAMPTZ,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );

   CREATE INDEX idx_bookings_user_id ON bookings(user_id);
   CREATE INDEX idx_bookings_scheduled_at ON bookings(scheduled_at);
   CREATE INDEX idx_bookings_status ON bookings(status);

   COMMENT ON TABLE bookings IS 'Rendez-vous pris via page publique /booking/[slug]';
   ```

**Test**: 
- Si migration appliquée: `supabase db push` (ou équivalent local)
- Vérifier table existe: `\d bookings` dans psql
- Vérifier indexes créés
- INSERT test row → vérifier contraintes (status enum, user_id FK)

**Exit criteria**: Table `bookings` présente en DB avec colonnes + indexes + contraintes

---

### Task 2: Ajouter booking_slug dans table user_settings [✅ AUDIT REQUIS]

**File**: `supabase/migrations/YYYYMMDD_add_booking_slug.sql` (CHECK or NEW)

**Action**:
1. Vérifier si colonne `booking_slug` existe:
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'user_settings' AND column_name = 'booking_slug';
   ```

2. Si absente, créer migration:
   ```sql
   ALTER TABLE user_settings
   ADD COLUMN IF NOT EXISTS booking_slug TEXT UNIQUE;

   CREATE UNIQUE INDEX IF NOT EXISTS idx_user_settings_booking_slug 
   ON user_settings(booking_slug) WHERE booking_slug IS NOT NULL;

   COMMENT ON COLUMN user_settings.booking_slug IS 'Slug unique pour lien booking public (/booking/[slug])';
   ```

3. Générer slug pour utilisateur existant (optionnel, peut être fait via UI Settings):
   ```sql
   -- Exemple: UPDATE user_settings SET booking_slug = 'ted-ouss' WHERE id = '<user_id>';
   ```

**Test**:
- Colonne existe: `\d user_settings`
- Unique constraint fonctionne: INSERT duplicate slug → erreur
- API `/api/booking/my-slug` retourne slug si présent

**Exit criteria**: Colonne `booking_slug` présente, UNIQUE constraint actif

---

### Task 3: Exclure /booking/ du middleware auth redirect [✅ CRITICAL]

**File**: `src/middleware.ts` (EDIT)

**Action**:
Ajouter `/booking/` dans la liste des routes publiques (actuellement exclut `/login`, `/_next`, `/api/auth`, etc.):

```typescript
const isPublicRoute = (pathname: string) => {
  return (
    pathname.startsWith('/login') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/cron') ||
    pathname.startsWith('/api/playbooks') ||
    pathname.startsWith('/booking/') ||  // ← AJOUTER CETTE LIGNE
    pathname === '/favicon.ico' ||
    pathname === '/celebrations'
  )
}
```

**Test**:
- Naviguer `/booking/test-slug` sans être connecté → page accessible (pas de redirect `/login`)
- Naviguer `/dashboard` sans auth → redirect `/login` (inchangé)
- API `/api/booking` et `/api/booking/slots` accessibles sans auth

**Exit criteria**: `/booking/[slug]` accessible publiquement sans auth

---

### Task 4: Créer composant Settings pour gérer booking_slug [🆕 NEW]

**File**: `src/app/(dashboard)/settings/shared.tsx` (EDIT) + `src/app/(dashboard)/settings/page.tsx` (EDIT)

**Action**:
1. Dans `settings/shared.tsx`, créer nouveau composant `TabBooking`:
   ```typescript
   export function TabBooking({ settings, save }: TabProps) {
     const [slug, setSlug] = useState(settings.booking_slug || '')
     const [generating, setGenerating] = useState(false)
     
     const generateSlug = async () => {
       setGenerating(true)
       const suggested = `${settings.nom?.toLowerCase().replace(/\s+/g, '-') || 'booking'}-${Math.random().toString(36).substr(2, 4)}`
       setSlug(suggested)
       await save({ booking_slug: suggested })
       setGenerating(false)
     }

     const bookingUrl = slug ? `${window.location.origin}/booking/${slug}` : ''

     return (
       <SectionPanel title="Lien de Réservation">
         <SetRow>
           <SetLabel 
             label="Votre lien de booking" 
             description="Partagez ce lien pour recevoir des demandes de RDV"
           />
           <div style={{ display: 'flex', gap: 8 }}>
             <input 
               type="text" 
               value={slug}
               onChange={(e) => setSlug(e.target.value)}
               onBlur={() => save({ booking_slug: slug })}
               style={{ flex: 1, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 6, padding: '8px 12px', color: C.text, fontSize: 11 }}
               placeholder="mon-nom"
             />
             <button 
               onClick={generateSlug}
               disabled={generating}
               style={{ background: C.indigo, color: C.textHi, border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}
             >
               {generating ? '...' : 'Générer'}
             </button>
           </div>
         </SetRow>

         {bookingUrl && (
           <SetRow>
             <SetLabel label="URL complète" description="Copiez ce lien pour le partager" />
             <div style={{ display: 'flex', gap: 8 }}>
               <input 
                 type="text" 
                 value={bookingUrl}
                 readOnly
                 style={{ flex: 1, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 6, padding: '8px 12px', color: C.gold, fontSize: 10, fontFamily: 'JetBrains Mono,monospace' }}
               />
               <button 
                 onClick={() => navigator.clipboard.writeText(bookingUrl)}
                 style={{ background: C.green, color: C.bgDeep, border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}
               >
                 📋 Copier
               </button>
             </div>
           </SetRow>
         )}
       </SectionPanel>
     )
   }
   ```

2. Dans `settings/page.tsx`, ajouter onglet "🔗 Booking":
   ```typescript
   const TABS = [
     // ... existing tabs
     { id: 'booking', label: '🔗 Booking' },
   ]

   // Dans le switch:
   {activeTab === 'booking' && <TabBooking settings={settings} save={save} saving={saving} />}
   ```

**Test**:
- Naviguer `/settings` → onglet "🔗 Booking" visible
- Click "Générer" → slug créé + sauvegardé en DB
- Modifier slug manuellement → onBlur déclenche save
- Click "📋 Copier" → URL copiée dans clipboard
- Vérifier DB: `SELECT booking_slug FROM user_settings;`

**Exit criteria**: Onglet Settings booking fonctionnel, slug généré/éditable, URL copiable

---

### Task 5: Intégrer bookings dans page Today [🆕 NEW]

**File**: `src/app/(dashboard)/today/page.tsx` (EDIT)

**Action**:
1. Créer API endpoint (optionnel, peut utiliser `/api/bookings` existant):
   ```typescript
   // Ou ajouter dans /api/today/signal existant
   const { data: todayBookings } = await supabase
     .from('bookings')
     .select('*')
     .eq('user_id', userId)
     .gte('scheduled_at', startOfDay)
     .lte('scheduled_at', endOfDay)
     .in('status', ['confirmed', 'pending'])
     .order('scheduled_at', { ascending: true })
   ```

2. Dans `today/page.tsx`, fetch bookings:
   ```typescript
   const [bookings, setBookings] = useState([])

   useEffect(() => {
     fetch('/api/bookings?date=' + new Date().toISOString().split('T')[0])
       .then(r => r.json())
       .then(({ data }) => setBookings(data || []))
       .catch(() => setBookings([]))
   }, [])
   ```

3. Afficher dans section "RDV du jour" (ou créer nouvelle section):
   ```typescript
   <div style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14 }}>
     <h3 style={{ fontSize: 14, fontWeight: 600, color: C.gold, marginBottom: 12 }}>
       📅 Nouveaux RDV (Booking)
     </h3>
     {bookings.length === 0 ? (
       <p style={{ fontSize: 10, color: C.textLo }}>Aucun RDV booking aujourd'hui</p>
     ) : (
       bookings.map(b => (
         <div key={b.id} style={{ background: C.surface2, padding: 10, borderRadius: 6, marginBottom: 8 }}>
           <p style={{ fontSize: 11, color: C.textHi, fontWeight: 600 }}>{b.contact_name}</p>
           <p style={{ fontSize: 9, color: C.textMid }}>{new Date(b.scheduled_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} — {b.duration_minutes}min</p>
           <p style={{ fontSize: 9, color: C.textLo }}>{b.contact_email} {b.contact_phone && `• ${b.contact_phone}`}</p>
         </div>
       ))
     )}
   </div>
   ```

**Test**:
- Créer un booking via `/booking/slug` pour aujourd'hui
- Naviguer `/today` → booking apparaît dans section "Nouveaux RDV"
- Vérifier format heure, nom, email affichés correctement
- Booking passé (scheduled_at < now) ne s'affiche pas si filtre appliqué

**Exit criteria**: Bookings du jour affichés dans Today, format lisible, données correctes

---

### Task 6: Vérifier Google Calendar sync booking → event [✅ TEST]

**File**: `src/app/api/booking/route.ts` (AUDIT lignes 124-159)

**Action**:
1. Tester le flow complet:
   - Créer booking via `/booking/slug`
   - Vérifier que `googleEventId` est non-null dans DB
   - Ouvrir Google Calendar → vérifier événement créé
   - Vérifier attendees contient `contact_email`
   - Vérifier reminders (24h email + 30min popup) configurés

2. Tester refresh token automatique:
   - Expirer access_token en DB (set `google_calendar_token_expiry` to past)
   - Créer booking → vérifier que `getValidToken()` refresh automatiquement
   - Vérifier nouvel access_token sauvegardé en DB

3. Tester fallback si Calendar non connecté:
   - Déconnecter Google Calendar (set `google_calendar_refresh_token` to NULL)
   - Créer booking → vérifier que booking DB créé quand même
   - Vérifier `google_event_id` est NULL
   - Vérifier email confirmation envoyé

**Test cases**:
- ✅ Happy path: token valide → événement créé + googleEventId sauvegardé
- ✅ Token expiré: refresh automatique → événement créé
- ✅ Calendar déconnecté: booking créé sans Calendar event (graceful degradation)

**Exit criteria**: Google Calendar sync fonctionnel, refresh automatique OK, fallback sans Calendar OK

---

### Task 7: Tester email confirmation Brevo [✅ TEST]

**File**: `src/app/api/booking/route.ts` (AUDIT lignes 185-221)

**Action**:
1. Créer booking avec email test valide
2. Vérifier email reçu dans inbox
3. Vérifier contenu email:
   - Nom prospect correct
   - Date/heure formattée correctement (fr-FR timezone Europe/Paris)
   - Durée affichée
   - Message prospect inclus si fourni
   - Pas de typos, HTML rendu correctement

4. Tester cas edge:
   - Email invalide → vérifier sendBrevoEmail échoue gracefully (pas de crash API)
   - Message prospect avec caractères spéciaux (', ", <, >) → HTML escaped correctement

**Test cases**:
- ✅ Email envoyé avec tous les champs corrects
- ✅ Format date/heure français (ex: "lundi 18 août 2026 à 14:30")
- ✅ Message prospect affiché si présent, omis si null
- ⚠️ Email invalide → catch error, ne bloque pas booking (log warning acceptable)

**Exit criteria**: Email confirmation fonctionnel, format correct, graceful degradation si erreur

---

### Task 8: Tester page booking responsive mobile [✅ TEST]

**File**: `src/app/booking/[slug]/page.tsx` (AUDIT design)

**Action**:
1. Ouvrir `/booking/slug` sur Chrome DevTools → mobile viewport (375x667 iPhone SE)
2. Vérifier layout:
   - Grid 3 colonnes → collapse en 1 colonne sur mobile (CSS `auto-fit minmax(300px, 1fr)` ligne 329)
   - Boutons dates scrollables verticalement
   - Créneaux horaires en grille compacte (lignes 403-404 `auto-fill minmax(100px, 1fr)`)
   - Formulaire inputs full-width lisibles
   - Bouton "Confirmer" accessible sans scroll horizontal

3. Tester interactions tactiles:
   - Tap date → sélection active (background indigo + border gold)
   - Tap créneau → sélection active (background green + border gold)
   - Remplir formulaire → keyboard mobile n'obstrue pas bouton submit
   - Submit → loader visible, pas de double-submit possible (button disabled)

4. Tester page confirmation success:
   - Layout centré verticalement (lignes 200-207 `minHeight: '100vh'`, `alignItems: 'center'`)
   - Badge checkmark vert visible
   - Texte lisible sur mobile
   - Bouton "Retour à l'accueil" accessible

**Test devices**:
- iPhone SE (375px)
- iPhone 12 Pro (390px)
- Samsung Galaxy S21 (360px)

**Exit criteria**: Page booking entièrement fonctionnelle sur mobile, layout responsive, interactions tactiles OK

---

### Task 9: Tests E2E flow complet booking [✅ PLAYWRIGHT]

**File**: `e2e/s08-booking-flow.spec.ts` (NEW)

**Action**:
Créer test Playwright couvrant:

```typescript
test('Booking flow complet - prospect prend RDV', async ({ page }) => {
  // 1. Naviguer page booking publique
  await page.goto('/booking/ted-ouss')
  await expect(page.locator('h1')).toContainText('Prenez rendez-vous')

  // 2. Sélectionner date demain
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dateStr = tomorrow.toISOString().split('T')[0]
  await page.click(`button:has-text("${formatDate(dateStr)}")`)

  // 3. Attendre chargement créneaux
  await page.waitForSelector('button:has-text("09:00")')

  // 4. Sélectionner créneau 14:00
  await page.click('button:has-text("14:00")')

  // 5. Remplir formulaire
  await page.fill('#contact_name', 'Jean Test')
  await page.fill('#contact_email', 'jean.test@example.com')
  await page.fill('#contact_phone', '+33 6 12 34 56 78')
  await page.fill('#message', 'Rendez-vous de test')

  // 6. Soumettre
  await page.click('button:has-text("Confirmer le rendez-vous")')

  // 7. Vérifier confirmation
  await expect(page.locator('h1')).toContainText('Rendez-vous confirmé')
  await expect(page.locator('text=jean.test@example.com')).toBeVisible()

  // 8. Vérifier DB (optionnel, nécessite accès Supabase test)
  // const { data } = await supabase.from('bookings').select('*').eq('contact_email', 'jean.test@example.com')
  // expect(data.length).toBe(1)
})

test('Créneau occupé non sélectionnable', async ({ page, context }) => {
  // Créer booking pour bloquer créneau 14:00
  // ...
  // Vérifier que bouton 14:00 absent ou disabled
})

test('Validation formulaire - email invalide', async ({ page }) => {
  // Soumettre avec email invalide → message erreur visible
})
```

**Test coverage**:
- ✅ Flow complet: date → slot → form → submit → confirmation
- ✅ Créneaux occupés masqués
- ✅ Validation formulaire (nom, email requis)
- ✅ Page confirmation affichée
- ⚠️ DB booking créé (optionnel si credentials test disponibles)

**Exit criteria**: Tests E2E passent (green), tous AC validés

---

## Files Touched

### Created (si absentes)
- `supabase/migrations/YYYYMMDD_create_bookings_table.sql` (~40 lignes)
- `supabase/migrations/YYYYMMDD_add_booking_slug.sql` (~10 lignes)
- `e2e/s08-booking-flow.spec.ts` (~80 lignes)

### Modified
- `src/middleware.ts` (+1 ligne — exclure `/booking/`)
- `src/app/(dashboard)/settings/shared.tsx` (+60 lignes — TabBooking component)
- `src/app/(dashboard)/settings/page.tsx` (+5 lignes — onglet Booking)
- `src/app/(dashboard)/today/page.tsx` (+40 lignes — affichage bookings)

### Existing (audit only)
- `src/app/booking/[slug]/page.tsx` (605 lignes — AUDIT responsive + flow)
- `src/app/api/booking/route.ts` (232 lignes — AUDIT Calendar sync + email)
- `src/app/api/booking/slots/route.ts` (209 lignes — AUDIT slots logic)

**Total nouveau code**: ~200 lignes (migrations + Settings + Today + tests)  
**Total audit code**: ~1050 lignes existantes

---

## Test Strategy

### Unit Tests
**Scope**: Aucun (complexity 3, logic dans API routes déjà testées via E2E)

### Integration Tests
**Scope**: API routes
- ✅ POST `/api/booking` → booking créé en DB + Calendar event + email envoyé
- ✅ GET `/api/booking/slots` → slots calculés correctement (occupés exclus)
- ✅ GET `/api/booking/my-slug` → slug retourné pour user connecté

**Method**: Playwright API context ou curl (si credentials test disponibles)

### E2E Tests
**Scope**: User flow complet
- ✅ Prospect: sélection date → slot → form → confirmation
- ✅ CGP: booking apparaît dans Today
- ✅ Responsive mobile (iPhone SE viewport)
- ⚠️ Email reçu (test manuel, Playwright ne peut pas vérifier inbox Brevo facilement)

**Tool**: Playwright (`e2e/s08-booking-flow.spec.ts`)

**Coverage target**: 90% AC (5.5/6 critères — email test manuel acceptable)

---

## Risks & Mitigations

### Risk 1: Middleware config incorrecte → redirect loop public

**Problem**: Si `/booking/` pas exclu correctement, prospects non-auth redirigés `/login` → mauvaise UX, feature inutilisable.

**Mitigation**:
- Task 3 critique: vérifier exclusion middleware avant tests
- Test manuel: ouvrir `/booking/test` en navigation privée → doit afficher page (pas redirect)

**Severity**: Critical — bloque AC1

---

### Risk 2: Race condition slots occupés

**Problem**: Deux prospects sélectionnent même créneau en même temps → double booking si validation DB insuffisante.

**Mitigation**:
- API `/api/booking/route.ts` lignes 108-121 vérifie déjà conflits avant INSERT
- Requête DB `or()` pour détecter chevauchements temporels
- Si conflit détecté → retourne 409 Conflict (code déjà implémenté)

**Severity**: Medium — mitigé par code existant

**Test**: Créer 2 bookings concurrents via script → vérifier qu'un seul passe, l'autre reçoit 409

---

### Risk 3: Token Google Calendar expiré → event non créé silencieusement

**Problem**: Si `getValidToken()` échoue (refresh_token révoqué), booking créé sans Calendar event → CGP ne voit pas RDV dans Calendar.

**Mitigation**:
- Code lignes 126-159: si `accessToken` null, skip Calendar creation (graceful degradation)
- Booking quand même créé en DB → CGP voit dans Today
- **Future improvement**: Notifier CGP en temps réel si Calendar sync échoue (toast/email)

**Severity**: Medium — acceptable car fallback DB fonctionne

**Accepted**: Oui — booking prioritaire sur Calendar sync

---

### Risk 4: Email Brevo rate limit ou quota dépassé

**Problem**: Si quota Brevo dépassé, email confirmation non envoyé → prospect ne reçoit pas détails RDV.

**Mitigation**:
- Email envoyé APRÈS booking DB créé (lignes 195-221) → si email échoue, booking quand même validé
- Pas de rollback booking si email fail (acceptable)
- **Future improvement**: Retry queue ou fallback vers autre provider (Resend)

**Severity**: Low — booking validé même si email échoue

**Accepted**: Oui — UX dégradée acceptable si quotas Brevo OK en prod

---

### Risk 5: booking_slug collision (deux users même slug)

**Problem**: Si deux CGP tentent générer même slug, UNIQUE constraint échoue → erreur UX.

**Mitigation**:
- Migration Task 2 ajoute UNIQUE constraint sur `booking_slug`
- Génération slug inclut random suffix (4 chars) → collision très rare
- Si erreur UNIQUE: Settings affiche message "Slug déjà pris, choisir un autre"

**Severity**: Low — rare grâce au random suffix

**Test**: Créer deux users, générer slug identique → vérifier erreur DB + message UX

---

## Assumptions

1. **Table `user_settings` has google_calendar_refresh_token**: OAuth Google Calendar déjà configuré (dépend de s07)
2. **Brevo API configured**: `BREVO_API_KEY` en .env, quota disponible
3. **Booking duration fixed 30min**: Durée hardcodée dans page.tsx ligne 147 (configurable future improvement)
4. **Working hours 9h-18h lun-ven**: Plages horaires hardcodées lignes 173-176 slots/route.ts (configurable future improvement)
5. **Timezone Europe/Paris**: Tous calculs dates en TZ Paris (assumption France usage)

---

## Out of Scope

### Explicitly NOT included in this story

1. **Configuration plages horaires/durée RDV**:
   - Story actuelle: hardcodé 9h-18h, 30min slots
   - **Future story**: s08b-booking-config (settings page pour horaires, durée, jours travaillés)

2. **Annulation RDV par prospect**:
   - Permettre prospect annuler via lien unique
   - **Complexity**: +2 (génération token, page annulation, update Calendar)
   - **Future story**: s08c-booking-cancellation

3. **Reprogrammation RDV**:
   - Prospect peut déplacer RDV existant
   - **Complexity**: +2 (UI reschedule, validation conflits)
   - **Future story**: s08d-booking-reschedule

4. **Multi-CGP support (team booking)**:
   - Équipe de CGP partageant même booking page
   - **Complexity**: +5 (RBAC, routing, Calendar multi-users)
   - **Out of scope**: projet single-user actuellement

5. **Custom branding booking page**:
   - Logo CGP, couleurs personnalisées
   - **Complexity**: +1 (upload assets, theme override)
   - **Future improvement**: si demande user

6. **SMS confirmation (alternative email)**:
   - Envoyer SMS Brevo au lieu de/en plus de email
   - **Complexity**: +1 (Brevo SMS API, toggle Settings)
   - **Future story**: s09-rappels-sms couvre déjà SMS reminders

7. **Meeting video auto-gen (Zoom/Meet link)**:
   - Générer lien Zoom ou Google Meet automatiquement
   - **Complexity**: +3 (OAuth Zoom, Calendar API meet integration)
   - **Future improvement**: hors scope s08

---

## ADRs

### ADR-005: Booking page publique hors layout dashboard

**Context**: Page `/booking/[slug]` doit être accessible sans authentification, contrairement au reste de l'app dashboard.

**Decision**: 
- Page dans `src/app/booking/[slug]/` (pas dans `(dashboard)/`)
- Middleware exclut `/booking/` du auth redirect
- Page client component avec design PSG Cosmos standalone (import `C` local)

**Alternatives**:
- Server Component avec cookies auth → rejeté (complexité inutile, page publique simple)
- Layout dashboard avec conditional rendering → rejeté (middleware redirect pas flexible)

**Consequences**:
- ✅ Page accessible publiquement sans auth
- ✅ Design system réutilisé (cohérence visuelle)
- ⚠️ Fonts Google import inline nécessaire (pas de layout parent)

**Status**: Implémenté (code existant suit cette décision)

---

## Dependencies

### Depends on (requires before execution)
- ✅ s07-google-calendar-sync (OAuth + refresh token fonctionnels)
- ✅ Table `user_settings` existe
- ✅ Brevo API configurée (email sending)
- ✅ Middleware auth fonctionnel

### Depended by (blocks following stories)
- 🔗 s09-rappels-sms (nécessite table `bookings` créée en s08)
- 🔗 s08b-booking-config (étend settings booking avec horaires configurables)

**Critical path**: Oui — s09 dépend de table `bookings`

---

## Complexity Analysis

**Scored**: 3/5 (from stories.md)

**Breakdown**:
- DB: +0.5 (table bookings simple, indexes standard)
- API: +1 (3 endpoints dont 2 existants, Calendar sync complexe mais implémenté)
- UI: +0.5 (page booking existante, Settings component nouveau simple)
- Integration: +0.5 (Today affichage bookings, middleware exclusion)
- Tests: +0.5 (E2E flow complet + responsive)

**Total**: 3/5 ✅

**Validation**: 9 tasks, ~200 lignes nouveau code + audit 1050 lignes existantes — conforme limite ~10 tasks pour complexity 3.

---

## Validation Checklist

Avant de valider ce plan, vérifier:

- [x] Story s08 existe dans docs/stories.md avec AC clairs
- [ ] ⚠️ Research s08 n'existe pas — plan procède avec risque (devrait exécuter `/ks-research s08` avant)
- [ ] ⚠️ Design s08 n'existe pas — code existant suit PSG Cosmos, acceptable
- [x] Code existant identifié (page.tsx + 3 API routes)
- [x] Migration SQL `bookings` définie (Task 1)
- [x] Migration SQL `booking_slug` définie (Task 2)
- [x] Middleware exclusion critique identifiée (Task 3)
- [x] Tasks ordonnés logiquement (DB → middleware → Settings → Today → tests)
- [x] Exit criteria chaque task testable/vérifiable
- [x] Risks identifiés avec mitigations acceptables
- [x] Out of scope clairement défini (config horaires, annulation, reschedule)
- [x] Aucune tâche > 100 lignes code (Tasks Settings/Today ~60/40 lignes)
- [x] Total tasks = 9 ≤ 10 (respecte limite complexity 3)

**Warnings**:
- ⚠️ Pas de research s08 — plan basé sur diagnostique + code existant uniquement
- ⚠️ Pas de design s08 HTML — code existant suit design system, validé visually lors tests

---

**Status**: ✅ Plan prêt pour validation  
**Next step**: User valide → set `validated: yes` → `/ks-execute s08-booking-page`
