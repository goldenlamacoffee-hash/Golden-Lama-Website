import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { requireCapability } from '@/lib/api-auth'
import { logAudit } from '@/lib/auth'
import {
  listMedia,
  insertMedia,
  validateUpload,
  safeBlobPathname,
  isBlobConfigured,
} from '@/lib/media'

// Uploads use the Node runtime (Blob SDK + pg).
export const runtime = 'nodejs'

/** GET /api/admin/media — list media (optional ?search= & ?category=). */
export async function GET(request: Request) {
  const auth = await requireCapability('cms:write')
  if ('response' in auth) return auth.response

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')?.trim() || undefined
  const category = searchParams.get('category')?.trim() || undefined

  try {
    const items = await listMedia({ search, category })
    return NextResponse.json({ items })
  } catch (err) {
    console.error('[media] list failed:', err)
    return NextResponse.json({ error: 'Nepodarilo sa načítať knižnicu médií.' }, { status: 500 })
  }
}

/** POST /api/admin/media — upload an image to Blob and store its metadata. */
export async function POST(request: Request) {
  const auth = await requireCapability('cms:write')
  if ('response' in auth) return auth.response

  if (!isBlobConfigured()) {
    return NextResponse.json(
      {
        error:
          'Úložisko obrázkov nie je nastavené. Pridajte premennú prostredia BLOB_READ_WRITE_TOKEN (integrácia Vercel Blob).',
        code: 'BLOB_NOT_CONFIGURED',
      },
      { status: 503 },
    )
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Neplatná požiadavka.' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Chýba súbor.' }, { status: 400 })
  }

  const validation = validateUpload({ type: file.type, size: file.size, name: file.name })
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  const altText = (formData.get('altText') as string | null)?.trim() || null
  const caption = (formData.get('caption') as string | null)?.trim() || null
  const category = (formData.get('category') as string | null)?.trim() || null

  try {
    const pathname = safeBlobPathname(file.name)
    // The connected Blob store is private, so uploads use private access and a
    // random suffix (keeps pathnames unique => immutable, cacheable delivery).
    const blob = await put(pathname, file, {
      access: 'private',
      contentType: file.type,
      addRandomSuffix: true,
    })

    // Private blobs are served to the public site through our own delivery
    // route (the raw blob.url is not publicly accessible).
    const deliveryUrl = `/api/media/file?pathname=${encodeURIComponent(blob.pathname)}`

    const asset = await insertMedia({
      url: deliveryUrl,
      pathname: blob.pathname,
      filename: pathname.split('/').pop() ?? null,
      originalFilename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      altText,
      caption,
      category,
      createdBy: auth.user.id,
    })

    await logAudit({
      actorUserId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'media_upload',
      details: { id: asset.id, pathname: asset.pathname },
    })

    return NextResponse.json({ item: asset }, { status: 201 })
  } catch (err) {
    console.error('[media] upload failed:', err)
    return NextResponse.json({ error: 'Nahrávanie zlyhalo.' }, { status: 500 })
  }
}
