import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const body = await request.json()
  const { prospect_id, document_id, channel } = body

  if (!prospect_id || !document_id || !channel) {
    return apiError('prospect_id, document_id et channel requis', 400)
  }

  const { data, error } = await supabase
    .from('nurturing_document_sends')
    .insert({
      user_id: user.id,
      prospect_id,
      document_id,
      channel,
    })
    .select()
    .single()

  if (error) return apiError(error.message)
  return apiSuccess(data, 201)
}
