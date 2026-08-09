import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * GET /api/nurturing/drafts?prospect_id=xxx&channel=email
 * Récupérer le brouillon pour un contact + canal
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const prospect_id = searchParams.get('prospect_id')
    const channel = searchParams.get('channel')

    if (!prospect_id || !channel) {
      return NextResponse.json({ error: 'prospect_id et channel requis' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('message_drafts')
      .select('*')
      .eq('user_id', user.id)
      .eq('prospect_id', prospect_id)
      .eq('channel', channel)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found, c'est normal si pas de brouillon
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || null })
  } catch (error: any) {
    console.error('Erreur GET /api/nurturing/drafts:', error)
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * POST /api/nurturing/drafts
 * Sauvegarder (upsert) un brouillon
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await req.json()
    const { prospect_id, channel, message_text, message_subject, document_id } = body

    if (!prospect_id || !channel) {
      return NextResponse.json({ error: 'prospect_id et channel requis' }, { status: 400 })
    }

    // Upsert (INSERT ... ON CONFLICT DO UPDATE)
    const { data, error } = await supabase
      .from('message_drafts')
      .upsert(
        {
          user_id: user.id,
          prospect_id,
          channel,
          message_text: message_text || '',
          message_subject: message_subject || null,
          document_id: document_id || null,
        },
        {
          onConflict: 'user_id,prospect_id,channel',
        }
      )
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Erreur POST /api/nurturing/drafts:', error)
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * DELETE /api/nurturing/drafts?prospect_id=xxx&channel=email
 * Supprimer un brouillon après envoi
 */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const prospect_id = searchParams.get('prospect_id')
    const channel = searchParams.get('channel')

    if (!prospect_id || !channel) {
      return NextResponse.json({ error: 'prospect_id et channel requis' }, { status: 400 })
    }

    const { error } = await supabase
      .from('message_drafts')
      .delete()
      .eq('user_id', user.id)
      .eq('prospect_id', prospect_id)
      .eq('channel', channel)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erreur DELETE /api/nurturing/drafts:', error)
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 })
  }
}
