import { Mail, Instagram, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Reveal } from "@/components/reveal"
import { RichText } from "@/components/rich-text"
import Link from "next/link"
import type { PageContent } from "@/lib/types"

interface ContactProps {
  content: PageContent
}

export function Contact({ content }: ContactProps) {
  const contact = content.contact || { email: "", phone: "", instagram: "" }

  // Section can be hidden entirely from the CMS.
  if (contact.visible === false) return null

  const email = (contact.email || "ahoj@goldenlama.sk").trim()
  const instagramRaw = (contact.instagram || "@goldenlamacoffee").trim()
  const instagram = instagramRaw.replace("@", "")
  const hasInstagram = !!instagram
  const emailCtaText = contact.emailCtaText?.trim() || "Napíšte nám"
  const instagramCtaText = contact.instagramCtaText?.trim() || "Sledujte nás"

  return (
    <section id="contact" className="py-24 bg-[#28170F]">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <Reveal>
          <p className="font-accent text-lg text-primary mb-3">{contact.eyebrow || "Kontakt"}</p>
          <h2 className="font-heading text-4xl md:text-5xl font-bold text-foreground mb-6 uppercase tracking-wide text-balance">
            {contact.title || "Spojte sa s nami"}
          </h2>
          <RichText
            value={contact.subtitle}
            tone="light"
            className="max-w-xl mx-auto mb-10"
            fallback={
              <p className="font-body text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed text-pretty">
                Máte otázky alebo chcete nás pozvať na vaše podujatie? Napíšte nám — radi sa ozveme.
              </p>
            }
          />

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <Button
              asChild
              size="lg"
              className="px-8 h-12 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5"
            >
              <Link href={`mailto:${email}`}>
                <Mail className="h-4 w-4" />
                {emailCtaText}
              </Link>
            </Button>
            {hasInstagram && (
              <Button
                asChild
                variant="outline"
                size="lg"
                className="px-8 h-12 gap-2 border-accent/60 text-accent hover:bg-accent hover:text-accent-foreground transition-transform hover:-translate-y-0.5"
              >
                <Link
                  href={`https://instagram.com/${instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Instagram className="h-4 w-4" />
                  {instagramCtaText}
                </Link>
              </Button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
            <a href={`mailto:${email}`} className="inline-flex items-center gap-2 hover:text-primary transition-colors">
              <Mail className="h-4 w-4" />
              {email}
            </a>
            {contact.phone && (
              <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-2 hover:text-primary transition-colors">
                <Phone className="h-4 w-4" />
                {contact.phone}
              </a>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
