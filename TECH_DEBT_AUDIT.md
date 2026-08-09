# Tech Debt Audit — Ted Scale With Ouss

Generated: 2026-08-08

## Executive Summary

- **4 Critical**, 9 High, 18 Medium, 8 Low findings across 93 API routes and ~36k LOC TypeScript
- God files: 9 files > 500 LOC, largest `settings/page.tsx` at 2,264 lines with 185 function declarations
- **Zero unit tests** — only 119 lines of e2e tests (3 Playwright specs) covering auth + nurturing temperature
- **3 unused dependencies** in production: `zustand`, `react-dropzone`, `papaparse`, `@tanstack/react-query`, `@tanstack/react-table` — never imported
- **Security holes**: 4 endpoints with no/optional auth (validate, telegram webhook, linkedin-signal, send-scheduled)
- **Supabase client sprawl**: 10+ inline `createClient()` definitions instead of using shared `createSupabaseCronClient()`
- **No env documentation**: 20 env vars referenced, no `.env.example`, no README

## Architectural Mental Model

A single-tenant Next.js 15 App Router dashboard for a CGP (wealth advisor). All logic lives in page-level `page.tsx` files (no component extraction) and parallel API route handlers. Data flows: Browser → fetch() → /api/* → Supabase. External integrations: Brevo (email/SMS), Telegram bot, Google Calendar OAuth, LinkedIn webhooks, Pappers/data.gouv.fr for lead scraping.

The codebase was built feature-by-feature in rapid sprints (git log shows ~200 commits, all in < 6 months). Each page is a self-contained monolith with inline state, inline fetch calls, and inline styles via theme.ts. There is no shared data layer, no React Query/SWR, no abstraction between pages.

## Findings

| ID | Category | File:Line | Severity | Effort | Description | Recommendation |
|----|----------|-----------|----------|--------|-------------|----------------|
| F001 | Architectural decay | `settings/page.tsx:1-2264` | Critical | L | 2,264-line god file with 185 functions — handles 10+ tabs (KPI, sequences, triggers, templates, notifications) in a single component | Extract each tab into a separate component file under `settings/` |
| F002 | Architectural decay | `crm/page.tsx:1-1835` | Critical | L | 1,835-line monolith — Kanban board + prospect drawer + scripts editor + sequence management + drag-drop all in one file | Decompose into KanbanBoard, ProspectDrawer, ScriptPanel components |
| F003 | Architectural decay | `today/page.tsx:1-1592` | High | M | 1,592 lines — agenda, video player, relances, KPIs, weekly signal all inline | Extract sections into focused components |
| F004 | Architectural decay | `nurturing/page.tsx:1-978` | High | M | 978-line page with 6 `any`-typed mapping functions, inline state for contacts + sequences + documents | Create typed DTOs and extract sub-components |
| F005 | Architectural decay | `seed-library/route.ts:1-1135` | Medium | S | 1,135 lines of hardcoded seed data in a route handler | Move to a separate `data/seed-library.json` |
| F006 | Consistency rot | Multiple API routes | High | M | 10+ files define their own `createClient()` inline (playbooks/, telegram/, engine-a.ts, engine-b.ts) instead of importing `createSupabaseCronClient()` from `lib/supabase/cron-client.ts` | Consolidate all service-role clients to use the shared module |
| F007 | Consistency rot | All dashboard pages | High | M | Data fetching via raw `fetch()` in `useEffect` — no React Query, no SWR, no shared fetcher, no cache, no deduplication. `@tanstack/react-query` is in package.json but never imported | Either adopt React Query consistently or remove the dep |
| F008 | Consistency rot | `crm/page.tsx`, `nurturing/page.tsx` | Medium | S | Date formatting mixes `date-fns`, raw `.toLocaleDateString()`, and manual string concatenation across pages | Standardize on one approach (date-fns already installed) |
| F009 | Consistency rot | API routes | Medium | S | Error responses are inconsistent: some use `apiError()` helper, some use raw `NextResponse.json({ error: ... })`, some return French messages, some English | Standardize all error responses through `apiError()` |
| F010 | Consistency rot | `crm/page.tsx:391,439,465,975,992,1027,1048,1133,1782,1798` | Medium | M | 10+ raw fetch calls within one file with no shared fetcher utility | Create a typed `apiFetch<T>(url, opts)` wrapper |
| F011 | Type debt | `nurturing/ContactDetail.tsx:25-63` | High | S | Props typed as `any` (7 occurrences): `attachedDoc: any`, `documents: any[]`, `messages: any[]`, callback params `any` | Define proper interfaces for NurturingDocument, NurturingMessage |
| F012 | Type debt | `nurturing/page.tsx:97,235,244,273,295` | Medium | S | 5 `.map((x: any) => ...)` casts on API response data — no typed response parsing | Define response DTOs matching Supabase table shapes |
| F013 | Type debt | `revenue/page.tsx:67,82,90,425` | Medium | S | Recharts tooltip/dot props typed as `any` (4 occurrences) | Use Recharts' exported tooltip prop types |
| F014 | Type debt | `playbooks/[id]/page.tsx:16` | Medium | S | `let playbook: any = null` — entire playbook detail page operates on untyped data | Import Playbook type from shared types |
| F015 | Type debt | `scoring/page.tsx:65` | Low | S | `router: any` in function params | Type as `ReturnType<typeof useRouter>` |
| F016 | Test debt | Project-wide | Critical | L | **93 API routes, 0 unit tests.** Only 119 lines of Playwright e2e tests across 3 specs. No coverage of: pipeline/move, sequences, playbooks, cron jobs, enrichissement | Add integration tests for top 10 critical API routes |
| F017 | Test debt | `e2e/` | Medium | S | Playwright configured but tests are minimal stubs (26+52+41 lines). `calculateTempCategory.spec.ts` is a unit test misplaced in e2e | Move unit tests to `__tests__/` or `tests/unit/`, expand e2e coverage |
| F018 | Dependency debt | `package.json` | High | S | **5 unused production deps**: `zustand` (0 imports), `react-dropzone` (0 imports), `papaparse` (0 imports), `@tanstack/react-query` (0 imports), `@tanstack/react-table` (0 imports) — adds ~200KB to bundle | Remove unused deps from package.json |
| F019 | Dependency debt | `package.json` | Medium | S | `autoprefixer` in dependencies but never referenced in postcss config or any file. Tailwind 4 handles prefixing internally | Remove autoprefixer |
| F020 | Dependency debt | Root | Medium | S | No `.env.example` — 20 env vars required with no documentation. New contributors must read every API route to discover them | Create `.env.example` with all 20 vars and descriptions |
| F021 | Performance | `cron/sequences-process/route.ts:54-68` | High | M | N+1 queries: 2 sequential Supabase calls per due step (up to 100 extra round-trips for 50 steps) | Batch-load all prospect IDs and template_step IDs with `.in()` before the loop |
| F022 | Performance | `cron/weekly-report/route.ts:33-165` | High | M | Per-user: 6 sequential Supabase queries that could be parallelized with `Promise.all()` | Wrap independent queries in `Promise.all()` |
| F023 | Performance | `cron/nurturing-temperature/route.ts:39-59` | Medium | M | Individual `.update()` call per prospect in loop — should batch by temperature category | Batch updates with `.in('id', ids).update(...)` |
| F024 | Performance | `clients/list/route.ts:28-64` | Medium | S | No pagination — fetches ALL clients. Will degrade as data grows | Add `.range()` pagination like `/api/prospects` already does |
| F025 | Performance | Dashboard pages | Medium | M | All pages fetch on mount with `useEffect` + `fetch` — no caching, no stale-while-revalidate. Navigating back re-fetches everything | Adopt React Query or Next.js server components with caching |
| F026 | Security | `playbooks/validate/route.ts:15-16` | Critical | S | **No auth check** — uses service-role client, anyone can POST to validate/reject prospects and trigger sequences | Add user session check or `verifyCronSecret` |
| F027 | Security | `telegram/webhook/route.ts:17-19` | High | S | Webhook auth is **optional** — if `TELEGRAM_WEBHOOK_SECRET` is unset, endpoint is fully open | Make secret mandatory; return 500 if not configured |
| F028 | Security | `playbooks/linkedin-signal/route.ts:39-43` | High | S | Same pattern — if `LINKEDIN_WEBHOOK_SECRET` is unset, anyone can inject prospects | Return 500 when env var missing |
| F029 | Security | `lib/cron/auth.ts:11` | High | S | `if (!expected) return null` — cron auth disabled when `CRON_SECRET` is unset. In production misconfiguration = open endpoints | Return 401 when `CRON_SECRET` is missing unless `NODE_ENV === 'development'` |
| F030 | Security | `cron/send-scheduled/route.ts` | High | S | No `verifyCronSecret` call — any unauthenticated request can trigger scheduled message sending | Add `verifyCronSecret(req)` guard |
| F031 | Security | `tasks/route.ts:24-34` | Medium | S | POST body destructured without Zod validation — arbitrary fields can be injected into DB insert | Add Zod schema (only 16/93 routes use Zod) |
| F032 | Security | `nurturing/contacts/route.ts:90-91` | Medium | S | POST body directly destructured, only `full_name` manually checked | Add Zod schema for all fields |
| F033 | Error handling | `lib/playbooks/engine-a.ts:315` | High | S | Empty `catch {}` silently swallows Pappers API enrichment errors on critical playbook path | Add `console.error` with context for diagnosability |
| F034 | Error handling | `enrichissement/route.ts:58,75,107` | Medium | S | 3 empty `catch {}` blocks — Pappers + Google Places failures completely invisible | Log warnings with error context |
| F035 | Error handling | `pipeline/move/route.ts:65,74` | Medium | M | Fire-and-forget `void` async operations (sequence trigger + client creation) with only `console.error` on failure | Log to `cron_logs` table for observability |
| F036 | Error handling | API routes (global) | Medium | M | Only 35 of 93 routes use structured error responses. Others may throw unhandled exceptions resulting in generic 500s | Wrap all route handlers in a shared error boundary pattern |
| F037 | Documentation | Root | Medium | S | No README.md — project has no standard onboarding document | Create README with setup, env vars, architecture overview |
| F038 | Documentation | `.planning/` | Low | S | Plans reference files that were never created (e.g., `src/lib/cross-links.ts`, migration `018_dashboard_final.sql`) | Mark stale plans as "superseded" or remove |
| F039 | Documentation | `src/lib/env.ts` (referenced in CLAUDE.md) | Low | S | CLAUDE.md references `src/lib/env.ts` for "Validation Zod des variables d'environnement" but this file may not validate all 20 env vars | Update env.ts to validate all current env vars |

## Top 5 — If You Fix Nothing Else, Fix These

### 1. F026 — Unauthenticated playbooks/validate endpoint (Critical, Small effort)

```typescript
// src/app/api/playbooks/validate/route.ts — add at top of POST handler:
import { createSupabaseServerClient } from '@/lib/supabase/server'

const supabase = await createSupabaseServerClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```

### 2. F029/F030 — Cron auth bypass when CRON_SECRET unset (Critical, Small effort)

```typescript
// src/lib/cron/auth.ts — replace:
if (!expected) return null
// with:
if (!expected) {
  if (process.env.NODE_ENV === 'development') return null
  return apiError('CRON_SECRET not configured', 500)
}
```
Also add `verifyCronSecret(req)` to `cron/send-scheduled/route.ts`.

### 3. F016 — Zero unit tests for 93 API routes (Critical, Large effort)

Priority test targets:
1. `pipeline/move` (money-affecting)
2. `playbooks/validate` (triggers sequences)
3. `cron/sequences-process` (sends messages)
4. `prospects/batch` (bulk import)
5. `crm/sequences/start` (enrolls prospects)

Recommended: Vitest + MSW for API route testing without Supabase dependency.

### 4. F001/F002 — God files settings (2264 LOC) + CRM (1835 LOC)

Extract tab contents into separate component files. Example for settings:
```
src/app/(dashboard)/settings/
  page.tsx           (~100 lines, tab router only)
  TabKPI.tsx
  TabSequences.tsx
  TabTriggers.tsx
  TabTemplates.tsx
  TabNotifications.tsx
  ...
```

### 5. F018 — 5 unused production dependencies

```bash
npm uninstall zustand react-dropzone papaparse @tanstack/react-query @tanstack/react-table autoprefixer
```
Saves ~200KB+ from the bundle and removes upgrade noise.

## Quick Wins (Low effort, Medium+ severity)

- [ ] F026: Add auth to `/api/playbooks/validate` (Critical, 4 lines)
- [ ] F027: Make Telegram webhook secret mandatory (High, 3 lines)
- [ ] F028: Make LinkedIn webhook secret mandatory (High, 3 lines)
- [ ] F029: Fix cron auth bypass in dev (High, 5 lines)
- [ ] F030: Add `verifyCronSecret` to `cron/send-scheduled` (High, 2 lines)
- [ ] F033: Add logging in `engine-a.ts` empty catch (High, 1 line)
- [ ] F018: Remove 5 unused deps (High, 1 command)
- [ ] F006: Replace 10 inline `createClient()` with import of shared module (High, 10 file edits)
- [ ] F011: Type ContactDetail props (High, define 2 interfaces)
- [ ] F020: Create `.env.example` (Medium, 1 new file)
- [ ] F009: Replace raw `NextResponse.json({ error })` with `apiError()` calls (Medium, ~20 files)
- [ ] F031: Add Zod to `/api/tasks` POST (Medium, 10 lines)
- [ ] F032: Add Zod to `/api/nurturing/contacts` POST (Medium, 10 lines)

## Things That Look Bad But Are Actually Fine

1. **Inline CSS everywhere via `theme.ts` instead of Tailwind classes** — This is an intentional design decision documented in CLAUDE.md. The PSG Cosmos theme uses a custom palette object (`C.bgDeep`, `C.gold`, etc.) and the user explicitly forbids changing this pattern. It's consistent and the theme object provides type safety.

2. **No server components for data fetching** — Pages use client-side `useEffect` + `fetch`. While server components would be more idiomatic Next.js 15, this is a single-user dashboard deployed on Cloud Run. The latency tradeoff of SSR doesn't matter for a single user, and the client-side pattern allows real-time UI updates without page reloads.

3. **1,135-line seed-library route** — It's all hardcoded template data for French business sequences. There's no logic to extract; it's a data dump that runs once. Moving to JSON would add a file read but no real improvement.

4. **`celebrations.ts` at 733 lines** — It's a data file of achievement definitions with emoji/messages. Pure declarative data, no logic complexity.

5. **CLAUDE.md references "GSD Workflow Enforcement"** — This is a development workflow guardrail from the gstack tooling, not dead code or process debt. It ensures planning artifacts stay in sync.

6. **`@types/node`, `@types/react`, `@types/react-dom` in dependencies (not devDeps)** — For Next.js standalone Docker builds, type packages must be in `dependencies` to be available at build time. This is correct.

## Open Questions for the Maintainer

1. **Are `cron/logs` and `cron/toggles` routes intentionally unauthenticated?** They don't use `verifyCronSecret` and expose cron job metadata to anyone who can hit the endpoint.
2. **Is `cron/send-scheduled` meant to be called by Cloud Scheduler?** If so, it needs CRON_SECRET auth. If it's user-triggered, it needs session auth.
3. **Is the `@anthropic-ai/sdk` dependency still needed?** It's used only in `call-analytics/improve-script/route.ts` — is this feature active?
4. **Should `react-dropzone` be kept for a future file upload feature?** Currently zero imports.
5. **What's the status of the `src/app/champions/page.tsx` (839 LOC)?** It's outside the `(dashboard)` layout group and doesn't appear in navigation.
6. **Are the `.planning/` phase docs still actively consulted?** They reference completed phases 1-6 and could be archived to reduce noise.
