import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function DELETE(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const body = await request.json()
  const { prospect_id } = body

  if (!prospect_id) {
    return apiError('prospect_id requis', 400)
  }

  const { error: intError } = await supabase
    .from('interactions')
    .delete()
    .eq('prospect_id', prospect_id)
    .eq('user_id', user.id)

  if (intError) return apiError(intError.message)

  const { error } = await supabase
    .from('prospects')
    .delete()
    .eq('id', prospect_id)
    .eq('user_id', user.id)

  if (error) return apiError(error.message)
  return apiSuccess({ deleted: prospect_id })
}
