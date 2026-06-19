// Shared helpers for the site-wide password gate.
// Runs in BOTH the Edge middleware and the Node API route, so it relies only on
// the Web Crypto API (globalThis.crypto.subtle), which is available in both runtimes.

export const SITE_ACCESS_COOKIE = "site_access"

// How long a successful unlock stays valid (30 days).
export const SITE_ACCESS_TTL_SECONDS = 60 * 60 * 24 * 30

/**
 * Derives an opaque access token from the site password. The raw password is
 * never stored in the cookie — only this SHA-256 digest, which the middleware
 * re-derives from SITE_PASSWORD to validate the cookie on each request.
 */
export async function computeAccessToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`golden-lama-site-gate:${password}`)
  const digest = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}
