import { NextResponse } from 'next/server'
import { del } from '@vercel/blob'
import { requireCapability } from '@/lib/api-auth'
import { logAudit } from '@/lib/auth'
import {
  getMediaById,
  updateMedia,
  deactivateMedia,
  findMediaUsage,
  isBlobConfigured,
} from '@/lib/media'

export const runtime = 'nodejs'

/** PATCH /api/admin/media/:id — update metadata (alt text, caption, category, name). */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireCapability('cms:write')
  if ('response' in auth) return auth.response

  const { id } = await ctx.params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Neplatná požiadavka.' }, { status: 400 })
  }

  const str = (v: unknown): string | null | undefined =>
    v === undefined ? undefined : v === null ? null : String(v).slice(0, 1000)

  try {
    const updated = await updateMedia(id, {
      altText: str(body.altText),
      caption: str(body.caption),
      category: str(body.category),
      filename: str(body.filename),
    })
    if (!updated) return NextResponse.json({ error: 'Médium sa nenašlo.' }, { status: 404 })

    await logAudit({
      actorUserId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'media_update',
      details: { id },
    })
    return NextResponse.json({ item: updated })
  } catch (err) {
    console.error('[media] update failed:', err)
    return NextResponse.json({ error: 'Aktualizácia zlyhala.' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/media/:id — delete an asset.
 * Blocked when the image is still referenced anywhere in the CMS, unless the
 * caller explicitly passes ?force=true (UI confirms first).
 */
export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireCapability('cms:write')
  if ('response' in auth) return auth.response

  const { id } = await ctx.params
  const force = new URL(request.url).searchParams.get('force') === 'true'

  try {
    const asset = await getMediaById(id)
    if (!asset) return NextResponse.json({ error: 'Médium sa nenašlo.' }, { status: 404 })

    const usage = await findMediaUsage(asset.url)
    if (usage.length > 0 && !force) {
      return NextResponse.json(
        {
          error: 'Tento obrázok sa práve používa na webe. Najprv ho odstráňte z týchto sekcií.',
          usage,
          code: 'MEDIA_IN_USE',
        },
        { status: 409 },
      )
    }

    // Remove the binary from Blob first (best effort), then the metadata row.
    if (isBlobConfigured()) {
      try {
        await del(asset.url)
      } catch (err) {
        console.error('[media] blob delete failed (continuing):', err)
      }
    }
    await deactivateMedia(id)

    await logAudit({
      actorUserId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'media_delete',
      details: { id, forced: force, usage },
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[media] delete failed:', err)
    return NextResponse.json({ error: 'Mazanie zlyhalo.' }, { status: 500 })
  }
}
