import { NextResponse, type NextRequest } from "next/server"
import { SITE_ACCESS_COOKIE, computeAccessToken } from "@/lib/site-gate"

// Paths that bypass the site-wide password gate:
// - /admin keeps its own DB-backed login
// - /api powers both the admin app and the unlock endpoint
// - /site-unlock is the gate itself
const BYPASS_PREFIXES = ["/admin", "/api", "/site-unlock"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (BYPASS_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next()
  }

  const sitePassword = process.env.SITE_PASSWORD
  // Fail open if no password is configured, so the site is never unintentionally
  // locked (e.g. in a fresh environment without the env var set).
  if (!sitePassword) {
    return NextResponse.next()
  }

  const expected = await computeAccessToken(sitePassword)
  const provided = request.cookies.get(SITE_ACCESS_COOKIE)?.value

  if (provided && provided === expected) {
    return NextResponse.next()
  }

  // Send unauthenticated visitors to the unlock page, remembering where they
  // were headed so we can return them there after they enter the password.
  const url = request.nextUrl.clone()
  url.pathname = "/site-unlock"
  url.search = ""
  const target = `${pathname}${request.nextUrl.search}`
  if (target && target !== "/") {
    url.searchParams.set("next", target)
  }
  return NextResponse.redirect(url)
}

export const config = {
  // Run on everything except Next internals and common static asset file types.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|txt|xml|json|woff|woff2|ttf|otf|mp3|mp4|webm)$).*)"],
}
