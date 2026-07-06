import { NextRequest, NextResponse } from 'next/server'
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
  last_contact_at: z.string().datetime().optional(), // Support last_contact_at from Prospection TNS
})

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { searchParams } = new URL(request.url)
  const stage = searchParams.get('stage')
  const search = searchParams.get('search')
  const source = searchParams.get('source')
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

  if (source) {
    query = query.eq('source', source)
  }

  if (search) {
    query = query.ilike('full_name', `%${search}%`)
  }

  const { data, error } = await query

  if (error) return apiError(error.message)
  return apiSuccess(data)
}

function normalizePhoneFr(raw: string): string {
  const cleaned = raw.replace(/[^0-9+]/g, '')
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return '+33' + cleaned.slice(1)
  }
  if (cleaned.startsWith('+33') && cleaned.length === 12) {
    return cleaned
  }
  if (cleaned.startsWith('33') && cleaned.length === 11) {
    return '+' + cleaned
  }
  return cleaned
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

  const prospectData = parsed.data
  let phoneNormalized: string | null = null

  if (prospectData.phone && prospectData.phone.trim() !== '') {
    phoneNormalized = normalizePhoneFr(prospectData.phone)

    const { data: existing } = await supabase
      .from('prospects')
      .select('id, full_name, phone, pipeline_stage')
      .eq('user_id', user.id)
      .eq('phone', prospectData.phone)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { success: false, data: existing, error: 'Prospect déjà en base avec ce numéro' },
        { status: 409 }
      )
    }
  }

  const { data, error } = await supabase
    .from('prospects')
    .insert({ ...prospectData, user_id: user.id, phone_normalized: phoneNormalized })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { success: false, data: null, error: 'Prospect déjà en base (doublon téléphone)' },
        { status: 409 }
      )
    }
    return apiError(error.message)
  }
  return apiSuccess(data, 201)
}
