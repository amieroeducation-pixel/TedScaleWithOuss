import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

// Stage labels (depuis l'enum pipeline_stage)
const STAGE_LABELS: Record<string, string> = {
  a_contacter: 'A contacter',
  rdv1: 'RDV 1',
  rdv2: 'RDV 2',
  rdv3: 'RDV 3',
  converti: 'Converti',
  perdu: 'Perdu',
}

// Ordre canonique du pipeline
const STAGE_ORDER = ['a_contacter', 'rdv1', 'rdv2', 'rdv3', 'converti', 'perdu']

export type PipelineStageRow = {
  stage: string
  label: string
  total: number
  conversion_rate_pct: number
}

export async function GET(_request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  // DATA-08 : requête sur la vue v_pipeline_conversion
  // Filtre user_id explicite même sur la vue (T-01D-02 : vue sans RLS garantie)
  const { data, error } = await supabase
    .from('v_pipeline_conversion')
    .select('pipeline_stage, total, conversion_rate_pct')
    .eq('user_id', user.id)

  if (error) return apiError(error.message)

  // Mapper les lignes reçues
  const rows: PipelineStageRow[] = (data ?? []).map(r => ({
    stage: r.pipeline_stage,
    label: STAGE_LABELS[r.pipeline_stage] ?? r.pipeline_stage,
    total: Number(r.total) || 0,
    conversion_rate_pct: Number(r.conversion_rate_pct) || 0,
  }))

  // Compléter les stades manquants (vue peut ne pas retourner un stade si total = 0)
  const present = new Set(rows.map(r => r.stage))
  for (const stage of STAGE_ORDER) {
    if (!present.has(stage)) {
      rows.push({
        stage,
        label: STAGE_LABELS[stage] ?? stage,
        total: 0,
        conversion_rate_pct: 0,
      })
    }
  }

  // Trier selon l'ordre canonique du pipeline
  rows.sort((a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage))

  // Calculs supplémentaires
  const totalProspects = rows.reduce((s, r) => s + r.total, 0)
  const convertedCount = rows.find(r => r.stage === 'converti')?.total ?? 0
  const lostCount = rows.find(r => r.stage === 'perdu')?.total ?? 0

  return apiSuccess({ stages: rows, totalProspects, convertedCount, lostCount })
}
