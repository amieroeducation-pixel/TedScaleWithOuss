import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { searchParams } = new URL(request.url)
  const prospectId = searchParams.get('prospect_id')
  if (!prospectId) return apiError('prospect_id requis', 400)

  const { data, error } = await supabase
    .from('interactions')
    .select('*')
    .eq('user_id', user.id)
    .eq('prospect_id', prospectId)
    .order('occurred_at', { ascending: false })

  if (error) return apiError(error.message)
  return apiSuccess(data || [])
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const body = await request.json()
  const { prospect_id, type, notes } = body

  if (!prospect_id || !type) return apiError('prospect_id et type requis', 400)

  const { data, error } = await supabase
    .from('interactions')
    .insert({
      user_id: user.id,
      prospect_id,
      type,
      notes: notes || null,
      occurred_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return apiError(error.message)

  await supabase
    .from('prospects')
    .update({ last_contact_at: new Date().toISOString() })
    .eq('id', prospect_id)
    .eq('user_id', user.id)

  return apiSuccess(data, 201)
}
