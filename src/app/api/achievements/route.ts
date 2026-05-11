import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiUnauthorized } from '@/lib/api'

export async function GET(_request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { data: achievements, error } = await supabase
    .from('achievements')
    .select('*')
    .eq('user_id', user.id)
    .order('achieved_at', { ascending: false })

  if (error) {
    // Table peut ne pas exister si migration pas encore appliquée
    return apiSuccess({ achievements: [] })
  }

  return apiSuccess({ achievements: achievements ?? [] })
}
