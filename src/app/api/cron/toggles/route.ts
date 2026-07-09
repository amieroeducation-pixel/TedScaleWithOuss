import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { data } = await supabase
    .from('user_settings')
    .select('message_templates')
    .eq('id', user.id)
    .single()

  const templates = (data?.message_templates as Record<string, unknown>) ?? {}
  return apiSuccess((templates._cron_toggles as Record<string, boolean>) ?? {})
}

export async function PATCH(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let body: { job_name: string; active: boolean }
  try { body = await request.json() } catch { return apiError('Corps invalide', 400) }

  const { job_name, active } = body
  if (!job_name) return apiError('job_name requis', 400)

  const { data: settings } = await supabase
    .from('user_settings')
    .select('message_templates')
    .eq('id', user.id)
    .single()

  const templates = (settings?.message_templates as Record<string, unknown>) ?? {}
  const currentToggles = (templates._cron_toggles as Record<string, boolean>) ?? {}
  const updatedToggles = { ...currentToggles, [job_name]: active }
  const updatedTemplates = { ...templates, _cron_toggles: updatedToggles }

  const { error } = await supabase
    .from('user_settings')
    .update({ message_templates: updatedTemplates })
    .eq('id', user.id)

  if (error) return apiError(error.message)
  return apiSuccess(updatedToggles)
}
