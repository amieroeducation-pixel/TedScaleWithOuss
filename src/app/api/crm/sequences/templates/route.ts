import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function GET(_req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { data: templates, error } = await supabase
    .from('sequence_templates')
    .select('id, name, pipeline_stage, auto_trigger')
    .eq('user_id', user.id)
    .order('name', { ascending: true })

  if (error) return apiError(error.message)
  return apiSuccess({ templates: templates ?? [] })
}
