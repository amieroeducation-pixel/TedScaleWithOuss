import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { data, error } = await supabase
    .from('nurturing_messages')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at')

  if (error) return apiError(error.message)
  return apiSuccess(data || [])
}
