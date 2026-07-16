import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'
import { startOfWeek, endOfWeek, addDays, format } from 'date-fns'
import { fr } from 'date-fns/locale'

export type RelanceRow = {
  id: string
  full_name: string
  profession: string | null
  pipeline_stage: string | null
  next_action_date: string
  lead_score: number | null
  phone: string | null
  email: string | null
  days_until: number
  temperature: string | null
  next_action_channel: string | null
}

export type RdvRow = {
  id: string
  type: string
  occurred_at: string
  notes: string | null
  prospect_id: string
  prospect_name: string
  profession: string | null
  day_label: string
}

const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

export async function GET(_request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  const in7daysStr = format(addDays(today, 7), 'yyyy-MM-dd')
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }).toISOString()
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 }).toISOString()

  // DATA-06 — Relances J+7
  const { data: prospectData, error: pError } = await supabase
    .from('prospects')
    .select('id, full_name, profession, pipeline_stage, next_action_date, lead_score, phone, email, temperature, next_action_channel')
    .eq('user_id', user.id)
    .not('next_action_date', 'is', null)
    .gte('next_action_date', todayStr)
    .lte('next_action_date', in7daysStr)
    .order('next_action_date', { ascending: true })
    .order('lead_score', { ascending: false })

  if (pError) return apiError(pError.message)

  const todayMs = new Date(todayStr).getTime()
  const relances: RelanceRow[] = (prospectData ?? []).map(p => {
    const targetMs = new Date(p.next_action_date).getTime()
    const days_until = Math.max(0, Math.floor((targetMs - todayMs) / 86400000))
    return {
      id: p.id,
      full_name: p.full_name,
      profession: p.profession ?? null,
      pipeline_stage: p.pipeline_stage ?? null,
      next_action_date: p.next_action_date,
      lead_score: p.lead_score ?? null,
      phone: p.phone ?? null,
      email: p.email ?? null,
      days_until,
      temperature: p.temperature ?? null,
      next_action_channel: p.next_action_channel ?? null,
    }
  })

  // DATA-07 — RDV semaine (fallback interactions)
  const { data: interactionData, error: rError } = await supabase
    .from('interactions')
    .select('id, type, occurred_at, notes, prospect_id, prospects(full_name, profession)')
    .eq('user_id', user.id)
    .in('type', ['rdv1', 'rdv2', 'rdv3'])
    .gte('occurred_at', weekStart)
    .lte('occurred_at', weekEnd)
    .order('occurred_at', { ascending: true })

  if (rError) return apiError(rError.message)

  const rdvSemaine: RdvRow[] = (interactionData ?? []).map(r => {
    const rawProspect = r.prospects
    const prospect = Array.isArray(rawProspect) ? rawProspect[0] : rawProspect
    const occurredAt = new Date(r.occurred_at)
    const dayName = DAY_LABELS[occurredAt.getDay()]
    const dateStr = format(occurredAt, 'dd/MM', { locale: fr })
    const timeStr = format(occurredAt, 'HH:mm', { locale: fr })
    const day_label = `${dayName} ${dateStr} ${timeStr}`

    return {
      id: r.id,
      type: r.type,
      occurred_at: r.occurred_at,
      notes: r.notes ?? null,
      prospect_id: r.prospect_id,
      prospect_name: prospect?.full_name ?? 'Prospect inconnu',
      profession: prospect?.profession ?? null,
      day_label,
    }
  })

  return apiSuccess({
    relances,
    rdvSemaine,
    todayCount: relances.filter(r => r.days_until === 0).length,
    weekRdvCount: rdvSemaine.length,
  })
}
