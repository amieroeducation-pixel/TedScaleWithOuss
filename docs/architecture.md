# Architecture — Dashboard CGP Refonte

## Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js App Router | 15.x |
| Language | TypeScript (strict) | 6.x |
| Auth | Supabase Auth SSR (`@supabase/ssr`) | 0.10.x |
| Database | Supabase (PostgreSQL) | - |
| State (client) | Zustand + React Query | 5.x / 5.x |
| Forms | React Hook Form + Zod v4 | 7.x / 4.x |
| Drag & Drop | dnd-kit | 6.x |
| Email/SMS | Brevo API | - |
| Calendar | Google Calendar API (OAuth2) | v3 |
| Notifications | Telegram Bot API | - |
| Charts | Recharts | 3.x |
| Style | Inline CSS via `theme.ts` (PSG Cosmos) + Tailwind utilities | 4.x |
| Icons | Lucide React | - |
| Build output | `standalone` (Docker/Cloud Run) | - |
| Tests | Playwright (E2E) + Vitest (unit) | - |

## Structure

```
src/
├── app/
│   ├── (dashboard)/          # Route group — authenticated pages
│   │   ├── layout.tsx        # Sidebar PSG Cosmos + auth guard
│   │   ├── today/            # Vue quotidienne
│   │   ├── nurturing/        # Module nurturing (composants extraits)
│   │   ├── crm/              # Kanban CRM
│   │   ├── tasks/            # Kanban tâches
│   │   ├── prospection/tns/  # Prospection TNS
│   │   ├── settings/         # Paramètres + OAuth Calendar
│   │   └── [autres sections en sommeil]
│   ├── booking/[slug]/       # Page publique prise de RDV (à créer)
│   ├── api/
│   │   ├── prospects/        # CRUD prospects
│   │   ├── calendar/events/  # Google Calendar read/write
│   │   ├── auth/google-calendar/ # OAuth flow
│   │   ├── crm/sequences/   # Séquences multicanales
│   │   ├── cron/             # Jobs planifiés (auth via x-cron-secret)
│   │   └── [autres]
│   └── login/                # Auth page
├── lib/
│   ├── api.ts                # Helpers réponse API (apiSuccess, apiError, apiUnauthorized)
│   ├── theme.ts              # Palette PSG Cosmos (C.bgDeep, C.gold, etc.)
│   ├── env.ts                # Validation env vars (Zod)
│   ├── supabase/
│   │   ├── server.ts         # createSupabaseServerClient() (cookies-based)
│   │   └── cron-client.ts    # createSupabaseCronClient() (service role, no cookies)
│   ├── cron/
│   │   ├── auth.ts           # verifyCronSecret() — header x-cron-secret
│   │   ├── logger.ts         # logCronRun() → cron_logs table
│   │   └── toggles.ts        # isCronEnabled() — per-job toggle
│   ├── sequences/
│   │   ├── executor.ts       # Execution engine séquences
│   │   ├── brevo.ts          # sendBrevoEmail(), sendBrevoSms()
│   │   └── trigger.ts        # Pipeline stage triggers
│   └── telegram/bot.ts       # sendSectionNotification()
├── middleware.ts             # Auth redirect — getUser() + route exclusions
supabase/
└── migrations/               # SQL migrations (20260516–20260808)
```

## Conventions

### API Routes
- Fichier `route.ts` dans `src/app/api/<domain>/`
- Auth : `const supabase = await createSupabaseServerClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) return apiUnauthorized()`
- Validation body : Zod v4 schema → `safeParse` → `parsed.error.issues` (pas `.errors`)
- Réponse : toujours `apiSuccess(data)` ou `apiError(message, status)` (jamais `NextResponse.json` brut sauf 409 dédoublonnage)
- Type retour uniforme : `{ success: boolean, data: T | null, error: string | null }`

### Cron Routes
- Pattern : `GET /api/cron/<job-name>`
- Auth : `verifyCronSecret(req)` en première ligne — header `x-cron-secret`
- Toggle : `isCronEnabled('<job-name>')` avant logique
- Log : `logCronRun({ userId, jobName, status, details })` avant return
- Client DB : `createSupabaseCronClient()` (service role, pas de session utilisateur)

### Pages Dashboard
- Client Components (`'use client'`) avec fetch vers les API routes
- Style inline via objet `C` importé de `@/lib/theme.ts` — pas de classes Tailwind pour les couleurs PSG
- Composants extraits dans le même dossier que la page (ex: `nurturing/ContactList.tsx`)
- État local : `useState` + fetch. État partagé : Zustand store

### Supabase
- Server client : `createSupabaseServerClient()` — cookies-based, async
- Service client (cron) : `createSupabaseCronClient()` — service role key
- Migrations SQL dans `supabase/migrations/` préfixées par date YYYYMMDD
- Pas d'ORM — query builder Supabase direct (`.from().select().eq()`)

### Auth
- Middleware : `getUser()` (jamais `getSession()`) — validation JWT server-side
- Routes publiques exclues dans middleware.ts : `/login`, `/_next`, `/api/auth`, `/api/cron`, `/api/playbooks`, `/favicon.ico`, `/celebrations`, `/booking` (à ajouter)

### Design
- Palette définie dans `C` (`theme.ts`) — NE JAMAIS MODIFIER sans demande explicite
- Inline CSS : `style={{ background: C.bgDeep, color: C.gold }}`
- Layout dashboard fixe dans `layout.tsx` — sidebar gauche + zone contenu

### Forms & Validation
- React Hook Form + Zod resolver pour les formulaires complexes
- Zod v4 : `.issues` (pas `.errors`), `z.record(key, val)` avec 2 args

## Data Model (tables clés)

| Table | Rôle |
|-------|------|
| prospects | Contacts commerciaux (full_name, phone, email, pipeline_stage, source, tags) |
| interactions | Historique (type: appel/rdv/email/whatsapp/linkedin, occurred_at, prospect_id) |
| commissions | CA par produit/mois |
| user_settings | Paramètres utilisateur (KPI, tokens OAuth, toggles sections) |
| sequence_templates | Bibliothèque de séquences multicanales |
| sequence_instances | Instance de séquence active sur un prospect |
| sequence_steps | Étapes d'une séquence (channel, delay, content) |
| sequence_step_executions | Log d'exécution (status, sent_at, error) |
| cron_logs | Log de chaque job cron (jobName, status, details) |
| achievements | Badges et succès |
| bookings | RDV pris via lien public (à créer) |
| tasks | Tâches (à vérifier/créer si absente) |

## Integrations externes

| Service | Usage | Auth |
|---------|-------|------|
| Supabase | DB + Auth | ANON_KEY + SERVICE_ROLE_KEY |
| Google Calendar | Lecture/écriture événements | OAuth2 (refresh token en user_settings) |
| Brevo | Email + SMS transactionnels | API Key |
| WhatsApp Business | Messages directs | Phone Number ID + Access Token |
| Telegram | Notifications internes | Bot Token |
| entreprises.data.gouv.fr | Recherche TNS | Public (pas de clé) |

## Décisions (ADRs)

Voir `docs/decisions/` :
- ADR-001 : Stack Next.js + Supabase (pas de boilerplate externe)
- ADR-002 : Inline CSS via theme.ts (pas de Tailwind pour la palette)
- ADR-003 : Cron via API routes + secret header (pas de Edge Functions Supabase)
- ADR-004 : Page booking publique hors layout dashboard
