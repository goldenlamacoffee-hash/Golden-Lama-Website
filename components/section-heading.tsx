import { cn } from "@/lib/utils"

interface SectionHeadingProps {
  eyebrow?: string
  title: string
  description?: string
  /** Color theme: 'dark' for use on light backgrounds, 'light' for dark backgrounds */
  tone?: "dark" | "light"
  align?: "center" | "left"
  className?: string
}

/**
 * Consistent premium section heading: cursive eyebrow + uppercase heading
 * with an optional supporting description. Keeps vertical rhythm uniform
 * across every homepage section.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  tone = "dark",
  align = "center",
  className,
}: SectionHeadingProps) {
  const isLight = tone === "light"

  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" ? "mx-auto text-center" : "text-left",
        className,
      )}
    >
      {eyebrow && (
        <p
          className={cn(
            "font-accent text-lg mb-3",
            isLight ? "text-primary" : "text-[#8C6F4E]",
          )}
        >
          {eyebrow}
        </p>
      )}
      <h2
        className={cn(
          "font-heading text-3xl md:text-5xl font-bold uppercase tracking-wide text-balance",
          isLight ? "text-foreground" : "text-[#28170F]",
        )}
      >
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            "font-body mt-5 leading-relaxed text-pretty",
            isLight ? "text-muted-foreground" : "text-[#28170F]/70",
            align === "center" && "mx-auto",
          )}
        >
          {description}
        </p>
      )}
    </div>
  )
}
