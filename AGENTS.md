# AGENTS.md — Technical Conventions for AI Agents

This file defines the concrete conventions any agent MUST follow when writing code in this project.

## Stack

- Next.js 15 App Router (TypeScript strict, `output: 'standalone'`)
- Supabase Auth SSR v0.10 + PostgreSQL
- Zod v4 for validation
- Inline CSS via `src/lib/theme.ts` (PSG Cosmos palette)
- Brevo API for email/SMS
- Google Calendar API (OAuth2) for calendar sync

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
- Phone normalization: use `normalizePhoneFr()` from `src/lib/phone-utils.ts`

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
