import { type NextRequest, NextResponse } from 'next/server'
import { get } from '@vercel/blob'

// Streams images from the private Blob store to the public site. These are
// intentionally public marketing assets (hero, gallery, app), so this route is
// not auth-gated — it only ever serves blobs whose pathname is already
// referenced by published site content via the media library.
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const pathname = request.nextUrl.searchParams.get('pathname')
  if (!pathname) {
    return NextResponse.json({ error: 'Missing pathname' }, { status: 400 })
  }

  try {
    const result = await get(pathname, {
      access: 'private',
      ifNoneMatch: request.headers.get('if-none-match') ?? undefined,
    })

    if (!result) {
      return new NextResponse('Not found', { status: 404 })
    }

    // Pathnames are unique (random suffix on upload), so responses are immutable
    // and can be cached aggressively by the browser and the CDN.
    const cacheControl = 'public, max-age=31536000, immutable'

    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: { ETag: result.blob.etag, 'Cache-Control': cacheControl },
      })
    }

    return new NextResponse(result.stream, {
      headers: {
        'Content-Type': result.blob.contentType,
        ETag: result.blob.etag,
        'Cache-Control': cacheControl,
      },
    })
  } catch (err) {
    console.error('[media] serve failed:', err)
    return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 })
  }
}
