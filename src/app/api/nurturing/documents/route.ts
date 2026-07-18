import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { searchParams } = new URL(request.url)
  const prospectId = searchParams.get('prospect_id')

  const { data: docs, error } = await supabase
    .from('nurturing_documents')
    .select('*, nurturing_themes(id, name, color, icon)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return apiError(error.message)

  if (prospectId) {
    const { data: sends } = await supabase
      .from('nurturing_document_sends')
      .select('document_id, channel')
      .eq('prospect_id', prospectId)
      .eq('user_id', user.id)

    const enriched = (docs || []).map(doc => {
      const docSends = (sends || []).filter(s => s.document_id === doc.id)
      return {
        ...doc,
        already_sent: docSends.length > 0,
        sent_channels: docSends.map(s => s.channel),
      }
    })
    return apiSuccess(enriched)
  }

  return apiSuccess(docs || [])
}
