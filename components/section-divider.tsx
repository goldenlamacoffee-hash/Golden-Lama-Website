import { Bike } from "lucide-react"
import type { LucideIcon } from "lucide-react"

interface SectionDividerProps {
  /** Background context — matches the two adjacent sections so it merges. */
  tone?: "gold" | "cream"
  icon?: LucideIcon
}

/**
 * Branded transition between two same-colored homepage sections. Instead of a
 * large flat empty band, it places a small espresso emblem flanked by thin
 * brand lines, giving an intentional, premium separator without adding heavy
 * vertical space.
 */
export function SectionDivider({ tone = "gold", icon: Icon = Bike }: SectionDividerProps) {
  const bg = tone === "gold" ? "bg-[#E09E14]" : "bg-[#F5E3C2]"
  // Espresso ink reads well on both gold and cream.
  const line = "bg-[#28170F]/20"
  const badge = "bg-[#28170F] text-[#E09E14] ring-[#28170F]/10"

  return (
    <div className={`${bg} flex items-center justify-center px-6 py-10`} aria-hidden="true" data-section-divider={tone}>
      <div className="flex w-full max-w-md items-center gap-4">
        <span className={`h-px flex-1 ${line}`} />
        <span className={`flex h-10 w-10 items-center justify-center rounded-full ring-4 ${badge}`}>
          <Icon className="h-5 w-5" />
        </span>
        <span className={`h-px flex-1 ${line}`} />
      </div>
    </div>
  )
}
