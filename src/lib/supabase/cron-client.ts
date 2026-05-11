import { createClient } from '@supabase/supabase-js'

/**
 * Client Supabase service_role sans dependency cookies().
 * A utiliser UNIQUEMENT dans les routes cron (/api/cron/*) appelees par curl/Task Scheduler.
 * Ne jamais utiliser dans des routes avec session utilisateur (utiliser createSupabaseServerClient).
 */
export function createSupabaseCronClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
