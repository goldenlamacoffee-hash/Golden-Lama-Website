import { MapPin, Clock, Calendar } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Reveal } from "@/components/reveal"
import { SectionHeading } from "@/components/section-heading"
import type { ScheduleItem, PageContent } from "@/lib/types"

interface LocationsProps {
  schedule: ScheduleItem[]
  section?: PageContent["locationsSection"]
}

const DEFAULT_MAP_URL = "https://maps.google.com/?q=Bratislava"
const DEFAULT_NOTE =
  "Rozvrh sa môže meniť v závislosti od počasia alebo špeciálnych akcií. Sledujte nás na sociálnych sieťach!"

export function Locations({ schedule, section }: LocationsProps) {
  // Hide when explicitly disabled, or when there is no schedule to show.
  if (section?.visible === false) return null
  if (!schedule || schedule.length === 0) return null

  const mapUrl = section?.mapUrl !== undefined ? section.mapUrl : DEFAULT_MAP_URL
  const note = section?.note !== undefined ? section.note : DEFAULT_NOTE

  return (
    <section id="locations" className="py-24 bg-[#F5E3C2]">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal>
          <SectionHeading
            eyebrow={section?.eyebrow || "Týždenný rozvrh"}
            title={section?.title || "Kde nás nájdete"}
            description={section?.subtitle || "Každý týždeň sme na rôznych miestach. Pozrite si náš rozvrh a stavte sa na výnimočnú kávu!"}
            tone="dark"
          />
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-16">
          {schedule.map((item, index) => (
            <Reveal key={`schedule-${index}`} delay={(index % 3) * 100}>
              <Card className="h-full bg-[#28170F] border-[#8C6F4E]/30 shadow-lg shadow-[#28170F]/10 transition-all duration-300 hover:-translate-y-1 hover:border-[#E09E14]">
                <CardContent className="pt-6 pb-6">
                  <div className="flex items-center gap-2 text-[#E09E14] mb-4">
                    <Calendar className="h-4 w-4" />
                    <span className="font-semibold uppercase tracking-wide text-sm">{item.day}</span>
                  </div>
                  <h3 className="font-heading text-xl font-bold text-[#F5E3C2] mb-4">
                    {item.location}
                  </h3>
                  <div className="space-y-2 text-sm text-[#F5E3C2]/70">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 flex-shrink-0 text-[#8C6F4E]" />
                      <span>{item.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 flex-shrink-0 text-[#8C6F4E]" />
                      <span>{item.time}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>

        {(mapUrl || note) && (
          <Reveal>
            <div className="mt-12 flex flex-col items-center gap-3">
              {mapUrl && (
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#28170F] underline-offset-4 hover:underline"
                >
                  <MapPin className="h-4 w-4" />
                  Zobraziť na mape
                </a>
              )}
              {note && (
                <p className="text-center text-sm text-[#28170F]/60 max-w-md">
                  {note}
                </p>
              )}
            </div>
          </Reveal>
        )}
      </div>
    </section>
  )
}
