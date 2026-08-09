# AGENTS.md — Technical Conventions for AI Agents

This file defines the concrete conventions any agent MUST follow when writing code in this project.

## Stack

- Next.js 15 App Router (TypeScript strict, `output: 'standalone'`)
- Supabase Auth SSR v0.10 + PostgreSQL
- Zod v4 for validation
- Inline CSS via `src/lib/theme.ts` (PSG Cosmos palette)
- Brevo API for SMS
- Google Calendar API (OAuth2) via `googleapis` for calendar sync
- Resend + react-email for transactional emails
- Radix UI primitives for accessible components (dialog, alert-dialog, tooltip, select)
- libphonenumber-js for phone validation/normalization
- use-debounce for search and auto-save

## File organization

- Dashboard pages: `src/app/(dashboard)/<section>/page.tsx`
- Extract components in same folder when page > 500 lines (e.g., `nurturing/ContactList.tsx`)
- API routes: `src/app/api/<domain>/route.ts`
- Shared logic: `src/lib/<domain>/`
- Migrations: `supabase/migrations/YYYYMMDD_<name>.sql`

## API route pattern

```typescript
import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'
import { z } from 'zod'

const schema = z.object({ /* ... */ })

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return apiError(parsed.error.issues.map(e => e.message).join(', '), 400)
  }

  const { data, error } = await supabase.from('table').insert(parsed.data).select().single()
  if (error) return apiError(error.message)
  return apiSuccess(data, 201)
}
```

## Cron route pattern

```typescript
import { NextRequest } from 'next/server'
import { verifyCronSecret } from '@/lib/cron/auth'
import { logCronRun } from '@/lib/cron/logger'
import { isCronEnabled } from '@/lib/cron/toggles'
import { createSupabaseCronClient } from '@/lib/supabase/cron-client'
import { apiSuccess, apiError } from '@/lib/api'

export async function GET(req: NextRequest) {
  const authError = verifyCronSecret(req)
  if (authError) return authError

  if (!(await isCronEnabled('job-name'))) {
    return apiSuccess({ status: 'disabled' })
  }

  const supabase = createSupabaseCronClient()
  // ... logic ...
  await logCronRun({ userId, jobName: 'job-name', status: 'success', details: {} })
  return apiSuccess({ status: 'ok' })
}
```

## Styling rules

- Import `C` from `@/lib/theme.ts` for all colors
- Use inline `style={{ }}` objects with C values — NOT Tailwind color classes
- Tailwind is available for layout utilities (flex, grid, spacing) only
- NEVER modify `theme.ts` or `layout.tsx` without explicit user request

## Auth rules

- Always use `getUser()` (never `getSession()`) — validates JWT server-side
- Cron routes use `verifyCronSecret()` + `createSupabaseCronClient()` (service role)
- Public routes must be listed in `middleware.ts` isPublicRoute check

## Validation (Zod v4)

- Use `.issues` not `.errors`
- Use `z.record(key, val)` with 2 args
- Use `safeParse` — never `parse` in API routes

## Database

- Direct Supabase query builder (no ORM)
- Always filter by `user_id` for multi-tenant safety
- Phone normalization: use `normalizePhoneFr()` from `src/lib/phone.ts` (libphonenumber-js)

## Google Calendar integration

- Use `googleapis` client (server-side only, never client)
- OAuth flow: `/api/auth/google-calendar` → callback → store `refresh_token` in `user_settings`
- Wrapper: `src/lib/google/calendar.ts` exports `getCalendarClient(refreshToken)`
- Auto-refresh token handled by googleapis

## Email system

- Templates: `src/emails/*.tsx` (React components via react-email)
- Delivery: Resend API (`src/lib/email.ts` wrapper)
- Use cases: booking confirmations, RDV reminders (fallback SMS), nurturing sequences
- Brevo remains for SMS only

## UI Components

- Use Radix UI primitives for modals, dialogs, tooltips, selects
- Style with inline CSS (PSG Cosmos palette from `theme.ts`)
- Pattern: Headless Radix + custom styles, NOT shadcn pre-styled components

```typescript
import * as Dialog from '@radix-ui/react-dialog'
import { C } from '@/lib/theme'

<Dialog.Root>
  <Dialog.Overlay style={{ background: 'rgba(0,0,0,0.7)' }} />
  <Dialog.Content style={{ background: C.bgMid, border: `1px solid ${C.line}` }}>
    {/* content */}
  </Dialog.Content>
</Dialog.Root>
```

## Search & Auto-save

- Use `use-debounce` hook for search inputs (300ms) and auto-save (1000ms)
- Pattern: `useDebouncedValue(searchTerm, 300)` → query with debounced value
- Pattern: `useDebouncedCallback(saveFn, 1000)` → auto-save on input change

## Phone validation

- Use `libphonenumber-js` for all phone operations
- Normalize before storing: `normalizePhoneFr(input)` → `+33612345678`
- Validate in Zod schemas: `z.string().refine(val => isValidPhoneNumber(val, 'FR'))`
- Detect mobile: `isMobilePhoneFr(phone)` for "portables uniquement" filters
- Display format: `formatPhoneDisplay(e164)` → `"06 12 34 56 78"`

## Testing

- E2E: Playwright (`npx playwright test`)
- Unit: Vitest (`npm run test:unit`)
- Typecheck: `npx tsc --noEmit`

## What NOT to do

- Never import from `node_modules` paths directly
- Never use `getSession()` for auth checks
- Never hardcode colors — always use `C.xxx` from theme.ts
- Never commit `.env.local` or secrets
- Never modify design/layout without explicit request
