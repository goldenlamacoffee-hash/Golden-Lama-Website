import { Card, CardContent } from "@/components/ui/card"
import { Reveal } from "@/components/reveal"
import { SectionHeading } from "@/components/section-heading"
import type { MenuCategory, PageContent } from "@/lib/types"

interface MenuProps {
  menu: MenuCategory[]
  section?: PageContent["menuSection"]
}

const DEFAULT_NOTE =
  "Všetky nápoje sú dostupné teplé alebo ľadové. Ovsené, mandľové a sójové mlieko za príplatok 0,50 €."

export function Menu({ menu, section }: MenuProps) {
  // Section can be hidden, or hidden automatically when there is nothing to show.
  if (section?.visible === false) return null
  if (!menu || menu.length === 0) return null

  const note = section?.note !== undefined ? section.note : DEFAULT_NOTE

  return (
    <section id="menu" className="py-24 bg-[#E09E14]">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal>
          <SectionHeading
            eyebrow={section?.eyebrow || "Čo podávame"}
            title={section?.title || "Naše menu"}
            description={section?.subtitle || "Výberová káva pripravená na objednávku — od klasiky po naše podpisové špeciality."}
            tone="dark"
          />
        </Reveal>

        <div className="grid md:grid-cols-3 gap-8 mt-16">
          {menu.map((category, categoryIndex) => (
            <Reveal key={`category-${categoryIndex}`} delay={categoryIndex * 120}>
              <Card className="h-full bg-[#28170F] border-[#8C6F4E]/30 shadow-xl shadow-[#28170F]/20 transition-all duration-300 hover:-translate-y-1 hover:border-[#E09E14]/60">
                <CardContent className="pt-8 pb-7 px-6">
                  <h3 className="font-heading text-2xl font-bold text-[#F5E3C2] mb-6 text-center uppercase tracking-wide">
                    {category.category}
                  </h3>
                  <div className="h-px w-16 mx-auto mb-6 bg-[#E09E14]/40" aria-hidden="true" />
                  <div className="space-y-5">
                    {category.items.map((item, itemIndex) => (
                      <div
                        key={`item-${categoryIndex}-${itemIndex}`}
                        className="flex justify-between items-start gap-4"
                      >
                        <div>
                          <p className="font-semibold text-[#F5E3C2]">{item.name}</p>
                          <p className="text-sm text-[#F5E3C2]/60 leading-relaxed">{item.description}</p>
                        </div>
                        {typeof item.price === "number" && item.price > 0 && (
                          <span className="text-[#E09E14] font-bold whitespace-nowrap">
                            {item.price.toFixed(2)} €
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>

        {note && (
          <p className="text-center text-sm text-[#28170F]/80 mt-12 max-w-xl mx-auto">
            {note}
          </p>
        )}
      </div>
    </section>
  )
}
