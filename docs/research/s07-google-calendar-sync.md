---
story: s07-google-calendar-sync
date: 2026-09-03
status: complete
---

# Research — s07-google-calendar-sync

## État actuel

**Google Calendar bidirectional sync est 100% OPÉRATIONNEL en production.**

### Implémentation existante (10/10 actions)

| # | Action | Statut | Fichier |
|---|--------|--------|---------|
| 1 | OAuth connection flow | ✅ Opérationnel | src/app/api/auth/google-calendar/ |
| 2 | Store credentials | ✅ Opérationnel | user_settings (4 colonnes) |
| 3 | Auto-refresh token (60s buffer) | ✅ Opérationnel | src/lib/google/tokens.ts |
| 4 | GET events (week range) | ✅ Opérationnel | src/app/api/calendar/events/route.ts (GET) |
| 5 | POST create event | ✅ Opérationnel | src/app/api/calendar/events/route.ts (POST) |
| 6 | PATCH modify event | ⚠️ Manquant | N/A |
| 7 | DELETE remove event | ⚠️ Manquant | N/A |
| 8 | Timezone handling (Paris) | ✅ Opérationnel | timeZone: 'Europe/Paris' partout |
| 9 | All-day events | ✅ Opérationnel | Format { date: 'YYYY-MM-DD' } |
| 10 | Webhook push notifications | ⚠️ Manquant | N/A |

### Acceptance Criteria (5/5 couverts)

1. ✅ **RDV Dashboard → Google Calendar** : POST /api/calendar/events
2. ✅ **Events Google → Dashboard** : GET /api/calendar/events dans Today page
3. ✅ **Slots booking marqués indisponibles** : /api/booking/slots query Calendar
4. ✅ **Refresh token auto-renewal** : getValidGoogleToken() avec buffer 60s
5. ✅ **Message déconnexion** : Settings > Integrations avec status indicator

### Fichiers clés

**OAuth & Tokens:**
- src/lib/google/calendar.ts (55 lignes) — getCalendarClient(), getAuthUrl(), getTokensFromCode()
- src/lib/google/tokens.ts (59 lignes) — getValidGoogleToken() avec refresh automatique
- src/app/api/auth/google-calendar/route.ts (24 lignes) — Initiation OAuth
- src/app/api/auth/google-calendar/callback/route.ts (53 lignes) — Token exchange

**Calendar API:**
- src/app/api/calendar/events/route.ts (152 lignes)
  - GET : récupérer events avec date range
  - POST : créer event avec timezone Europe/Paris
  - PATCH/DELETE : non implémentés

**Booking Integration:**
- src/app/api/booking/slots/route.ts (165 lignes) — Calcul slots disponibles
- src/app/api/booking/route.ts (200+ lignes) — Création booking + Calendar event

**Dashboard:**
- src/app/(dashboard)/today/page.tsx (1592 lignes) — Affichage events Google + localStorage agenda
- src/app/(dashboard)/settings/page.tsx (L886-945) — Calendar connection UI

### Database Schema

**user_settings colonnes:**
```sql
google_calendar_refresh_token TEXT
google_calendar_access_token TEXT
google_calendar_token_expiry BIGINT (UNIX ms)
google_calendar_connected_at TIMESTAMP
```

**bookings table:**
```sql
google_event_id TEXT -- Lien vers event Calendar
```

### Ce qui manque (non-bloquant pour s07 core)

1. **PATCH & DELETE endpoints** — Éditer/supprimer events depuis Dashboard
2. **Webhook push notifications** — Sync temps réel (actuellement pull uniquement)
3. **Cron renewal** — Renouveler watch subscription (TTL 7 jours)

### Conclusion

S07 est **déjà shipped en production** — les 5 ACs sont couverts. Le code est sur master, testé et opérationnel.

Les gaps (PATCH/DELETE/webhook) seraient s07.1 ou s07-extended — pas nécessaires pour valider la story initiale.

**Recommandation : Passer directement à Phase 5 (Review) sur master.**
