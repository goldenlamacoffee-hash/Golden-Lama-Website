/**
 * Brand-safe rich text sanitizer (no external dependencies, runs on both the
 * server and the client).
 *
 * The CMS rich text editor produces HTML, but we never trust it. Both on save
 * and on render we run the HTML through `sanitizeRichText`, which:
 *   - strips <script>/<style> blocks and HTML comments entirely
 *   - drops every tag that is not on the allow-list (keeping the inner text)
 *   - rebuilds each allowed tag from scratch, discarding ALL original
 *     attributes except a validated `href` (on <a>) and an allow-listed
 *     `class` (brand color / size / alignment presets)
 *
 * Because attributes are rebuilt rather than passed through, event handlers
 * (onclick, …), inline styles, javascript: URLs and arbitrary fonts/colors
 * cannot survive sanitization. This keeps editors locked to the Golden Lama
 * design system and prevents XSS.
 */

// Inline + block tags an editor is allowed to emit.
const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "em",
  "u",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "a",
  "span",
])

// Deprecated tags normalized to their semantic equivalents.
const TAG_ALIASES: Record<string, string> = { b: "strong", i: "em" }

// Void tags that never get a closing tag.
const VOID_TAGS = new Set(["br"])

// The only classes allowed on text nodes — all map to brand presets defined in
// globals.css under `.gl-prose`.
const ALLOWED_CLASSES = new Set([
  // brand-approved text colors
  "gl-c-espresso",
  "gl-c-gold",
  "gl-c-taupe",
  "gl-c-cream",
  // brand-approved text sizes / emphasis
  "gl-text-small",
  "gl-text-normal",
  "gl-text-large",
  "gl-text-highlight",
  // simple alignment
  "gl-align-left",
  "gl-align-center",
  "gl-align-right",
])

/** Validate a link target: http(s), mailto, tel, in-page anchor or relative path. */
function isSafeHref(raw: string): boolean {
  const v = raw.trim()
  if (!v) return false
  if (v.startsWith("#") || v.startsWith("/")) return true
  if (/^(mailto:|tel:)/i.test(v)) return true
  try {
    const u = new URL(v)
    return u.protocol === "http:" || u.protocol === "https:"
  } catch {
    return false
  }
}

function escapeText(text: string): string {
  // Text segments cannot contain real tags (the tokenizer split those out);
  // escape any stray angle brackets defensively. Leave & alone to preserve
  // existing entities like &amp;.
  return text.replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function filterClasses(attrs: string): string {
  const match = attrs.match(/class\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i)
  if (!match) return ""
  const raw = match[2] ?? match[3] ?? match[4] ?? ""
  const kept = raw
    .split(/\s+/)
    .filter((c) => ALLOWED_CLASSES.has(c))
  return kept.length ? ` class="${kept.join(" ")}"` : ""
}

function extractHref(attrs: string): string | null {
  const match = attrs.match(/href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i)
  if (!match) return null
  const raw = match[2] ?? match[3] ?? match[4] ?? ""
  return isSafeHref(raw) ? raw.trim() : null
}

/**
 * Sanitize an untrusted HTML string into brand-safe HTML.
 */
export function sanitizeRichText(input: string | undefined | null): string {
  if (!input) return ""

  // 1. Remove script/style blocks (with their contents) and comments.
  let html = String(input)
    .replace(/<script[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<style[\s\S]*?<\/style\s*>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")

  // 2. Tokenize into tags and text runs.
  const tokenRe = /<\/?[a-zA-Z][^>]*>|[^<]+/g
  const tokens = html.match(tokenRe) || []
  const out: string[] = []
  const openStack: string[] = []

  for (const token of tokens) {
    if (token[0] !== "<") {
      out.push(escapeText(token))
      continue
    }

    const tagMatch = token.match(/^<\s*(\/?)\s*([a-zA-Z0-9]+)([^>]*)>$/)
    if (!tagMatch) {
      // Malformed tag-like text: escape it.
      out.push(escapeText(token))
      continue
    }

    const isClosing = tagMatch[1] === "/"
    let name = tagMatch[2].toLowerCase()
    const attrs = tagMatch[3] || ""
    name = TAG_ALIASES[name] || name

    if (!ALLOWED_TAGS.has(name)) {
      // Drop the tag entirely but keep any child text (handled as separate
      // text tokens). This "unwraps" disallowed elements.
      continue
    }

    if (VOID_TAGS.has(name)) {
      if (!isClosing) out.push(`<${name} />`)
      continue
    }

    if (isClosing) {
      // Only close if it matches an open tag we emitted.
      const idx = openStack.lastIndexOf(name)
      if (idx !== -1) {
        // Close any unclosed descendants first to keep markup balanced.
        while (openStack.length > idx) {
          out.push(`</${openStack.pop()}>`)
        }
      }
      continue
    }

    // Opening tag — rebuild with only safe attributes.
    if (name === "a") {
      const href = extractHref(attrs)
      if (!href) {
        // No safe href: unwrap (skip tag, keep text). Mark so we don't emit a
        // stray closing tag.
        openStack.push("a:skip")
        continue
      }
      const cls = filterClasses(attrs)
      const external = /^https?:/i.test(href)
      const rel = external ? ' rel="noopener noreferrer" target="_blank"' : ""
      out.push(`<a href="${href}"${cls}${rel}>`)
      openStack.push("a")
      continue
    }

    const cls = filterClasses(attrs)
    out.push(`<${name}${cls}>`)
    openStack.push(name)
  }

  // Close anything left open (skip the unwrap markers).
  while (openStack.length) {
    const t = openStack.pop() as string
    if (t === "a:skip") continue
    out.push(`</${t}>`)
  }

  return out.join("").trim()
}

/**
 * Returns true when the (sanitized) rich text has no visible content, so the
 * frontend can render nothing instead of an empty block.
 */
export function isRichTextEmpty(html: string | undefined | null): boolean {
  if (!html) return true
  const stripped = String(html)
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, "")
  return stripped.length === 0
}

/**
 * Heuristic: does this string contain HTML markup (rich text) vs. plain text?
 * Used to render legacy plain-text content safely as paragraphs.
 */
export function looksLikeHtml(value: string | undefined | null): boolean {
  if (!value) return false
  return /<\/?[a-z][\s\S]*>/i.test(value)
}

/**
 * Convert legacy plain text into safe paragraph HTML, preserving line breaks.
 */
export function plainTextToHtml(value: string): string {
  const blocks = value
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)
  return blocks
    .map((b) => `<p>${escapeText(b).replace(/\n/g, "<br />")}</p>`)
    .join("")
}

/**
 * Normalize any stored value (legacy plain text OR rich HTML) into sanitized,
 * brand-safe HTML ready for rendering. Returns "" when empty.
 */
export function toSafeHtml(value: string | undefined | null): string {
  if (!value) return ""
  const html = looksLikeHtml(value) ? value : plainTextToHtml(value)
  const safe = sanitizeRichText(html)
  return isRichTextEmpty(safe) ? "" : safe
}
