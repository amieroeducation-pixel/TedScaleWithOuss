# ADR-005: googleapis pour intégration Google Calendar

## Status
Accepted

## Context
Pour tuer Calendly (stories s07-s08-s09), le Dashboard doit synchroniser bidirectionnellement avec Google Calendar : lire les événements, créer des RDV, vérifier les créneaux disponibles, et envoyer des rappels basés sur les RDV à venir.

## Decision
Utiliser `googleapis` (client officiel Node.js de Google) pour l'intégration Google Calendar API v3.

## Options considered

| Option | Avantages | Inconvénients | Verdict |
|--------|-----------|---------------|---------|
| **googleapis (choisi)** | Client officiel, refresh token auto, TypeScript natif, maintenance Google | Taille bundle 2MB (server-side only OK) | Retenu |
| @google-cloud/calendar | Même équipe Google, mais orienté GCP | Moins de docs communautaires | Rejeté |
| Custom fetch wrapper | Léger, contrôle total | Gestion OAuth manuelle complexe, bugs refresh token | Rejeté |

## Consequences
- **Installation** : `npm install googleapis`
- **Usage** : API routes uniquement (server-side), jamais côté client
- **OAuth flow** : `/api/auth/google-calendar` → callback → store refresh_token en `user_settings`
- **Refresh automatique** : googleapis gère le renouvellement token (expiry 1h)
- **Routes impactées** :
  - `/api/calendar/events` (GET/POST/PATCH/DELETE)
  - `/api/auth/google-calendar/callback`
  - `/api/bookings` (vérifie disponibilités)
  - `/api/cron/rdv-reminder` (lit RDV à venir)

## Implementation notes
```typescript
// src/lib/google/calendar.ts
import { google } from 'googleapis'

export function getCalendarClient(refreshToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  return google.calendar({ version: 'v3', auth: oauth2Client })
}
```
