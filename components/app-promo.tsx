import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Reveal } from "@/components/reveal"
import { Stamp, Gift, Ticket, Bell, Apple, Smartphone } from "lucide-react"
import type { PageContent } from "@/lib/types"

interface AppPromoProps {
  content: PageContent
}

const defaultFeatures = [
  { icon: Stamp, text: "Zbierajte pečiatky za každú kávu" },
  { icon: Gift, text: "Odmeny a vernostné body" },
  { icon: Ticket, text: "Exkluzívne kupóny a zľavy" },
  { icon: Bell, text: "Upozornenia na akcie a polohu" },
]

export function AppPromo({ content }: AppPromoProps) {
  const app = content.app || {}
  const features = app.features && app.features.length > 0 ? app.features : null

  // Section can be hidden entirely from the CMS.
  if (app.visible === false) return null

  // Store buttons render only when a real link is present, so we never show a
  // dead/empty CTA pointing at "#".
  const iosLink = app.iosLink?.trim()
  const androidLink = app.androidLink?.trim()
  const hasIos = !!iosLink
  const hasAndroid = !!androidLink
  const hasStoreButtons = hasIos || hasAndroid

  return (
    <section id="app" className="py-24 bg-[#F5E3C2]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* App preview visual */}
          <Reveal>
            <div className="relative mx-auto max-w-sm">
              <div
                className="absolute inset-0 rounded-[2rem] bg-[#E09E14]/30 blur-3xl"
                aria-hidden="true"
              />
              <Image
                src="/images/app-preview.png"
                alt="Golden Lama vernostná mobilná aplikácia"
                width={420}
                height={520}
                className="relative w-full h-auto drop-shadow-2xl"
              />
            </div>
          </Reveal>

          {/* Copy + features */}
          <Reveal delay={150}>
            <p className="font-accent text-lg text-[#8C6F4E] mb-3">
              {app.eyebrow || app.subtitle || "Vernostný program"}
            </p>
            <h2 className="font-heading text-4xl md:text-5xl font-bold text-[#28170F] mb-6 uppercase tracking-wide text-balance">
              {app.title || "Stiahnite si našu aplikáciu"}
            </h2>
            <p className="font-body text-[#28170F]/70 leading-relaxed text-pretty mb-8">
              {app.description ||
                "Buďte Golden s každou kávou. Zbierajte pečiatky, využívajte kupóny a získavajte odmeny priamo vo vašom telefóne."}
            </p>

            <div className={`grid sm:grid-cols-2 gap-4 ${hasStoreButtons ? "mb-8" : ""}`}>
              {features
                ? features.map((text) => (
                    <div key={text} className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-[#28170F] flex items-center justify-center">
                        <Gift className="h-4 w-4 text-[#E09E14]" />
                      </div>
                      <span className="text-sm font-medium text-[#28170F]">{text}</span>
                    </div>
                  ))
                : defaultFeatures.map(({ icon: Icon, text }) => (
                    <div key={text} className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-[#28170F] flex items-center justify-center">
                        <Icon className="h-4 w-4 text-[#E09E14]" />
                      </div>
                      <span className="text-sm font-medium text-[#28170F]">{text}</span>
                    </div>
                  ))}
            </div>

            {hasStoreButtons && (
              <div className="flex flex-col sm:flex-row gap-4">
                {hasIos && (
                  <Button
                    asChild
                    size="lg"
                    className="px-7 h-12 gap-2 bg-[#28170F] text-[#F5E3C2] hover:bg-[#28170F]/90 transition-transform hover:-translate-y-0.5"
                  >
                    <Link href={iosLink!} target="_blank" rel="noopener noreferrer">
                      <Apple className="h-5 w-5" />
                      {app.iosText?.trim() || "App Store"}
                    </Link>
                  </Button>
                )}
                {hasAndroid && (
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="px-7 h-12 gap-2 border-[#28170F]/30 text-[#28170F] hover:bg-[#28170F] hover:text-[#F5E3C2] transition-transform hover:-translate-y-0.5"
                  >
                    <Link href={androidLink!} target="_blank" rel="noopener noreferrer">
                      <Smartphone className="h-5 w-5" />
                      {app.androidText?.trim() || "Google Play"}
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </Reveal>
        </div>
      </div>
    </section>
  )
}
