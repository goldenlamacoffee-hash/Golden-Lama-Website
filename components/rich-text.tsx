import { cn } from "@/lib/utils"
import { toSafeHtml } from "@/lib/rich-text"

interface RichTextProps {
  /** Stored content — may be legacy plain text or rich HTML. */
  value: string | undefined | null
  /** Color theme for prose: 'dark' on light backgrounds, 'light' on dark. */
  tone?: "dark" | "light"
  className?: string
  /** Optional fallback rendered when value is empty. */
  fallback?: React.ReactNode
}

/**
 * Safely renders CMS rich text (or legacy plain text) on the public site.
 * Content is always re-sanitized here as defense-in-depth, then rendered inside
 * a `.gl-prose` wrapper that enforces Golden Lama typography. Empty content
 * renders the optional fallback (or nothing) — never an empty block.
 */
export function RichText({ value, tone = "dark", className, fallback = null }: RichTextProps) {
  const html = toSafeHtml(value)

  if (!html) return <>{fallback}</>

  return (
    <div
      className={cn("gl-prose", tone === "light" ? "gl-prose-light" : "gl-prose-dark", className)}
      // Content is sanitized via toSafeHtml() (allow-list, attributes rebuilt).
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
