import { pool } from './db'
import { getContent } from './data'
import { ALLOWED_MIME_TYPES, ALLOWED_EXTENSIONS, MAX_FILE_SIZE, type MediaAsset } from './media-types'

export type { MediaAsset }
export { ALLOWED_MIME_TYPES, ALLOWED_EXTENSIONS, MAX_FILE_SIZE }

/** Whether the Blob token is configured. Used to show a setup message instead of crashing. */
export function isBlobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN
}

export interface FileValidationResult {
  ok: boolean
  error?: string
}

/**
 * Validates an uploaded file's type, extension and size. Both the MIME type and
 * the filename extension must be on the allow-list — defense in depth against a
 * spoofed Content-Type.
 */
export function validateUpload(file: { type: string; size: number; name: string }): FileValidationResult {
  const mime = (file.type || '').toLowerCase()
  if (!ALLOWED_MIME_TYPES.includes(mime as (typeof ALLOWED_MIME_TYPES)[number])) {
    return { ok: false, error: 'Nepodporovaný typ súboru. Povolené: JPG, PNG, WEBP.' }
  }
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])) {
    return { ok: false, error: 'Nepodporovaná prípona súboru. Povolené: .jpg, .png, .webp.' }
  }
  if (file.size <= 0) {
    return { ok: false, error: 'Prázdny súbor.' }
  }
  if (file.size > MAX_FILE_SIZE) {
    return { ok: false, error: 'Súbor je príliš veľký. Maximum je 5 MB.' }
  }
  return { ok: true }
}

/**
 * Produces a safe, collision-resistant pathname for Blob while preserving a
 * sanitized hint of the original name. Output: `media/<slug>-<rand>.<ext>`.
 */
export function safeBlobPathname(originalName: string): string {
  const ext = (originalName.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
  const base = originalName
    .replace(/\.[^/.]+$/, '') // strip extension
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'image'
  const rand = Math.random().toString(36).slice(2, 10)
  return `media/${base}-${rand}.${ext}`
}

interface MediaRow {
  id: string
  url: string
  pathname: string | null
  filename: string | null
  original_filename: string | null
  mime_type: string | null
  size_bytes: number | null
  width: number | null
  height: number | null
  alt_text: string | null
  caption: string | null
  category: string | null
  created_by: string | null
  created_at: Date
  updated_at: Date
  is_active: boolean
}

function mapRow(r: MediaRow): MediaAsset {
  return {
    id: r.id,
    url: r.url,
    pathname: r.pathname,
    filename: r.filename,
    originalFilename: r.original_filename,
    mimeType: r.mime_type,
    sizeBytes: r.size_bytes,
    width: r.width,
    height: r.height,
    altText: r.alt_text,
    caption: r.caption,
    category: r.category,
    createdBy: r.created_by,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
    isActive: r.is_active,
  }
}

export async function listMedia(opts: { search?: string; category?: string } = {}): Promise<MediaAsset[]> {
  const clauses: string[] = ['is_active = true']
  const params: unknown[] = []
  if (opts.search) {
    params.push(`%${opts.search}%`)
    const i = params.length
    clauses.push(`(filename ILIKE $${i} OR original_filename ILIKE $${i} OR alt_text ILIKE $${i} OR caption ILIKE $${i})`)
  }
  if (opts.category) {
    params.push(opts.category)
    clauses.push(`category = $${params.length}`)
  }
  const res = await pool.query<MediaRow>(
    `SELECT * FROM media_assets WHERE ${clauses.join(' AND ')} ORDER BY created_at DESC LIMIT 500`,
    params,
  )
  return res.rows.map(mapRow)
}

export async function getMediaById(id: string): Promise<MediaAsset | null> {
  const res = await pool.query<MediaRow>('SELECT * FROM media_assets WHERE id = $1', [id])
  return res.rows[0] ? mapRow(res.rows[0]) : null
}

export interface InsertMediaInput {
  url: string
  pathname?: string | null
  filename?: string | null
  originalFilename?: string | null
  mimeType?: string | null
  sizeBytes?: number | null
  width?: number | null
  height?: number | null
  altText?: string | null
  caption?: string | null
  category?: string | null
  createdBy?: string | null
}

export async function insertMedia(input: InsertMediaInput): Promise<MediaAsset> {
  const res = await pool.query<MediaRow>(
    `INSERT INTO media_assets
       (url, pathname, filename, original_filename, mime_type, size_bytes, width, height, alt_text, caption, category, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     ON CONFLICT (url) DO UPDATE SET is_active = true, updated_at = now()
     RETURNING *`,
    [
      input.url,
      input.pathname ?? null,
      input.filename ?? null,
      input.originalFilename ?? null,
      input.mimeType ?? null,
      input.sizeBytes ?? null,
      input.width ?? null,
      input.height ?? null,
      input.altText ?? null,
      input.caption ?? null,
      input.category ?? null,
      input.createdBy ?? null,
    ],
  )
  return mapRow(res.rows[0])
}

export interface UpdateMediaInput {
  altText?: string | null
  caption?: string | null
  category?: string | null
  filename?: string | null
}

export async function updateMedia(id: string, input: UpdateMediaInput): Promise<MediaAsset | null> {
  const sets: string[] = []
  const params: unknown[] = []
  const add = (col: string, val: unknown) => {
    params.push(val)
    sets.push(`${col} = $${params.length}`)
  }
  if (input.altText !== undefined) add('alt_text', input.altText)
  if (input.caption !== undefined) add('caption', input.caption)
  if (input.category !== undefined) add('category', input.category)
  if (input.filename !== undefined) add('filename', input.filename)
  if (sets.length === 0) return getMediaById(id)
  sets.push('updated_at = now()')
  params.push(id)
  const res = await pool.query<MediaRow>(
    `UPDATE media_assets SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params,
  )
  return res.rows[0] ? mapRow(res.rows[0]) : null
}

/** Soft-deletes the metadata row (caller is responsible for Blob deletion). */
export async function deactivateMedia(id: string): Promise<void> {
  await pool.query('UPDATE media_assets SET is_active = false, updated_at = now() WHERE id = $1', [id])
}

/**
 * Returns the list of CMS locations that reference the given image URL, so the
 * UI can block/warn before deleting an in-use asset. Scans the JSONB blobs that
 * hold public site content (content + gallery).
 */
export async function findMediaUsage(url: string): Promise<string[]> {
  if (!url) return []
  const used: string[] = []

  const content = (await getContent('content')) as Record<string, unknown> | null
  if (content) {
    const json = JSON.stringify(content)
    if (json.includes(url)) {
      // Identify which top-level sections reference it for a friendlier message.
      for (const [section, value] of Object.entries(content)) {
        if (value && JSON.stringify(value).includes(url)) used.push(`obsah: ${section}`)
      }
      if (used.length === 0) used.push('obsah webu')
    }
  }

  const gallery = (await getContent('gallery')) as Array<{ src?: string }> | null
  if (Array.isArray(gallery) && gallery.some((g) => g?.src === url)) {
    used.push('galéria')
  }

  return used
}
