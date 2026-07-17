import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const title = formData.get('title') as string | null
  const themeId = formData.get('theme_id') as string | null
  const format = formData.get('format') as string || 'pdf'
  const channelsRaw = formData.get('channels_compatible') as string || 'email,courrier'
  const tagsRaw = formData.get('tags') as string || ''

  if (!file || !title) {
    return apiError('Fichier et titre requis', 400)
  }

  const ext = file.name.split('.').pop() || 'pdf'
  const fileName = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

  const { error: uploadError } = await supabase.storage
    .from('nurturing-docs')
    .upload(fileName, file, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    return apiError(`Upload échoué: ${uploadError.message}`)
  }

  const { data: { publicUrl } } = supabase.storage
    .from('nurturing-docs')
    .getPublicUrl(fileName)

  const channels = channelsRaw.split(',').map(c => c.trim()).filter(Boolean)
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : []

  const { data, error } = await supabase
    .from('nurturing_documents')
    .insert({
      user_id: user.id,
      title,
      theme_id: themeId || null,
      format: ext === 'pdf' ? 'pdf' : ext.match(/^(png|jpg|jpeg|gif|webp)$/) ? 'image' : format,
      url: publicUrl,
      channels_compatible: channels,
      tags,
    })
    .select('*, nurturing_themes(id, name, color, icon)')
    .single()

  if (error) return apiError(error.message)
  return apiSuccess(data, 201)
}
