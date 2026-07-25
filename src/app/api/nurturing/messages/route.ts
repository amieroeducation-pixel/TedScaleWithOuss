import { NextRequest } from 'next/server'
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

const VALID_CHANNELS = ['email', 'whatsapp', 'linkedin', 'telephone', 'sms'] as const

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const body = await request.json()
  const { title, channel, subject, body: messageBody, tip, tag, tags } = body

  if (!title || !title.trim()) return apiError('Titre requis', 400)
  if (!channel || !VALID_CHANNELS.includes(channel)) return apiError('Canal invalide', 400)
  if (!messageBody || !messageBody.trim()) return apiError('Corps du message requis', 400)

  const { data, error } = await supabase
    .from('nurturing_messages')
    .insert({
      user_id: user.id,
      title: title.trim(),
      channel,
      subject: subject || null,
      body: messageBody.trim(),
      tip: tip || null,
      tag: tag || null,
      tags: tags || [],
    })
    .select()
    .single()

  if (error) return apiError(error.message)
  return apiSuccess(data, 201)
}
