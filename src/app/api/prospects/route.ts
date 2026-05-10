import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'
import { z } from 'zod'

const createProspectSchema = z.object({
  full_name: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  profession: z.string().optional(),
  company: z.string().optional(),
  city: z.string().optional(),
  department: z.string().optional(),
  source: z.enum(['tns', 'chefs_entreprise', 'particuliers', 'recommandation', 'linkedin', 'autre']).default('autre'),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { searchParams } = new URL(request.url)
  const stage = searchParams.get('stage')
  const search = searchParams.get('search')
  const limit = parseInt(searchParams.get('limit') || '200')
  const offset = parseInt(searchParams.get('offset') || '0')

  let query = supabase
    .from('prospects')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(limit)
    .range(offset, offset + limit - 1)

  if (stage && stage !== 'all') {
    query = query.eq('pipeline_stage', stage)
  }

  if (search) {
    query = query.ilike('full_name', `%${search}%`)
  }

  const { data, error } = await query

  if (error) return apiError(error.message)
  return apiSuccess(data)
}

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

  const parsed = createProspectSchema.safeParse(body)
  if (!parsed.success) {
    return apiError(parsed.error.issues.map((e) => e.message).join(', '), 400)
  }

  const { data, error } = await supabase
    .from('prospects')
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single()

  if (error) return apiError(error.message)
  return apiSuccess(data, 201)
}
