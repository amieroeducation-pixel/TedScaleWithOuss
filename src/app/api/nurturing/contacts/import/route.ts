import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'
import { z } from 'zod'
import { isValidPhoneFr, normalizePhoneFr } from '@/lib/phone'

// Simple email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const ContactImportSchema = z.object({
  full_name: z.string().min(1, 'Nom requis'),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  profession: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  linkedin_url: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  nurturing_category: z.enum(['prospect_froid', 'prospect_tiede', 'rdv_fait', 'client_existant']).optional(),
  source: z.string().optional().nullable(),
})

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const body = await request.json()
  const { contacts } = body

  if (!Array.isArray(contacts) || contacts.length === 0) {
    return apiError('Tableau contacts requis', 400)
  }

  const results = {
    total: contacts.length,
    imported: 0,
    skipped: 0,
    errors: [] as Array<{ row: number; error: string; data: any }>,
  }

  for (let i = 0; i < contacts.length; i++) {
    const row = contacts[i]

    try {
      // Validation Zod
      const parsed = ContactImportSchema.parse(row)

      // Validation email
      if (parsed.email && !emailRegex.test(parsed.email)) {
        results.errors.push({ row: i + 1, error: 'Email invalide', data: row })
        results.skipped++
        continue
      }

      // Validation téléphone français
      if (parsed.phone) {
        if (!isValidPhoneFr(parsed.phone)) {
          results.errors.push({ row: i + 1, error: 'Téléphone français invalide', data: row })
          results.skipped++
          continue
        }
        parsed.phone = normalizePhoneFr(parsed.phone)
      }

      // Vérifier doublons (email ou téléphone)
      if (parsed.email || parsed.phone) {
        const { data: existing } = await supabase
          .from('prospects')
          .select('id')
          .eq('user_id', user.id)
          .or(
            parsed.email && parsed.phone
              ? `email.eq.${parsed.email},phone.eq.${parsed.phone}`
              : parsed.email
              ? `email.eq.${parsed.email}`
              : `phone.eq.${parsed.phone}`
          )
          .limit(1)

        if (existing && existing.length > 0) {
          results.errors.push({ row: i + 1, error: 'Contact déjà existant (email ou téléphone)', data: row })
          results.skipped++
          continue
        }
      }

      // Insertion
      const { error } = await supabase
        .from('prospects')
        .insert({
          user_id: user.id,
          full_name: parsed.full_name,
          email: parsed.email || null,
          phone: parsed.phone || null,
          profession: parsed.profession || null,
          company: parsed.company || null,
          city: parsed.city || null,
          linkedin_url: parsed.linkedin_url || null,
          notes: parsed.notes || null,
          pipeline_stage: 'a_contacter',
          nurturing_category: parsed.nurturing_category || 'prospect_froid',
          source: parsed.source || 'import_csv',
          preferred_channel: 'email',
          contact_frequency_days: 14,
          next_action_date: new Date().toISOString().split('T')[0],
          next_action_channel: 'email',
        })

      if (error) {
        results.errors.push({ row: i + 1, error: error.message, data: row })
        results.skipped++
      } else {
        results.imported++
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        results.errors.push({ row: i + 1, error: error.issues[0].message, data: row })
      } else {
        results.errors.push({ row: i + 1, error: error.message || 'Erreur inconnue', data: row })
      }
      results.skipped++
    }
  }

  return apiSuccess(results)
}
