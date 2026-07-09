import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'
import { z } from 'zod'
import { triggerSequenceForStage } from '@/lib/sequences/trigger'

const moveSchema = z.object({
  prospect_id: z.string().uuid(),
  to_stage: z.enum(['a_contacter', 'rdv1', 'rdv2', 'rdv3', 'converti', 'perdu']),
  notes: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('Invalid JSON body', 400)
  }

  const parsed = moveSchema.safeParse(body)
  if (!parsed.success) {
    return apiError(parsed.error.issues.map((e) => e.message).join(', '), 400)
  }

  const { prospect_id, to_stage, notes } = parsed.data

  // Get current stage
  const { data: prospect } = await supabase
    .from('prospects')
    .select('pipeline_stage')
    .eq('id', prospect_id)
    .single()

  // Update prospect stage
  const { error: updateError } = await supabase
    .from('prospects')
    .update({ pipeline_stage: to_stage, updated_at: new Date().toISOString() })
    .eq('id', prospect_id)

  if (updateError) return apiError(updateError.message)

  // Log pipeline event
  const { error: eventError } = await supabase
    .from('pipeline_events')
    .insert({
      user_id: user.id,
      prospect_id,
      from_stage: prospect?.pipeline_stage || null,
      to_stage,
      notes: notes || null,
    })

  if (eventError) {
    console.error('Failed to log pipeline event:', eventError.message)
    // Non-blocking — stage was updated, just log warning
  }

  // SEQ-02 : déclencher séquence auto si un template auto_trigger existe pour ce stade
  // Non-bloquant : void + pas de await (Pitfall 6 RESEARCH)
  void triggerSequenceForStage({
    supabase,
    userId: user.id,
    prospectId: prospect_id,
    toStage: to_stage,
  })

  // Conversion auto : créer un client quand le prospect passe à 'converti'
  if (to_stage === 'converti') {
    void (async () => {
      try {
        // Vérifier qu'un client n'existe pas déjà
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id')
          .eq('prospect_id', prospect_id)
          .maybeSingle()

        if (existingClient) {
          console.log(`Client already exists for prospect ${prospect_id}`)
          return
        }

        // Récupérer les infos du prospect
        const { data: prospectData } = await supabase
          .from('prospects')
          .select('*')
          .eq('id', prospect_id)
          .single()

        if (!prospectData) {
          console.error(`Prospect ${prospect_id} not found`)
          return
        }

        // Créer le client
        const { error: clientError } = await supabase
          .from('clients')
          .insert({
            user_id: user.id,
            prospect_id: prospect_id,
            total_aum: prospectData.capital_amount_detected ?? 0,
            last_interaction_at: new Date().toISOString(),
            alert_threshold_days: 90,
            notes: `Converti depuis ${prospectData.source ?? 'inconnu'} — signal: ${prospectData.signal_type ?? 'N/A'}`,
          })

        if (clientError) {
          console.error('Failed to create client:', clientError.message)
        } else {
          console.log(`Client created for prospect ${prospect_id}`)

          // Mettre à jour le prospect
          await supabase
            .from('prospects')
            .update({
              temperature: 'hot',
              last_engagement_at: new Date().toISOString(),
            })
            .eq('id', prospect_id)
        }
      } catch (err) {
        console.error('Error in auto-conversion:', err)
      }
    })()
  }

  return apiSuccess({ prospect_id, to_stage })
}
