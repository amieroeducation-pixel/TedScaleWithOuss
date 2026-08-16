import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const url = new URL(req.url)
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = 50
  const offset = (page - 1) * limit
  const channelFilter = url.searchParams.get('channel')

  let query = supabase
    .from('sequence_execution_logs')
    .select(`
      id, sent_at, channel, status, http_status_code, error_message,
      message_sent, retry_count,
      prospects!inner (id, full_name)
    `, { count: 'exact' })
    .eq('user_id', user.id)
    .order('sent_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (channelFilter) {
    query = query.eq('channel', channelFilter)
  }

  const { data: logs, error, count } = await query

  if (error) return apiError(error.message)

  return apiSuccess({
    logs: logs?.map(l => ({
      id: l.id,
      sentAt: l.sent_at,
      channel: l.channel,
      status: l.status,
      httpCode: l.http_status_code,
      error: l.error_message,
      retryCount: l.retry_count,
      prospectName: (l.prospects as any).full_name,
    })) || [],
    total: count || 0,
    page,
    perPage: limit,
  })
}
