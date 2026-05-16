import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let body: { script_id: string; metier: string }
  try { body = await request.json() } catch { return apiError('Corps invalide', 400) }

  const { data: script } = await supabase.from('call_scripts')
    .select('*').eq('id', body.script_id).eq('user_id', user.id).single()
  if (!script) return apiError('Script non trouvé', 404)

  const { data: objections } = await supabase.from('call_objections')
    .select('*').eq('user_id', user.id).eq('metier', body.metier).order('ordre')

  const { data: bilans } = await supabase.from('calling_session_contacts')
    .select('script_rating, objections_rencontrees, note')
    .eq('user_id', user.id)
    .not('script_rating', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50)

  const avgRating = bilans?.length
    ? (bilans.reduce((sum, b) => sum + (b.script_rating ?? 0), 0) / bilans.length).toFixed(1)
    : 'N/A'

  const notes = bilans?.filter(b => b.note).map(b => `- ${b.note}`).join('\n') ?? 'Aucune note'

  const prompt = `Tu es un expert en prospection téléphonique pour les CGP (Conseillers en Gestion de Patrimoine) en France.

Voici le script d'appel actuel pour le métier "${body.metier}" :
---
${script.contenu}
---

Note moyenne obtenue sur les derniers appels : ${avgRating}/5

Commentaires des bilans :
${notes}

Objections actuelles :
${objections?.map(o => `- "${o.question}" → "${o.reponse}"`).join('\n') ?? 'Aucune'}

Améliore ce script et ces réponses aux objections en t'appuyant sur les retours.
Retourne un JSON avec ce format exact :
{
  "script_ameliore": "texte du nouveau script",
  "objections_ameliorees": [
    { "question": "...", "reponse": "..." }
  ],
  "justification": "2-3 phrases expliquant les changements"
}`

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return apiError('Réponse IA invalide', 500)

  try {
    const result = JSON.parse(jsonMatch[0])
    return apiSuccess(result)
  } catch {
    return apiError('Parsing réponse IA échoué', 500)
  }
}
