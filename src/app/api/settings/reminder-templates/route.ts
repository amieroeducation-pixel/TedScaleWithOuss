import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError } from '@/lib/api'

const DEFAULT_TEMPLATES = {
  '24h': "Bonjour {{nom}}, rappel de votre RDV demain à {{heure}}. À bientôt !",
  '1h': "Bonjour {{nom}}, votre RDV est dans 1h ({{heure}}). Merci d'être ponctuel !"
}

type ReminderType = '24h' | '1h'

/**
 * GET /api/settings/reminder-templates
 * Récupère les templates de rappels SMS de l'utilisateur connecté
 */
export async function GET() {
  const supabase = await createSupabaseServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return apiError('Non authentifié', 401)
  }

  const { data: templates, error } = await supabase
    .from('reminder_templates')
    .select('template_type, content')
    .eq('user_id', user.id)

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found (OK)
    return apiError(`Erreur Supabase: ${error.message}`)
  }

  // Construire l'objet de retour avec les templates ou les valeurs par défaut
  const result: Record<ReminderType, string> = {
    '24h': DEFAULT_TEMPLATES['24h'],
    '1h': DEFAULT_TEMPLATES['1h']
  }

  if (templates && templates.length > 0) {
    templates.forEach((t: { template_type: ReminderType; content: string }) => {
      result[t.template_type] = t.content
    })
  }

  return apiSuccess(result)
}

/**
 * POST /api/settings/reminder-templates
 * Sauvegarde/met à jour les templates de rappels SMS
 */
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return apiError('Non authentifié', 401)
  }

  try {
    const body = await req.json()
    const template24h = body['24h']
    const template1h = body['1h']

    if (!template24h || !template1h) {
      return apiError('Templates manquants', 400)
    }

    // Validation basique des templates
    if (template24h.length > 500 || template1h.length > 500) {
      return apiError('Templates trop longs (max 500 caractères)', 400)
    }

    // Upsert des templates (insert ou update si existe déjà)
    const templates = [
      {
        user_id: user.id,
        template_type: '24h' as ReminderType,
        content: template24h
      },
      {
        user_id: user.id,
        template_type: '1h' as ReminderType,
        content: template1h
      }
    ]

    const { error } = await supabase
      .from('reminder_templates')
      .upsert(templates, {
        onConflict: 'user_id,template_type'
      })

    if (error) {
      return apiError(`Erreur Supabase: ${error.message}`)
    }

    return apiSuccess({ message: 'Templates sauvegardés' })

  } catch (e) {
    return apiError(e instanceof Error ? e.message : 'Erreur inconnue')
  }
}
