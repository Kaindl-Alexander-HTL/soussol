import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getAdminUser } from '@/lib/admin'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createArchiveSignedUrl } from '@/lib/archive-media'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

export async function POST(request: NextRequest) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData().catch(() => null)
  const file = formData?.get('file')

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: 'Keine Datei gefunden.' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Nur JPG, PNG, WebP und GIF erlaubt.' }, { status: 400 })
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'Datei zu groß (max. 10 MB).' }, { status: 400 })
  }

  const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
  const filename = `${randomUUID()}.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await supabaseAdmin.storage
    .from('mementos')
    .upload(filename, buffer, { contentType: file.type, upsert: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const signedUrl = await createArchiveSignedUrl(filename)
  if (!signedUrl) {
    await supabaseAdmin.storage.from('mementos').remove([filename])
    return NextResponse.json({ error: 'Upload konnte nicht sicher bereitgestellt werden.' }, { status: 500 })
  }

  return NextResponse.json({ path: filename, url: signedUrl })
}
