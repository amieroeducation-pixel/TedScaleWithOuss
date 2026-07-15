import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { searchParams } = new URL(request.url)
  const channel = searchParams.get('channel')

  let query = supabase
    .from('nurturing_messages')
    .select('*')
    .order('created_at', { ascending: false })

  if (channel) {
    query = query.eq('channel', channel)
  }

  const { data, error } = await query
  if (error) return apiError(error.message)
  return apiSuccess(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const body = await request.json()
  const { title, channel, subject, body: msgBody, tags } = body

  if (!title || !channel || !msgBody) {
    return apiError('Titre, canal et corps du message requis', 400)
  }

  const { data, error } = await supabase
    .from('nurturing_messages')
    .insert({
      user_id: user.id,
      title,
      channel,
      subject: subject || null,
      body: msgBody,
      tags: tags || [],
    })
    .select()
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
    .from('nurturing_messages')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
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
    .from('nurturing_messages')
    .delete()
    .eq('id', id)

  if (error) return apiError(error.message)
  return apiSuccess({ deleted: true })
}
