import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: interactions } = await supabase
    .from('interactions')
    .select('*, prospects(full_name, company, phone, city)')
    .eq('user_id', user.id)
    .in('type', ['rdv1', 'rdv2', 'rdv3'])
    .order('occurred_at', { ascending: false })
    .limit(500)

  const rows = (interactions ?? []).map((i: any) => ({
    'Date': new Date(i.occurred_at).toLocaleDateString('fr-FR'),
    'Heure': new Date(i.occurred_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    'Type': i.type.toUpperCase(),
    'Prospect': i.prospects?.full_name ?? '',
    'Entreprise': i.prospects?.company ?? '',
    'Téléphone': i.prospects?.phone ?? '',
    'Ville': i.prospects?.city ?? '',
    'Honoré': i.is_honored ? 'Oui' : 'Non',
    'Durée (min)': i.duration_min ?? '',
    'Notes': i.notes ?? '',
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, 'RDV')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="rdv_export_${new Date().toISOString().split('T')[0]}.xlsx"`,
    },
  })
}
