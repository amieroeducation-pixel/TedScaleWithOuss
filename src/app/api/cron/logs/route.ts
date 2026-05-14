import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function GET(_req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { data, error } = await supabase
    .from('cron_logs')
    .select('id, job_name, status, details, executed_at')
    .eq('user_id', user.id)
    .order('executed_at', { ascending: false })
    .limit(50)

  if (error) return apiError(error.message)

  return apiSuccess(data ?? [])
}
