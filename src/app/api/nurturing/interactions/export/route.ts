import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiUnauthorized } from '@/lib/api'

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { searchParams } = new URL(request.url)
  const prospectId = searchParams.get('prospect_id')
  const format = searchParams.get('format') || 'csv'
  const types = searchParams.get('types') // comma-separated
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')

  if (!prospectId) {
    return new NextResponse('prospect_id requis', { status: 400 })
  }

  // Build query
  let query = supabase
    .from('interactions')
    .select('*')
    .eq('user_id', user.id)
    .eq('prospect_id', prospectId)
    .order('occurred_at', { ascending: false })

  // Apply filters
  if (types) {
    const typeArray = types.split(',')
    query = query.in('type', typeArray)
  }

  if (startDate) {
    query = query.gte('occurred_at', startDate)
  }

  if (endDate) {
    // Add end of day
    const endDateTime = new Date(endDate)
    endDateTime.setHours(23, 59, 59, 999)
    query = query.lte('occurred_at', endDateTime.toISOString())
  }

  const { data, error } = await query

  if (error) {
    return new NextResponse(`Erreur: ${error.message}`, { status: 500 })
  }

  const interactions = data || []

  if (format === 'csv') {
    // UTF-8 BOM for Excel
    const BOM = '﻿'
    const headers = ['Date', 'Type', 'Canal', 'Note', 'Statut']
    const rows = interactions.map(i => {
      const date = new Date(i.occurred_at).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
      const type = i.type || 'N/A'
      const canal = i.type || 'N/A'
      const note = (i.notes || '').replace(/"/g, '""') // Escape quotes for CSV
      const statut = i.is_honored ? 'Répondu' : 'En attente'
      return `"${date}","${type}","${canal}","${note}","${statut}"`
    })

    const csv = BOM + headers.join(',') + '\n' + rows.join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="historique-interactions-${prospectId}-${Date.now()}.csv"`,
      },
    })
  }

  return new NextResponse('Format non supporté', { status: 400 })
}
