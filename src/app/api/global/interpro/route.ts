import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function GET(_request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { count, error } = await supabase
    .from('partners')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_active', true)

  if (error) return apiError(error.message, 500)

  const { data: lastInteraction } = await supabase
    .from('interactions')
    .select('occurred_at')
    .eq('user_id', user.id)
    .eq('type', 'interpro')
    .order('occurred_at', { ascending: false })
    .limit(1)
    .single()

  let lastContact: string | null = null
  if (lastInteraction?.occurred_at) {
    const d = new Date(lastInteraction.occurred_at)
    const now = new Date()
    const diffH = Math.round((now.getTime() - d.getTime()) / 3600000)
    if (diffH < 24) lastContact = `Il y a ${diffH}h`
    else lastContact = `Il y a ${Math.round(diffH / 24)}j`
  }

  return apiSuccess({ count: count ?? 0, lastContact })
}
