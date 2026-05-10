// supabase/functions/process-sequences/index.ts
// Supabase Edge Function — Deno runtime
// Cron quotidien : exécute les étapes J+X dues

const NEXT_APP_URL = Deno.env.get('NEXT_APP_URL') ?? 'http://localhost:3000'
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? ''

// Deno.cron : disponible avec supabase functions serve (v1.103+)
// Si Deno.cron n'est pas disponible, cette Edge Function peut être invoquée manuellement
// via `supabase functions invoke process-sequences`
try {
  Deno.cron('process-sequences-daily', '0 7 * * *', async () => {
    console.log('[process-sequences] Démarrage cron quotidien 7h UTC')
    try {
      const res = await fetch(`${NEXT_APP_URL}/api/crm/sequences/process`, {
        method: 'GET',
        headers: {
          'x-cron-secret': CRON_SECRET,
          'Cookie': ``, // Le cookie session ne sera pas disponible ici
          // NOTE: Cette route nécessitera un mécanisme d'auth alternative pour le cron
          // Pour Phase 2 MVP : appel GET manuel depuis le navigateur (utilisateur authentifié)
          // Pour Phase 5 : remplacer par un appel service_role Supabase direct
        },
      })
      const json = await res.json()
      console.log('[process-sequences] Résultat:', json)
    } catch (e) {
      console.error('[process-sequences] Erreur:', e)
    }
  })
} catch (_e) {
  // Deno.cron non disponible (ancienne version Deno) — fallback : appel manuel
  console.warn('[process-sequences] Deno.cron non disponible — utiliser appel manuel /api/crm/sequences/process depuis le navigateur')
}

// Handler HTTP pour invocation manuelle : supabase functions invoke process-sequences
Deno.serve(async (req) => {
  const secret = req.headers.get('x-cron-secret')
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }
  return new Response(JSON.stringify({ status: 'trigger received — check cron logs' }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
