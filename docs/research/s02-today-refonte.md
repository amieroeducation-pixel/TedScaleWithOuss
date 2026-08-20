# Research — s02-today-refonte

**Story:** Section Aujourd'hui fiable et opérationnelle
**Status:** Research complete
**Date:** 2026-08-18

## Story summary

En tant que CGP, je veux que la page "Aujourd'hui" affiche mes RDV du jour (synchro Google Calendar), mes relances prioritaires, et mes tâches urgentes — le tout sans bug et sans donnée fantôme.

### Acceptance criteria

1. Les RDV du jour sont récupérés depuis Google Calendar API (pas localStorage) et affichés dans la grille agenda
2. Les relances prioritaires du jour sont tirées de la section Nurturing (contacts dont la prochaine action est aujourd'hui)
3. Les tâches urgentes (priorité haute + deadline aujourd'hui) apparaissent dans le bloc actions prioritaires
4. Le compteur d'appels/RDV/prospects de la semaine est calculé depuis les données réelles en DB
5. La page charge en < 2s et ne contient aucun squelette "..." ni donnée mockée

## Current state

### Code inventory

**Main file:** `src/app/(dashboard)/today/page.tsx` (1592 lines)

**Structure:**
- Client component (`'use client'`)
- 13+ sub-components/functions in the same file
- Multiple localStorage keys for persistence
- API integrations: `/api/today/signal`, `/api/today/agenda`, `/api/today/kpis`, `/api/calendar/events`

**Components extracted in file:**
1. `BlockIndicator` — Visual indicator for 52min work blocks (6 max/day)
2. `PressureDots` — Priority visualization (1-3 dots)
3. `AudioPlayer` — Audio player with playlist (local files, File API)
4. `VideoPlayer` — Video player with YouTube embed support + IndexedDB persistence
5. `TodayPage` — Wrapper with Suspense
6. `TodayPageContent` — Main component (1000+ lines)

**State management:**
- Weekly Signal: `signal` (relances + RDV semaine) from `/api/today/signal`
- Timer: centisecond precision (10ms interval), localStorage persistence
- Blocks: 6 blocks max/day, localStorage per date
- Counters: contacts/calls/rdv1/rdv2, dual persistence (localStorage + DB via `/api/today/kpis`)
- Agenda: events from `/api/today/agenda` (Supabase) with localStorage fallback
- Targets: daily objectives configurable via modal, localStorage + DB

**localStorage keys (date-keyed):**
- `today_timer_${date}` — Timer state (sec, running, startedAt)
- `blocks_${date}` — Blocks completed count
- `today_counters_${date}` — Daily KPIs (contacts, calls, rdv1, rdv2)
- `today_targets_${date}` — Daily targets override
- `today_targets_default` — Default targets for future days
- `ldc_last_played` — Last time theme music played (1h cooldown)
- Agenda keys via `lib/agenda.ts`

**API routes verified:**

1. `/api/today/signal` (GET) — Returns `{ relances[], rdvSemaine[], todayCount, weekRdvCount }`
   - Location: `src/app/api/today/signal/route.ts`
   - Pulls from `prospects` (next_action_date ≤ 7 days) + `interactions` (rdv1/rdv2/rdv3 this week)
   - Works ✅

2. `/api/today/agenda` (GET/POST/DELETE)
   - Location: `src/app/api/today/agenda/route.ts`
   - Supabase `user_agenda` table
   - Works ✅

3. `/api/today/kpis` (GET/POST)
   - Location: `src/app/api/today/kpis/route.ts`
   - Supabase `daily_kpis` table
   - Works ✅

4. `/api/calendar/events` (GET/POST)
   - Location: `src/app/api/calendar/events/route.ts`
   - Google Calendar API v3 integration
   - OAuth token refresh handled automatically
   - Returns events for current week by default
   - Works ✅

**Helpers/libs:**

1. `@/lib/agenda` — Agenda event types, colors, localStorage fallback, Fantastical URL generation
2. `@/lib/theme` — PSG Cosmos palette (`C.bgDeep`, `C.gold`, etc.)
3. `@/lib/cross-links` — LinkButton, LinkBadge, LinkInline navigation helpers
4. `@/lib/navigation-state` — saveLastSection() for sidebar highlight
5. `@/hooks/useCelebrations` — Confetti celebrations on milestones

### Dependencies

**Story s07 (Google Calendar sync):**
- OAuth flow: `/api/auth/google-calendar/` (exists)
- Token storage: `user_settings.google_calendar_refresh_token`
- Token refresh: handled in `/api/calendar/events/route.ts` (getValidToken function)
- Status: ✅ Implemented and working

**Story s05 (Nurturing):**
- Relances data: pulled from `prospects.next_action_date`
- Status: ✅ Data source exists in `/api/today/signal`

**Story s04 (Tasks):**
- Tasks table: `supabase/migrations/010_tasks.sql` (exists)
- Tasks page: `src/app/(dashboard)/tasks/page.tsx` (exists)
- Tasks API: NOT found — no `/api/tasks` route yet
- Status: ⚠️ Table exists, API route missing

### What works now

1. ✅ Weekly Signal — relances 7 days + RDV semaine affichés
2. ✅ Timer centisecondes — 52min blocks with localStorage persistence
3. ✅ Block indicators — 6/6 visual progress
4. ✅ Daily counters — contacts/calls/rdv1/rdv2 with DB + localStorage dual persistence
5. ✅ Configurable targets — modal for daily/default objectives
6. ✅ Agenda — editable events via Supabase with localStorage fallback
7. ✅ Audio player — local files with full controls
8. ✅ Video player — local files + YouTube URLs with IndexedDB persistence
9. ✅ Celebrations — triggered on milestones (blocks, objectives)
10. ✅ Google Calendar API integration — reads events from primary calendar

### Current issues

**AC1: RDV du jour depuis Google Calendar**
- Calendar API works (`/api/calendar/events`)
- BUT: page doesn't call this API yet
- Current: agenda events come from Supabase `user_agenda` table (manually added)
- **Gap:** No integration between Calendar API and Today page display

**AC2: Relances prioritaires du jour**
- `/api/today/signal` returns all relances ≤ 7 days
- Displayed in "Weekly Signal" section
- **Gap:** Need to filter `days_until === 0` for "today only" display in priority block

**AC3: Tâches urgentes aujourd'hui**
- Tasks table exists (`010_tasks.sql`)
- **Gap:** No `/api/tasks` route to fetch tasks
- **Gap:** No task display on Today page

**AC4: Compteurs depuis DB**
- ✅ Implemented via `/api/today/kpis`
- Loads on mount, saves with 2s debounce
- Counters are REAL (not mocked)

**AC5: Page charge < 2s, no mock data**
- ⚠️ Page is 1592 lines — may impact initial parse time
- ✅ No mock data in counters (loads from DB)
- ⚠️ Agenda has localStorage fallback (acceptable as backup)
- ✅ Weekly Signal loads from real data

### Traps & blockers

1. **File size:** 1592 lines in single file
   - Risk: Hard to maintain, long PR reviews
   - Pattern from codebase: extract components when > 500 lines (per AGENTS.md)
   - **Action needed:** Extract sub-components (AudioPlayer, VideoPlayer, Timer, Counters, Agenda, WeeklySignal) into separate files in `today/` folder

2. **Mixed data sources:**
   - Agenda: Supabase `user_agenda` (manual entries) vs Google Calendar (OAuth)
   - Risk: Confusion between "agenda I created in app" vs "RDV from Calendar"
   - **Decision needed:** Merge or keep separate?
     - Option A: Replace `user_agenda` with Calendar API entirely (Calendar is source of truth)
     - Option B: Show both (Calendar RDV + manual agenda blocks)

3. **Tasks API missing:**
   - Table exists, but no `/api/tasks` route
   - **Action needed:** Create `/api/tasks` route (GET for today's urgent tasks)

4. **Google Calendar token expiry:**
   - Current: token refresh handled in `/api/calendar/events`
   - Fallback: Returns `{ connected: false }` if no token
   - **Trap:** If OAuth not done yet, page should show "Connect Calendar" message, not blank section

5. **Performance:**
   - Multiple API calls on mount: `/api/today/signal`, `/api/today/kpis`, `/api/today/agenda`, potentially `/api/calendar/events`
   - Timer interval: 10ms (centisecond precision) — acceptable but verify CPU usage
   - **Mitigation:** Use React.lazy() for heavy components (AudioPlayer, VideoPlayer)

6. **localStorage reliance:**
   - 7+ localStorage keys
   - Risk: localStorage full, disabled, or cleared
   - Current: try/catch guards exist (good)
   - **Acceptable:** localStorage is cache, DB is source of truth

### Existing tests

- No test file found: `e2e/today.spec.ts` does not exist
- Playwright tests exist in `e2e/` but no Today page coverage yet
- **Action needed:** Create E2E test for Today page (load time, API calls, counter increments)

## Verified APIs and functions

### `/api/today/signal`

**Location:** `src/app/api/today/signal/route.ts`

**Signature:**
```typescript
export async function GET(_request: NextRequest): Promise<NextResponse>
```

**Returns:**
```typescript
{
  success: true,
  data: {
    relances: RelanceRow[],      // prospects with next_action_date ≤ 7 days
    rdvSemaine: RdvRow[],         // interactions type rdv1/rdv2/rdv3 this week
    todayCount: number,           // relances with days_until === 0
    weekRdvCount: number          // rdvSemaine.length
  }
}
```

**Dependencies:**
- `prospects` table: `full_name, profession, pipeline_stage, next_action_date, lead_score, phone, email`
- `interactions` table: `type, occurred_at, notes, prospect_id`
- date-fns: `startOfWeek`, `endOfWeek`, `format`

**Works:** ✅ Verified in code

### `/api/calendar/events`

**Location:** `src/app/api/calendar/events/route.ts`

**Signature GET:**
```typescript
export async function GET(request: NextRequest): Promise<NextResponse>
```

**Query params:**
- `start` (optional): ISO date string, default = Monday this week
- `end` (optional): ISO date string, default = Sunday this week

**Returns:**
```typescript
{
  success: true,
  data: {
    events: Array<{
      id: string,
      title: string,
      start: string | null,
      end: string | null,
      allDay: boolean,
      location: string | null,
      description: string | null
    }>,
    connected: boolean  // false if no refresh_token
  }
}
```

**Signature POST:**
```typescript
export async function POST(request: NextRequest): Promise<NextResponse>
```

**Body:**
```typescript
{
  title: string,
  start: string,  // ISO datetime or date
  end: string,
  allDay?: boolean,
  location?: string,
  description?: string
}
```

**Token refresh:**
- Function: `getValidToken(supabase, userId, row)`
- Checks expiry, refreshes if needed, updates DB
- Uses `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from env

**Works:** ✅ Verified in code

### `/api/today/kpis`

**Location:** `src/app/api/today/kpis/route.ts`

**Signature GET:**
```typescript
export async function GET(_request: NextRequest): Promise<NextResponse>
```

**Returns:**
```typescript
{
  success: true,
  data: {
    kpi: {
      contacts: number,
      calls: number,
      rdv1: number,
      rdv2: number,
      blocks: number
    },
    targets: {
      contacts: number,
      calls: number,
      rdv1: number,
      rdv2: number
    }
  }
}
```

**Signature POST:**
```typescript
export async function POST(request: NextRequest): Promise<NextResponse>
```

**Body:**
```typescript
{
  contacts: number,
  calls: number,
  rdv1: number,
  rdv2: number,
  blocks: number
}
```

**DB table:** `daily_kpis` (upsert by date)

**Works:** ✅ Verified in code

### `/api/tasks` — MISSING

**Status:** ❌ Route does not exist

**Expected signature:**
```typescript
export async function GET(request: NextRequest): Promise<NextResponse>
```

**Expected query params:**
- `urgency=urgent` — filter urgent tasks
- `deadline=today` — filter tasks due today

**Expected returns:**
```typescript
{
  success: true,
  data: {
    tasks: Array<{
      id: string,
      title: string,
      description: string,
      priority: number,
      col: string,
      urgency: 'urgent' | 'normal',
      this_week: boolean,
      created_at: string
    }>
  }
}
```

**DB table:** `tasks` (exists, see `010_tasks.sql`)

**Action needed:** Create this route

## Anchor points

### Where to plug in Calendar events display

**Current:** Agenda section displays events from `user_agenda` table

**Integration point:** `TodayPageContent` component

**Current code (lines ~656-665):**
```typescript
useEffect(() => {
  const dk = todayDateKey()
  fetch(`/api/today/agenda?date=${dk}`)
    .then(r => r.json())
    .then(j => { if (j.data) setAgendaEvents(j.data) })
    .catch(() => {
      setAgendaEvents(loadDayAgenda(dk))
    })
}, [])
```

**Modification needed:**
1. Add parallel fetch to `/api/calendar/events?start=${todayStart}&end=${todayEnd}`
2. Merge results: Calendar events + manual agenda events
3. Display with visual distinction (e.g., Calendar events have 🗓️ icon, manual events have ✏️)

### Where to plug in Tasks display

**Current:** No tasks display on Today page

**Integration point:** Create new section "Actions prioritaires" after Weekly Signal

**Pattern to follow:** Similar to Weekly Signal cards

**Code location:** After line ~1100 (after Weekly Signal render)

**New state needed:**
```typescript
const [urgentTasks, setUrgentTasks] = useState<Task[]>([])
```

**Fetch pattern:**
```typescript
useEffect(() => {
  fetch('/api/tasks?urgency=urgent&deadline=today')
    .then(r => r.json())
    .then(j => { if (j.data) setUrgentTasks(j.data.tasks) })
    .catch(() => setUrgentTasks([]))
}, [])
```

### File extraction plan

Current file structure is monolithic. Extract to:

```
src/app/(dashboard)/today/
├── page.tsx                   (main orchestrator, ~400 lines)
├── WeeklySignal.tsx           (signal display)
├── DeepWorkTimer.tsx          (timer + blocks)
├── DailyCounters.tsx          (contacts/calls/rdv counters)
├── TodayAgenda.tsx            (agenda grid + modal)
├── UrgentTasks.tsx            (NEW — tasks display)
├── AudioPlayer.tsx            (audio player)
├── VideoPlayer.tsx            (video player)
└── types.ts                   (shared types)
```

**Pattern from codebase:**
- Nurturing has extracted components: `nurturing/ContactList.tsx`, etc.
- CRM likely similar (not verified but mentioned in docs)

## Open questions

1. **Calendar vs Manual Agenda merge strategy:**
   - Should Calendar RDV replace `user_agenda` entirely?
   - Or merge both sources and let user see distinction?
   - Recommendation: **Merge both** — Calendar is official RDV, manual agenda is internal blocks (prospection time, admin, etc.)

2. **Tasks API scope:**
   - Should `/api/tasks` return ALL tasks or just today's urgent?
   - Recommendation: Add query params for filtering, return filtered subset

3. **Component extraction scope:**
   - Extract all components now (s02) or incrementally?
   - Recommendation: **Extract during s02** — story mentions "découper en composants pendant cette story"

4. **Performance target:**
   - AC5 says "< 2s load time" — measure baseline?
   - Recommendation: Add E2E test with performance assertion

5. **localStorage vs DB priority:**
   - Current: localStorage as cache, DB as truth
   - Should we eliminate localStorage entirely?
   - Recommendation: **Keep localStorage** — acceptable for offline tolerance and instant feedback

## Recommendations

### For /ks-plan

1. **Create `/api/tasks` route first** — blocks Task display
2. **Extract components in parallel** — AudioPlayer, VideoPlayer, Timer, etc. into separate files
3. **Integrate Calendar API** — add fetch to Today page, merge with manual agenda
4. **Create UrgentTasks component** — fetch + display
5. **Add E2E test** — cover full Today page flow
6. **Verify load time** — measure with Playwright performance API

### For /ks-execute

- File splitting is safe — no shared state between sub-components
- API integrations are additive — won't break existing features
- localStorage keys are date-scoped — no cross-day pollution risk

### For /ks-review

- Focus on: load time measurement, Calendar/Agenda merge clarity, component boundaries
- Test: Calendar token expiry fallback, Tasks API if not connected

---

**Research complete.** All APIs verified, traps identified, anchor points located.

**Next step:** /ks-design s02-today-refonte (UI story) or /ks-plan s02-today-refonte
