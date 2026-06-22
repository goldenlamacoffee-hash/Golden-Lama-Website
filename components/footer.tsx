import Link from "next/link"
import Image from "next/image"
import { Instagram, Facebook, Mail, Phone, MapPin } from "lucide-react"
import { RichText } from "@/components/rich-text"
import type { PageContent } from "@/lib/types"

interface FooterProps {
  content: PageContent
}

const navLinks = [
  { href: "#menu", label: "Menu" },
  { href: "#gallery", label: "Galéria" },
  { href: "#about", label: "Náš príbeh" },
  { href: "#events", label: "Akcie" },
  { href: "#app", label: "Aplikácia" },
  { href: "#locations", label: "Kde nás nájdete" },
  { href: "#contact", label: "Kontakt" },
]

// TikTok isn't in lucide; small inline mark keeps the icon set consistent.
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  )
}

export function Footer({ content }: FooterProps) {
  const contact = content.contact || { email: "", phone: "", instagram: "" }
  const footer = content.footer || {}
  const email = contact.email || "ahoj@goldenlama.sk"
  const instagram = (contact.instagram || "@goldenlamacoffee").replace("@", "")

  return (
    <footer className="bg-[#1c0f09] border-t border-[#8C6F4E]/20">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-5">
              <Image src="/logo.png" alt="Golden Lama Coffee" width={48} height={48} className="rounded-full" />
              <span className="font-heading font-semibold text-lg text-foreground tracking-wide uppercase">
                Golden Lama
              </span>
            </Link>
            <p className="font-accent text-2xl text-primary mb-4">{footer.tagline || "Be Golden"}</p>
            <RichText
              value={footer.text}
              tone="light"
              className="text-sm max-w-sm"
              fallback={
                <p className="font-body text-sm text-muted-foreground leading-relaxed max-w-sm text-pretty">
                  Remeselná káva na kolesách. Prinášame výnimočnú kávu priamo k ľuďom, ktorí ju milujú — na trhoch,
                  podujatiach a po celom meste.
                </p>
              }
            />
          </div>

          {/* Navigation */}
          <div>
            <h3 className="font-heading text-sm uppercase tracking-wide text-foreground mb-4">Navigácia</h3>
            <ul className="space-y-2.5">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="font-body text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-heading text-sm uppercase tracking-wide text-foreground mb-4">Kontakt</h3>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li>
                <a href={`mailto:${email}`} className="inline-flex items-center gap-2 hover:text-primary transition-colors">
                  <Mail className="h-4 w-4" />
                  {email}
                </a>
              </li>
              {contact.phone && (
                <li>
                  <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-2 hover:text-primary transition-colors">
                    <Phone className="h-4 w-4" />
                    {contact.phone}
                  </a>
                </li>
              )}
              <li className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Bratislava a okolie
              </li>
            </ul>

            {/* Social */}
            <div className="flex items-center gap-3 mt-5">
              <a
                href={`https://instagram.com/${instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-9 h-9 rounded-full bg-[#3a251a] flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-[#3a251a]/70 transition-colors"
              >
                <Instagram className="h-4 w-4" />
              </a>
              {contact.facebook && (
                <a
                  href={contact.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="w-9 h-9 rounded-full bg-[#3a251a] flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-[#3a251a]/70 transition-colors"
                >
                  <Facebook className="h-4 w-4" />
                </a>
              )}
              {contact.tiktok && (
                <a
                  href={contact.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok"
                  className="w-9 h-9 rounded-full bg-[#3a251a] flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-[#3a251a]/70 transition-colors"
                >
                  <TikTokIcon className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 pt-8 border-t border-[#8C6F4E]/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground/70">
          <p>&copy; {new Date().getFullYear()} Golden Lama Coffee. Všetky práva vyhradené.</p>
          <div className="flex items-center gap-5">
            <Link href="/privacy" className="hover:text-muted-foreground transition-colors">
              Ochrana súkromia
            </Link>
            <Link href="/terms" className="hover:text-muted-foreground transition-colors">
              Obchodné podmienky
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
