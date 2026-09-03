---
story: s07-google-calendar-sync
date: 2026-09-03
status: complete
validated: yes
complexity: 3
---

# Plan — s07-google-calendar-sync (Rétroactif)

## Story Goal

Synchro bidirectionnelle Google Calendar — les RDV créés dans le Dashboard apparaissent dans Google Calendar, et les événements Google Calendar sont visibles dans le Dashboard.

## Implémentation (Déjà sur master)

### 1. OAuth Flow & Token Management ✅

**Fichiers:**
- src/lib/google/calendar.ts — Client OAuth2, getAuthUrl(), getTokensFromCode()
- src/lib/google/tokens.ts — getValidGoogleToken() avec refresh auto (60s buffer)
- src/app/api/auth/google-calendar/route.ts — Initiation OAuth
- src/app/api/auth/google-calendar/callback/route.ts — Token exchange

**DB:** Colonnes user_settings (refresh_token, access_token, token_expiry, connected_at)

### 2. Calendar Events CRUD ✅

**Fichier:** src/app/api/calendar/events/route.ts

**GET** — Récupérer events avec date range (default: semaine en cours)
- Query params: start, end (ISO8601)
- Retourne: events avec id, title, start, end, allDay, location, description

**POST** — Créer event
- Body: { title, start, end, allDay?, location?, description? }
- Timezone: Europe/Paris
- Format all-day: { date: 'YYYY-MM-DD' }

**PATCH/DELETE** — Non implémentés (hors scope s07 initial)

### 3. Dashboard Integration ✅

**Today page** (src/app/(dashboard)/today/page.tsx):
- Fetch events via GET /api/calendar/events
- Merge avec localStorage agenda
- Affichage dans grille 7 jours
- Modal création rapide (double-click slot vide)

**Settings** (src/app/(dashboard)/settings/page.tsx L886):
- Statut connexion Calendar (connecté/déconnecté)
- Bouton "Connecter Google Calendar" → /api/auth/google-calendar

### 4. Booking Integration ✅

**Slots disponibles** (src/app/api/booking/slots/route.ts):
- Query Google Calendar events pour date donnée
- Exclut les créneaux occupés (9h-18h par défaut)
- Retourne slots 30min avec flag `available`

**Création booking** (src/app/api/booking/route.ts):
- Crée automatiquement event Google si user connecté
- Stocke google_event_id dans bookings table
- Envoie confirmation email Brevo

## Test Strategy

- ✅ OAuth flow testé manuellement (cf diagnostique 2026-05-15)
- ✅ Token refresh vérifié (buffer 60s avant expiry)
- ✅ GET events retourne events Google dans Today
- ✅ POST create events visible dans Google Calendar
- ✅ Booking slots excluent créneaux occupés
- ✅ Timezone Paris correct (pas de décalage)

## Definition of Done

- [x] OAuth 3-legged flow opérationnel
- [x] Token management avec auto-refresh
- [x] Events Google → Dashboard (lecture)
- [x] Dashboard → Events Google (création)
- [x] Booking page intégrée avec Calendar
- [x] Timezone Europe/Paris partout
- [x] All-day events supportés
- [x] Message déconnexion clair
- [x] Déployé en production

## Out of Scope (s07.1 potentiel)

- PATCH endpoint (éditer events depuis Dashboard)
- DELETE endpoint (supprimer events depuis Dashboard)
- Webhook push notifications (sync temps réel)
- Multi-calendar support

## Conclusion

Story s07 **déjà complète et opérationnelle sur master**. Tous les ACs couverts. Code en production depuis plusieurs semaines.

Review rétroactive recommandée pour documenter l'état.
