import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'
import { z } from 'zod'

const prospectItemSchema = z.object({
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

const batchSchema = z.object({
  prospects: z.array(prospectItemSchema).min(1).max(500),
})

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
    return apiError('Corps invalide', 400)
  }

  const parsed = batchSchema.safeParse(body)
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, 400)
  }

  const { prospects } = parsed.data

  const phones = prospects
    .map(p => p.phone?.trim())
    .filter((p): p is string => !!p)
    .map(normalizePhoneFr)

  const { data: existingByPhone } = phones.length > 0
    ? await supabase
        .from('prospects')
        .select('phone')
        .eq('user_id', user.id)
        .in('phone', phones)
    : { data: [] }

  const existingPhones = new Set((existingByPhone || []).map(e => e.phone))

  const toInsert = prospects
    .filter(p => {
      if (!p.phone?.trim()) return true
      return !existingPhones.has(normalizePhoneFr(p.phone))
    })
    .map(p => ({
      ...p,
      user_id: user.id,
      phone: p.phone?.trim() ? normalizePhoneFr(p.phone) : null,
      phone_normalized: p.phone?.trim() ? normalizePhoneFr(p.phone) : null,
    }))

  if (toInsert.length === 0) {
    return apiSuccess({ inserted: 0, skipped: prospects.length, data: [] })
  }

  const { data, error } = await supabase
    .from('prospects')
    .insert(toInsert)
    .select()

  if (error) return apiError(error.message, 500)

  return apiSuccess({
    inserted: data?.length ?? 0,
    skipped: prospects.length - (data?.length ?? 0),
    data,
  }, 201)
}
