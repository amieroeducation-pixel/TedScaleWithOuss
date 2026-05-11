import { createSupabaseCronClient } from '@/lib/supabase/cron-client'

export type CronStatus = 'success' | 'error' | 'skipped'

/**
 * Insere une ligne dans cron_logs.
 * Ne throw jamais -- les erreurs de logging ne doivent pas faire echouer la route principale.
 */
export async function logCronRun(args: {
  userId: string
  jobName: string
  status: CronStatus
  details?: Record<string, unknown>
}): Promise<void> {
  try {
    const supabase = createSupabaseCronClient()
    await supabase.from('cron_logs').insert({
      user_id: args.userId,
      job_name: args.jobName,
      status: args.status,
      details: args.details ?? {},
    })
  } catch (e) {
    // Le log ne doit jamais faire echouer la route principale
    console.error('[logCronRun] Echec insert cron_logs:', e)
  }
}
