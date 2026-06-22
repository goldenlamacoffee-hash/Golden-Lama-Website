/** Shared media types — safe to import from both client and server code. */
export interface MediaAsset {
  id: string
  url: string
  pathname: string | null
  filename: string | null
  originalFilename: string | null
  mimeType: string | null
  sizeBytes: number | null
  width: number | null
  height: number | null
  altText: string | null
  caption: string | null
  category: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
  isActive: boolean
}

export const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
export const ACCEPT_ATTR = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp'
