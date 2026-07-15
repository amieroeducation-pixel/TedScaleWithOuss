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
    .from('prospect_document_sends')
    .insert({ prospect_id, document_id, channel })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return apiError('Document déjà envoyé sur ce canal', 409)
    return apiError(error.message)
  }

  return apiSuccess(data, 201)
}

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { searchParams } = new URL(request.url)
  const prospectId = searchParams.get('prospect_id')
  if (!prospectId) return apiError('prospect_id requis', 400)

  const { data, error } = await supabase
    .from('prospect_document_sends')
    .select('*, nurturing_documents(id, title, format)')
    .eq('prospect_id', prospectId)
    .order('sent_at', { ascending: false })

  if (error) return apiError(error.message)
  return apiSuccess(data)
}
