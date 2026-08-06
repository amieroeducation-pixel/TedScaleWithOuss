import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function PATCH(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const body = await request.json()
  const { prospect_id, archived } = body

  if (!prospect_id || typeof archived !== 'boolean') {
    return apiError('prospect_id et archived (boolean) requis', 400)
  }

  const { error } = await supabase
    .from('prospects')
    .update({ nurturing_archived: archived })
    .eq('id', prospect_id)
    .eq('user_id', user.id)

  if (error) return apiError(error.message)
  return apiSuccess({ prospect_id, archived })
}
