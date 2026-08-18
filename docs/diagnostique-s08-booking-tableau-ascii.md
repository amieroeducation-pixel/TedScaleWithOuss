# Diagnostique s08-booking-page — Tableau Actions/Fonctions/Outils

**Méthodologie killer-saas** — Story s08-booking-page : Page publique de prise de rendez-vous (Kill Calendly)

---

## 📊 Résumé Exécutif

| Métrique | Valeur |
|----------|--------|
| **Actions totales** | 0 (page à créer) |
| ✅ Opérationnel | 0 |
| ⚠️ Partiel | 0 |
| ❌ Non implémenté | 8 |
| **Taux de fonctionnalité** | **0%** |

**Statut** : ❌ **PAGE À CRÉER** — Story non démarrée

---

## 🎯 Actions Attendues (d'après docs/stories.md)

### Actions utilisateur prévues

```
┌─────────────────┬────────────────┬──────────────────────────────────────┬──────────────────────────────────┬───────────────┐
│        #        │  Action User   │        Fonctions Principales         │              Outils              │    Statut     │
│                 │                │                                      │                                  │  Fonctionnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 1. BOOKING      │                │                                      │                                  │               │
│ (8 actions)     │                │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 1               │ Voir URL       │ [À CRÉER]                            │ Next.js Dynamic Route            │ ❌            │
│                 │ publique       │                                      │                                  │ Non implémenté│
│                 │                │ Page : src/app/booking/[slug]/       │                                  │               │
│                 │ Détails :      │ page.tsx                             │                                  │ Raison :      │
│                 │ 1. Ouvrir URL  │                                      │                                  │ Fichier       │
│                 │    /booking/   │ Fonction : validateCGPSlug()         │                                  │ inexistant    │
│                 │    ted-ouss    │ → fetch CGP settings                 │                                  │               │
│                 │ 2. Voir page   │ → display name + avatar              │                                  │               │
│                 │    responsive  │ → show available slots               │                                  │               │
│                 │ 3. Sans auth   │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 2               │ Voir créneaux  │ [À CRÉER]                            │ Google Calendar API,             │ ❌            │
│                 │ disponibles    │                                      │ date-fns, react-day-picker       │ Non implémenté│
│                 │                │ API : GET /api/calendar/slots        │                                  │               │
│                 │ Détails :      │ → fetch Google Calendar events       │                                  │               │
│                 │ 1. Voir        │ → compute free slots (9h-19h)        │                                  │               │
│                 │    calendrier  │ → exclude weekends                   │                                  │               │
│                 │    semaine     │ → return array of {start, end}       │                                  │               │
│                 │ 2. Slots lun-  │                                      │                                  │               │
│                 │    ven 9h-19h  │                                      │                                  │               │
│                 │ 3. Durée RDV   │                                      │                                  │               │
│                 │    configurable│                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 3               │ Masquer        │ [À CRÉER]                            │ Google Calendar API              │ ❌            │
│                 │ créneaux       │                                      │                                  │ Non implémenté│
│                 │ occupés        │ Fonction : filterBusySlots()         │                                  │               │
│                 │                │ → compare free slots with existing   │                                  │               │
│                 │ Détails :      │    events                            │                                  │               │
│                 │ 1. Fetch       │ → return only truly available slots  │                                  │               │
│                 │    events      │                                      │                                  │               │
│                 │    Google Cal  │                                      │                                  │               │
│                 │ 2. Exclure     │                                      │                                  │               │
│                 │    slots       │                                      │                                  │               │
│                 │    occupés     │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 4               │ Saisir nom/tel/│ [À CRÉER]                            │ react-hook-form, zod             │ ❌            │
│                 │ email          │                                      │                                  │ Non implémenté│
│                 │                │ Formulaire : BookingForm component   │                                  │               │
│                 │ Détails :      │ → validation zod schema              │                                  │               │
│                 │ 1. Remplir     │ → required fields                    │                                  │               │
│                 │    champs      │ → email format + phone format        │                                  │               │
│                 │ 2. Validation  │                                      │                                  │               │
│                 │    en temps    │                                      │                                  │               │
│                 │    réel        │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 5               │ Sélectionner   │ [À CRÉER]                            │ React state (useState)           │ ❌            │
│                 │ créneau        │                                      │                                  │ Non implémenté│
│                 │                │ Handler : handleSlotSelect()         │                                  │               │
│                 │ Détails :      │ → setSelectedSlot({start, end})      │                                  │               │
│                 │ 1. Cliquer     │ → highlight selected slot            │                                  │               │
│                 │    sur slot    │ → enable confirm button              │                                  │               │
│                 │ 2. Voir slot   │                                      │                                  │               │
│                 │    highlighted │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 6               │ Confirmer RDV  │ [À CRÉER]                            │ Supabase (table bookings),       │ ❌            │
│                 │                │                                      │ Google Calendar API              │ Non implémenté│
│                 │                │ API : POST /api/bookings             │                                  │               │
│                 │ Détails :      │ → validate form data                 │                                  │               │
│                 │ 1. Cliquer     │ → INSERT INTO bookings               │                                  │               │
│                 │    "Confirmer" │ → POST Google Calendar event         │                                  │               │
│                 │ 2. Voir loader │ → send confirmation email (Brevo)    │                                  │               │
│                 │ 3. Transaction │ → return booking_id                  │                                  │               │
│                 │    DB + Cal    │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 7               │ Voir           │ [À CRÉER]                            │ React Router (redirect),         │ ❌            │
│                 │ confirmation   │                                      │ Brevo Email API                  │ Non implémenté│
│                 │                │ Page : /booking/[slug]/confirmed     │                                  │               │
│                 │ Détails :      │ → display booking details            │                                  │               │
│                 │ 1. Redirect    │ → send email confirmation            │                                  │               │
│                 │    vers page   │ → show date/time/location            │                                  │               │
│                 │    confirmation│ → add to calendar links              │                                  │               │
│                 │ 2. Voir détails│                                      │                                  │               │
│                 │    RDV         │                                      │                                  │               │
│                 │ 3. Recevoir    │                                      │                                  │               │
│                 │    email       │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 8               │ (CGP) Voir RDV │ [À CRÉER]                            │ Supabase (JOIN bookings),        │ ❌            │
│                 │ dans Today     │                                      │ fetch /api/today/signal          │ Non implémenté│
│                 │                │                                      │                                  │               │
│                 │ Détails :      │ Fonction : fetchTodayBookings()      │                                  │               │
│                 │ 1. Voir        │ → SELECT * FROM bookings             │                                  │               │
│                 │    nouveaux    │    WHERE date = TODAY                │                                  │               │
│                 │    RDV page    │ → display in "RDV semaine" section   │                                  │               │
│                 │    Today       │                                      │                                  │               │
│                 │ 2. Badge       │                                      │                                  │               │
│                 │    notif       │                                      │                                  │               │
└─────────────────┴────────────────┴──────────────────────────────────────┴──────────────────────────────────┴───────────────┘
```

---

## 🔧 Fichiers à Créer

### Pages
- `src/app/booking/[slug]/page.tsx` — Page publique de booking
- `src/app/booking/[slug]/confirmed/page.tsx` — Page confirmation RDV

### API Routes
- `src/app/api/bookings/route.ts` — POST créer booking + Google Calendar event
- `src/app/api/calendar/slots/route.ts` — GET créneaux disponibles

### Components
- `src/components/BookingForm.tsx` — Formulaire nom/tel/email
- `src/components/SlotPicker.tsx` — Sélecteur de créneaux

### Database
```sql
-- Migration à créer
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cgp_id UUID REFERENCES auth.users(id),
  prospect_name TEXT NOT NULL,
  prospect_email TEXT NOT NULL,
  prospect_phone TEXT NOT NULL,
  booking_date TIMESTAMPTZ NOT NULL,
  duration_minutes INT DEFAULT 60,
  status TEXT DEFAULT 'confirmed',
  google_calendar_event_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Middleware
- Modifier `src/middleware.ts` pour exclure `/booking` de l'authentification :
```typescript
if (pathname.startsWith('/booking/')) {
  return NextResponse.next();
}
```

---

## 📋 Estimation Effort

| Tâche | Effort estimé |
|-------|---------------|
| Créer pages booking + confirmed | 2h |
| API routes (bookings + slots) | 2h |
| Components (form + slot picker) | 2h |
| Migration DB table bookings | 30min |
| Intégration Google Calendar | 1h |
| Brevo email confirmation | 30min |
| Tests manuels + debug | 1h |
| **TOTAL** | **~9h** |

---

## 🎯 Prochaine Étape

Une fois créé, ce tableau sera mis à jour avec le statut réel de chaque action après tests manuels dans le navigateur.

**Complexité story** : 3/5 (d'après docs/stories.md)

---

**Document généré le** : 2026-08-11  
**Statut** : Page à créer (story non démarrée)
