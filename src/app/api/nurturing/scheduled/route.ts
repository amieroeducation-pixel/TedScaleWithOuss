import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { data, error } = await supabase
    .from('scheduled_messages')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .order('scheduled_at', { ascending: true })

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
    .from('scheduled_messages')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return apiError(error.message)
  return apiSuccess({ cancelled: true })
}
