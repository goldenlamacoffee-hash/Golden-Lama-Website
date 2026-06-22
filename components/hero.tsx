import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight, MapPin } from "lucide-react"
import type { PageContent } from "@/lib/types"

interface HeroProps {
  content: PageContent
}

export function Hero({ content }: HeroProps) {
  const hero = content.hero || {}
  const primaryText = hero.primaryCtaText || "Pozrite si naše menu"
  const primaryLink = hero.primaryCtaLink || "#menu"
  const secondaryText = hero.secondaryCtaText || "Kde nás nájdete"
  const secondaryLink = hero.secondaryCtaLink || "#locations"

  // CTAs can be hidden from the CMS; they otherwise always have safe defaults.
  const showPrimary = hero.showPrimaryCta !== false
  const showSecondary = hero.showSecondaryCta !== false
  const showCtaRow = showPrimary || showSecondary

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-24 pb-16 overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/images/hero-bike.jpg"
          alt="Golden Lama Coffee Bike"
          fill
          className="object-cover"
          priority
        />
        {/* Layered overlays for depth + legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/85 via-background/60 to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-transparent to-background/40" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <div className="flex justify-center mb-8 animate-fade-up">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/30 blur-2xl" aria-hidden="true" />
            <Image
              src="/logo.png"
              alt="Golden Lama Coffee"
              width={150}
              height={150}
              className="relative rounded-full shadow-2xl ring-1 ring-primary/40"
              priority
            />
          </div>
        </div>

        <p className="font-accent text-xl md:text-2xl text-primary mb-4 drop-shadow-sm animate-fade-up delay-100">
          {hero.subtitle || "Remeselná káva na kolesách"}
        </p>

        <h1 className="font-heading text-5xl md:text-7xl font-bold text-foreground mb-6 text-balance tracking-wide uppercase drop-shadow-sm animate-fade-up delay-200">
          {hero.title || "Golden Lama Coffee"}
        </h1>

        <p className="font-body text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed text-pretty animate-fade-up delay-300">
          {hero.description || "Prinášame vám výberovú kávu priamo na ulice Bratislavy."}
        </p>

        {showCtaRow && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up delay-400">
            {showPrimary && (
              <Button
                asChild
                size="lg"
                className="px-8 h-12 text-base bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5"
              >
                <Link href={primaryLink}>
                  {primaryText}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
            {showSecondary && (
              <Button
                asChild
                variant="outline"
                size="lg"
                className="px-8 h-12 text-base border-accent/60 bg-background/40 backdrop-blur-sm text-accent hover:bg-accent hover:text-accent-foreground transition-transform hover:-translate-y-0.5"
              >
                <Link href={secondaryLink}>
                  <MapPin className="h-4 w-4" />
                  {secondaryText}
                </Link>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Scroll cue */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 hidden md:block animate-fade-in delay-400">
        <div className="h-10 w-6 rounded-full border-2 border-primary/40 flex items-start justify-center p-1.5">
          <div className="h-2 w-1 rounded-full bg-primary animate-bounce" />
        </div>
      </div>
    </section>
  )
}
