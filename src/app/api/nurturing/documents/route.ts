import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { searchParams } = new URL(request.url)
  const themeId = searchParams.get('theme_id')
  const prospectId = searchParams.get('prospect_id')

  let query = supabase
    .from('nurturing_documents')
    .select('*, nurturing_themes(id, name, color, icon)')
    .order('created_at', { ascending: false })

  if (themeId) {
    query = query.eq('theme_id', themeId)
  }

  const { data: docs, error } = await query
  if (error) return apiError(error.message)

  if (prospectId && docs) {
    const { data: sends } = await supabase
      .from('prospect_document_sends')
      .select('document_id, channel')
      .eq('prospect_id', prospectId)

    const sendMap: Record<string, string[]> = {}
    for (const s of sends || []) {
      if (!sendMap[s.document_id]) sendMap[s.document_id] = []
      sendMap[s.document_id].push(s.channel)
    }

    const enriched = docs.map(d => ({
      ...d,
      already_sent: !!sendMap[d.id],
      sent_channels: sendMap[d.id] || [],
    }))

    return apiSuccess(enriched)
  }

  return apiSuccess(docs)
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const body = await request.json()
  const { title, theme_id, format, url, channels_compatible, tags } = body

  if (!title) return apiError('Le titre est requis', 400)

  const { data, error } = await supabase
    .from('nurturing_documents')
    .insert({
      user_id: user.id,
      title,
      theme_id: theme_id || null,
      format: format || 'pdf',
      url: url || null,
      channels_compatible: channels_compatible || ['email', 'courrier'],
      tags: tags || [],
    })
    .select('*, nurturing_themes(id, name, color, icon)')
    .single()

  if (error) return apiError(error.message)
  return apiSuccess(data, 201)
}

export async function PATCH(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const body = await request.json()
  const { id, ...updates } = body
  if (!id) return apiError('ID requis', 400)

  const { data, error } = await supabase
    .from('nurturing_documents')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, nurturing_themes(id, name, color, icon)')
    .single()

  if (error) return apiError(error.message)
  return apiSuccess(data)
}

export async function DELETE(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return apiError('ID requis', 400)

  const { error } = await supabase
    .from('nurturing_documents')
    .delete()
    .eq('id', id)

  if (error) return apiError(error.message)
  return apiSuccess({ deleted: true })
}
