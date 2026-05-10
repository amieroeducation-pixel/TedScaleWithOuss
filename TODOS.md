# TODOS — Ted Scale With Ouss

## Backend Phase (after UI complete)

### TODO-001: Google Places API rate-limit protection
**Status:** Open  
**Phase:** 3 (Scraping)  
**What:** Add 200ms delay between paginated requests + exponential backoff on 429 responses in `src/lib/scraping/orchestrator.ts`.  
**Why:** Without it, large TNS scrapes (50+ results) hit the 50 req/s limit and freeze silently at N% progress with no recovery path. The user sees a stuck progress bar with no error.  
**Spec:**
- `await sleep(200)` between each `nearbySearch` / `textSearch` call
- On 429: retry after `2^attempt * 1000ms` (max 3 retries, then fail with clear error)
- On failure: set `scraping_jobs.status = 'error'`, write `error_message` column
- Show toast: "Le job de scraping a échoué — limite API atteinte. Réessaie dans 1 minute."  
**Depends on:** Phase 3 orchestrator build

---

### TODO-002: Google Calendar OAuth refresh token expiry
**Status:** Open  
**Phase:** 6 (Calendar integration)  
**What:** Graceful re-auth flow when Google OAuth refresh token expires.  
**Why:** Google invalidates refresh tokens after 6 months of inactivity. Without handling this, Calendar sync silently stops — you miss client RDV sync without knowing.  
**Spec:**
- On Google Calendar API 401: set `user_settings.google_refresh_token = null`
- Show persistent banner in dashboard header: "📅 Google Calendar déconnecté — Reconnecter"
- Banner links to `/settings?reconnect=calendar` which re-triggers OAuth flow  
**Depends on:** Phase 6 Calendar integration
