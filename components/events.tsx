import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Reveal } from "@/components/reveal"
import { RichText } from "@/components/rich-text"
import { CalendarHeart, Briefcase, Store, PartyPopper, ArrowRight } from "lucide-react"
import type { PageContent } from "@/lib/types"

interface EventsProps {
  content: PageContent
}

const defaultBullets = [
  "Svadby a oslavy",
  "Firemné akcie a kancelárie",
  "Trhy a festivaly",
  "Otvorenia a promo akcie",
]

const bulletIcons = [CalendarHeart, Briefcase, Store, PartyPopper]

export function Events({ content }: EventsProps) {
  const events = content.events || {}

  // Section can be hidden entirely from the CMS.
  if (events.visible === false) return null

  const bullets = events.bullets && events.bullets.length > 0 ? events.bullets : defaultBullets

  // CTA renders only when we have both a label and a usable target. We accept an
  // explicit ctaLink, or fall back to the contact email as a mailto target — but
  // if neither exists we hide the button instead of rendering a dead link.
  const ctaText = events.ctaText?.trim() || "Rezervovať pre akciu"
  const explicitLink = events.ctaLink?.trim()
  const fallbackEmail = content.contact?.email?.trim()
  const ctaLink = explicitLink || (fallbackEmail ? `mailto:${fallbackEmail}` : "")
  const showCta = !!ctaText && !!ctaLink

  return (
    <section id="events" className="py-24 bg-[#28170F]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <Reveal>
            <p className="font-accent text-lg text-primary mb-3">
              {events.eyebrow || events.subtitle || "Akcie a súkromné rezervácie"}
            </p>
            <h2 className="font-heading text-4xl md:text-5xl font-bold text-foreground mb-6 uppercase tracking-wide text-balance">
              {events.title || "Golden Lama na vašej akcii"}
            </h2>
            <div className={showCta ? "mb-8" : ""}>
              <RichText
                value={events.description}
                tone="light"
                fallback={
                  <p className="font-body text-muted-foreground leading-relaxed text-pretty">
                    Prineste zážitok z remeselnej kávy priamo k vašim hosťom. Náš kávový bicykel rozžiari každú
                    udalosť — od intímnych osláv po veľké festivaly.
                  </p>
                }
              />
            </div>
            {showCta && (
              <Button
                asChild
                size="lg"
                className="px-8 h-12 text-base bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5"
              >
                <Link href={ctaLink}>
                  {ctaText}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </Reveal>

          <Reveal delay={150}>
            <div className="grid sm:grid-cols-2 gap-4">
              {bullets.map((bullet, index) => {
                const Icon = bulletIcons[index % bulletIcons.length]
                return (
                  <div
                    key={bullet}
                    className="flex items-center gap-4 p-5 rounded-xl bg-[#3a251a] border border-[#8C6F4E]/20 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50"
                  >
                    <div className="flex-shrink-0 w-11 h-11 rounded-full bg-primary/15 flex items-center justify-center ring-1 ring-primary/30">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <span className="font-medium text-[#F5E3C2] text-sm leading-snug">{bullet}</span>
                  </div>
                )
              })}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
