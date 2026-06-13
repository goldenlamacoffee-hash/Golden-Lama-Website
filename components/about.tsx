import { Heart, Leaf, Bike } from "lucide-react"
import { Reveal } from "@/components/reveal"
import type { PageContent } from "@/lib/types"

const values = [
  {
    icon: Heart,
    title: "S láskou pripravené",
    description: "Každý šálok je pripravený na objednávku s dôrazom na detail a skutočnou vášňou pre kvalitu.",
  },
  {
    icon: Leaf,
    title: "Udržateľný zdroj",
    description: "Spolupracujeme s etickými pražiarňami, ktoré uprednostňujú fair trade a udržateľné postupy.",
  },
  {
    icon: Bike,
    title: "Komunita na prvom mieste",
    description: "Od farmárskych trhov po miestne podujatia, prinášame kávovú kultúru do vášho susedstva.",
  },
]

interface AboutProps {
  content: PageContent
}

export function About({ content }: AboutProps) {
  const about = content.about || { title: "", paragraphs: [] }

  return (
    <section id="about" className="py-24 bg-[#E09E14]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <Reveal>
            <p className="font-accent text-lg text-[#28170F] mb-3">
              {about.subtitle || "Náš príbeh"}
            </p>
            <h2 className="font-heading text-4xl md:text-5xl font-bold text-[#28170F] mb-6 uppercase tracking-wide text-balance">
              {about.title || "Káva s poslaním"}
            </h2>
            <div className="font-body space-y-4 text-[#28170F]/80 leading-relaxed text-pretty">
              {(about.paragraphs || []).map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </Reveal>

          <div className="space-y-5">
            {values.map((value, index) => (
              <Reveal key={value.title} delay={index * 120}>
                <div className="flex gap-5 p-6 rounded-xl bg-[#28170F] shadow-lg shadow-[#28170F]/20 transition-transform duration-300 hover:-translate-y-1">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#E09E14]/15 flex items-center justify-center ring-1 ring-[#E09E14]/30">
                    <value.icon className="h-5 w-5 text-[#E09E14]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#F5E3C2] mb-1">{value.title}</h3>
                    <p className="text-sm text-[#F5E3C2]/70 leading-relaxed">{value.description}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
