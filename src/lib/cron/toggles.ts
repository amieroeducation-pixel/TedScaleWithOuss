import { createSupabaseCronClient } from '@/lib/supabase/cron-client'

export async function isCronEnabled(jobName: string): Promise<boolean> {
  const supabase = createSupabaseCronClient()
  const { data: users } = await supabase.from('user_settings').select('message_templates').limit(1)
  if (!users || users.length === 0) return true
  const templates = (users[0].message_templates as Record<string, unknown>) ?? {}
  const toggles = (templates._cron_toggles as Record<string, boolean>) ?? {}
  return toggles[jobName] !== false
}
