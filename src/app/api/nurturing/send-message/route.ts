import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { sendBrevoEmail, sendBrevoSms } from '@/lib/sequences/brevo'
import { interpolateTemplate } from '@/lib/nurturing/template-engine'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await req.json()
    const {
      prospect_id,
      channel,
      message,
      subject,
      document_url,
    } = body

    if (!prospect_id || !channel || !message) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
    }

    // Récupérer les infos du prospect
    const { data: prospect, error: prospectErr } = await supabase
      .from('prospects')
      .select('id, full_name, email, phone, phone_normalized, profession, city')
      .eq('id', prospect_id)
      .single()

    if (prospectErr || !prospect) {
      return NextResponse.json({ error: 'Prospect introuvable' }, { status: 404 })
    }

    // Interpoler le template avec les données du contact
    const interpolated = interpolateTemplate(message, {
      full_name: prospect.full_name,
      email: prospect.email,
      phone: prospect.phone,
      profession: prospect.profession,
      city: prospect.city,
    })

    let sendResult: { success: boolean; error?: string } = { success: false }
    let interactionNotes = ''

    // Envoi selon le canal
    if (channel === 'email') {
      if (!prospect.email) {
        return NextResponse.json({ error: 'Email du prospect absent' }, { status: 400 })
      }
      const subjectLine = subject || `Suivi — ${prospect.full_name}`
      const htmlContent = interpolated.replace(/\n/g, '<br>') + (document_url ? `<br><br>📎 <a href="${document_url}">Document joint</a>` : '')

      sendResult = await sendBrevoEmail({
        to: prospect.email,
        toName: prospect.full_name,
        subject: subjectLine,
        htmlContent,
      })
      interactionNotes = `[Nurturing] Email envoyé : ${subjectLine}`
    } else if (channel === 'sms') {
      const phone = prospect.phone_normalized || prospect.phone
      if (!phone) {
        return NextResponse.json({ error: 'Téléphone du prospect absent' }, { status: 400 })
      }
      sendResult = await sendBrevoSms({
        to: phone,
        content: interpolated.slice(0, 160),
      })
      interactionNotes = `[Nurturing] SMS envoyé : ${interpolated.slice(0, 80)}...`
    } else {
      return NextResponse.json({ error: `Canal ${channel} non supporté pour envoi automatique` }, { status: 400 })
    }

    if (!sendResult.success) {
      return NextResponse.json({ error: sendResult.error || 'Erreur envoi' }, { status: 500 })
    }

    // Enregistrer l'interaction
    const { error: interactionErr } = await supabase.from('interactions').insert({
      user_id: user.id,
      prospect_id: prospect.id,
      type: channel === 'sms' ? 'sms' : 'email',
      notes: interactionNotes,
      is_honored: true,
      occurred_at: new Date().toISOString(),
    })

    if (interactionErr) {
      console.error('Erreur insertion interaction:', interactionErr)
    }

    // Enregistrer l'envoi de document si présent
    if (document_url) {
      await supabase.from('document_sends').insert({
        user_id: user.id,
        prospect_id: prospect.id,
        document_url,
        channel,
        sent_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({ success: true, messageSent: interpolated })
  } catch (error: any) {
    console.error('Erreur /api/nurturing/send-message:', error)
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 })
  }
}
