"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RichTextEditor } from "@/components/admin/rich-text-editor"
import { MediaPicker } from "@/components/admin/media-picker"
import { plainTextToHtml } from "@/lib/rich-text"
import type { PageContent } from "@/lib/types"
import {
  Save,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Info,
  Megaphone,
  BookOpen,
  Coffee,
  MapPin,
  Image as ImageIcon,
  CalendarHeart,
  Smartphone,
  Mail,
  PanelBottom,
} from "lucide-react"

interface ContentEditorProps {
  content: PageContent
  setContent: (content: PageContent) => void
}

type SectionKey =
  | "hero"
  | "about"
  | "menuSection"
  | "locationsSection"
  | "events"
  | "app"
  | "gallerySection"
  | "contact"
  | "footer"

const NAV: { key: SectionKey; label: string; icon: typeof Coffee }[] = [
  { key: "hero", label: "Hero", icon: Megaphone },
  { key: "about", label: "Príbeh", icon: BookOpen },
  { key: "menuSection", label: "Menu", icon: Coffee },
  { key: "locationsSection", label: "Kde nás nájdete", icon: MapPin },
  { key: "gallerySection", label: "Galéria", icon: ImageIcon },
  { key: "events", label: "Akcie / Rezervácie", icon: CalendarHeart },
  { key: "app", label: "Aplikácia / Vernosť", icon: Smartphone },
  { key: "contact", label: "Kontakt", icon: Mail },
  { key: "footer", label: "Pätička", icon: PanelBottom },
]

/**
 * Permissive link validation: allows empty values, absolute http(s) URLs,
 * mailto:/tel: targets, in-page anchors (#id) and root-relative paths (/x).
 */
function isValidLink(value: string | undefined): boolean {
  const v = (value || "").trim()
  if (!v) return true
  if (v.startsWith("#") || v.startsWith("/")) return true
  if (/^(mailto:|tel:)/i.test(v)) return true
  try {
    const u = new URL(v)
    return u.protocol === "http:" || u.protocol === "https:"
  } catch {
    return false
  }
}

const inputClass = "bg-[#28170F] border-[#8C6F4E]/50 text-[#F5E3C2]"

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="text-sm text-[#F5E3C2]/80 mb-1 block">{label}</label>
      {children}
      {hint && <p className="text-xs text-[#8C6F4E] mt-1">{hint}</p>}
      {error && (
        <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" /> {error}
        </p>
      )}
    </div>
  )
}

export function ContentEditor({ content, setContent }: ContentEditorProps) {
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null)
  const [active, setActive] = useState<SectionKey>("hero")

  // ---- update helpers (always spread existing data so nothing is wiped) ----
  const setHero = (field: string, value: unknown) =>
    setContent({ ...content, hero: { ...content.hero, [field]: value } })
  const setAbout = (field: string, value: unknown) =>
    setContent({ ...content, about: { ...content.about, [field]: value } })
  const setContact = (field: string, value: unknown) =>
    setContent({ ...content, contact: { ...content.contact, [field]: value } })

  const setSection = (key: SectionKey, field: string, value: unknown) =>
    setContent({
      ...content,
      [key]: { ...((content[key] as Record<string, unknown>) || {}), [field]: value },
    })


  // ---- validation ----
  const linkErrors = useMemo(() => {
    const errs: Record<string, boolean> = {}
    const check = (id: string, val?: string) => {
      if (!isValidLink(val)) errs[id] = true
    }
    check("hero.primaryCtaLink", content.hero?.primaryCtaLink)
    check("hero.secondaryCtaLink", content.hero?.secondaryCtaLink)
    check("events.ctaLink", content.events?.ctaLink)
    check("app.iosLink", content.app?.iosLink)
    check("app.androidLink", content.app?.androidLink)
    check("contact.facebook", content.contact?.facebook)
    check("contact.tiktok", content.contact?.tiktok)
    check("locationsSection.mapUrl", content.locationsSection?.mapUrl)
    return errs
  }, [content])

  const hasErrors = Object.keys(linkErrors).length > 0
  const linkHint = "Nechajte prázdne, alebo zadajte platný odkaz (https://…, mailto:…, #sekcia)."

  const handleSave = async () => {
    if (hasErrors) {
      setMessage({ type: "err", text: "Opravte neplatné odkazy pred uložením." })
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      })
      setMessage(
        res.ok
          ? { type: "ok", text: "Obsah bol uložený!" }
          : { type: "err", text: "Chyba pri ukladaní" },
      )
    } catch {
      setMessage({ type: "err", text: "Chyba pripojenia" })
    }
    setSaving(false)
  }

  // ---- visibility toggle (only for sections that support it) ----
  const visibleSections: Partial<Record<SectionKey, boolean>> = {
    about: content.about?.visible !== false,
    menuSection: content.menuSection?.visible !== false,
    locationsSection: content.locationsSection?.visible !== false,
    gallerySection: content.gallerySection?.visible !== false,
    events: content.events?.visible !== false,
    app: content.app?.visible !== false,
    contact: content.contact?.visible !== false,
  }
  const supportsVisibility = (k: SectionKey) => k in visibleSections

  const SectionShell = ({
    sectionKey,
    title,
    description,
    children,
  }: {
    sectionKey: SectionKey
    title: string
    description: string
    children: React.ReactNode
  }) => (
    <Card className="bg-[#3a251a] border-[#8C6F4E]/30">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-[#E09E14]">{title}</CardTitle>
            <p className="text-sm text-[#8C6F4E] mt-1 max-w-prose">{description}</p>
          </div>
          {supportsVisibility(sectionKey) && (
            <label className="flex shrink-0 items-center gap-2 text-sm text-[#F5E3C2]/80">
              <Switch
                checked={visibleSections[sectionKey]}
                onCheckedChange={(v) => setSection(sectionKey, "visible", v)}
              />
              {visibleSections[sectionKey] ? "Zobrazené" : "Skryté"}
            </label>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl text-[#F5E3C2]">Obsah webu</h2>
          <p className="text-sm text-[#8C6F4E] flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5" />
            Ukladáte verejný obsah webovej stránky. Prázdne polia použijú bezpečné predvolené hodnoty.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {message && (
            <span
              className={`text-sm flex items-center gap-1.5 ${
                message.type === "ok" ? "text-[#E09E14]" : "text-red-400"
              }`}
            >
              {message.type === "ok" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              {message.text}
            </span>
          )}
          <Button
            onClick={handleSave}
            disabled={saving || hasErrors}
            className="bg-[#E09E14] hover:bg-[#E09E14]/90 text-[#28170F]"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Ukladám..." : "Uložiť"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* Section navigation */}
        <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {NAV.map(({ key, label, icon: Icon }) => {
            const isActive = active === key
            const hidden = supportsVisibility(key) && !visibleSections[key]
            return (
              <button
                key={key}
                onClick={() => setActive(key)}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm text-left transition-colors ${
                  isActive
                    ? "bg-[#E09E14] text-[#28170F] font-medium"
                    : "text-[#F5E3C2]/80 hover:bg-[#8C6F4E]/20"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">{label}</span>
                {hidden && (
                  <span
                    className={`ml-auto hidden lg:inline text-[10px] uppercase tracking-wide ${
                      isActive ? "text-[#28170F]/70" : "text-[#8C6F4E]"
                    }`}
                  >
                    skryté
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Active section editor */}
        <div className="min-w-0">
          {active === "hero" && (
            <SectionShell
              sectionKey="hero"
              title="Hero sekcia"
              description="Hlavná úvodná sekcia na vrchu stránky — nadpis, podnadpis a tlačidlá výzvy."
            >
              <Field label="Podnadpis (malý text nad nadpisom)">
                <Input value={content.hero?.subtitle || ""} onChange={(e) => setHero("subtitle", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Nadpis">
                <Input value={content.hero?.title || ""} onChange={(e) => setHero("title", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Popis">
                <Textarea value={content.hero?.description || ""} onChange={(e) => setHero("description", e.target.value)} className={inputClass} rows={3} />
              </Field>

              <div className="rounded-lg border border-[#8C6F4E]/30 p-4 space-y-3">
                <p className="text-sm font-medium text-[#F5E3C2]">Obrázok pozadia</p>
                <MediaPicker
                  value={content.hero?.imageSrc || ""}
                  onChange={(url) => setHero("imageSrc", url)}
                  alt={content.hero?.imageAlt || ""}
                  onAltChange={(a) => setHero("imageAlt", a)}
                  fallbackSrc="/images/hero-bike.jpg"
                />
                <p className="text-xs text-[#8C6F4E]">Prázdne = predvolený obrázok kávového bicykla.</p>
              </div>

              <div className="rounded-lg border border-[#8C6F4E]/30 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-[#F5E3C2]">Hlavné tlačidlo</p>
                  <label className="flex items-center gap-2 text-sm text-[#F5E3C2]/80">
                    <Switch checked={content.hero?.showPrimaryCta !== false} onCheckedChange={(v) => setHero("showPrimaryCta", v)} />
                    {content.hero?.showPrimaryCta !== false ? "Zobrazené" : "Skryté"}
                  </label>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Text tlačidla">
                    <Input value={content.hero?.primaryCtaText || ""} onChange={(e) => setHero("primaryCtaText", e.target.value)} className={inputClass} placeholder="Pozrite si naše menu" />
                  </Field>
                  <Field label="Odkaz tlačidla" hint={linkHint} error={linkErrors["hero.primaryCtaLink"] ? "Neplatný odkaz" : undefined}>
                    <Input value={content.hero?.primaryCtaLink || ""} onChange={(e) => setHero("primaryCtaLink", e.target.value)} className={inputClass} placeholder="#menu" />
                  </Field>
                </div>
              </div>

              <div className="rounded-lg border border-[#8C6F4E]/30 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-[#F5E3C2]">Vedľajšie tlačidlo</p>
                  <label className="flex items-center gap-2 text-sm text-[#F5E3C2]/80">
                    <Switch checked={content.hero?.showSecondaryCta !== false} onCheckedChange={(v) => setHero("showSecondaryCta", v)} />
                    {content.hero?.showSecondaryCta !== false ? "Zobrazené" : "Skryté"}
                  </label>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Text tlačidla">
                    <Input value={content.hero?.secondaryCtaText || ""} onChange={(e) => setHero("secondaryCtaText", e.target.value)} className={inputClass} placeholder="Kde nás nájdete" />
                  </Field>
                  <Field label="Odkaz tlačidla" hint={linkHint} error={linkErrors["hero.secondaryCtaLink"] ? "Neplatný odkaz" : undefined}>
                    <Input value={content.hero?.secondaryCtaLink || ""} onChange={(e) => setHero("secondaryCtaLink", e.target.value)} className={inputClass} placeholder="#locations" />
                  </Field>
                </div>
              </div>
            </SectionShell>
          )}

          {active === "about" && (
            <SectionShell
              sectionKey="about"
              title="Príbeh / O nás"
              description="Sekcia s príbehom značky. Karty hodnôt vpravo sú súčasťou dizajnu a nie sú editovateľné."
            >
              <Field label="Podnadpis">
                <Input value={content.about?.subtitle || ""} onChange={(e) => setAbout("subtitle", e.target.value)} className={inputClass} placeholder="Náš príbeh" />
              </Field>
              <Field label="Nadpis">
                <Input value={content.about?.title || ""} onChange={(e) => setAbout("title", e.target.value)} className={inputClass} placeholder="Káva s poslaním" />
              </Field>
              <Field
                label="Text príbehu"
                hint="Formátovaný text sekcie Príbeh. Existujúce odseky sa načítali automaticky — upravte ich a uložte."
              >
                <RichTextEditor
                  value={
                    content.about?.body ??
                    plainTextToHtml((content.about?.paragraphs || []).join("\n\n"))
                  }
                  onChange={(html) => setAbout("body", html)}
                  placeholder="Napíšte príbeh značky…"
                />
              </Field>
            </SectionShell>
          )}

          {active === "menuSection" && (
            <SectionShell
              sectionKey="menuSection"
              title="Menu — nadpis sekcie"
              description="Ovláda nadpisy nad menu. Samotné položky menu upravíte v záložke „Menu“. Ak nie sú žiadne položky, sekcia sa skryje."
            >
              <Field label="Podnadpis">
                <Input value={content.menuSection?.eyebrow || ""} onChange={(e) => setSection("menuSection", "eyebrow", e.target.value)} className={inputClass} placeholder="Čo podávame" />
              </Field>
              <Field label="Nadpis">
                <Input value={content.menuSection?.title || ""} onChange={(e) => setSection("menuSection", "title", e.target.value)} className={inputClass} placeholder="Naše menu" />
              </Field>
              <Field label="Popis">
                <Textarea value={content.menuSection?.subtitle || ""} onChange={(e) => setSection("menuSection", "subtitle", e.target.value)} className={inputClass} rows={2} />
              </Field>
              <Field label="Poznámka pod menu" hint="Napr. informácie o mlieku a príplatkoch. Prázdne = skryté.">
                <Textarea value={content.menuSection?.note ?? ""} onChange={(e) => setSection("menuSection", "note", e.target.value)} className={inputClass} rows={2} />
              </Field>
            </SectionShell>
          )}

          {active === "locationsSection" && (
            <SectionShell
              sectionKey="locationsSection"
              title="Kde nás nájdete — nadpis sekcie"
              description="Ovláda nadpisy a odkaz na mapu. Jednotlivé lokality upravíte v záložke „Rozvrh“. Bez lokalít sa sekcia skryje."
            >
              <Field label="Podnadpis">
                <Input value={content.locationsSection?.eyebrow || ""} onChange={(e) => setSection("locationsSection", "eyebrow", e.target.value)} className={inputClass} placeholder="Týždenný rozvrh" />
              </Field>
              <Field label="Nadpis">
                <Input value={content.locationsSection?.title || ""} onChange={(e) => setSection("locationsSection", "title", e.target.value)} className={inputClass} placeholder="Kde nás nájdete" />
              </Field>
              <Field label="Popis">
                <Textarea value={content.locationsSection?.subtitle || ""} onChange={(e) => setSection("locationsSection", "subtitle", e.target.value)} className={inputClass} rows={2} />
              </Field>
              <Field label="Odkaz na mapu" hint={linkHint} error={linkErrors["locationsSection.mapUrl"] ? "Neplatný odkaz" : undefined}>
                <Input value={content.locationsSection?.mapUrl ?? ""} onChange={(e) => setSection("locationsSection", "mapUrl", e.target.value)} className={inputClass} placeholder="https://maps.google.com/?q=..." />
              </Field>
              <Field label="Poznámka pod rozvrhom" hint="Prázdne = skryté.">
                <Textarea value={content.locationsSection?.note ?? ""} onChange={(e) => setSection("locationsSection", "note", e.target.value)} className={inputClass} rows={2} />
              </Field>
            </SectionShell>
          )}

          {active === "gallerySection" && (
            <SectionShell
              sectionKey="gallerySection"
              title="Galéria — nadpis sekcie"
              description="Ovláda nadpisy galérie. Obrázky pridáte v záložke „Galéria“. Bez obrázkov sa sekcia skryje."
            >
              <Field label="Podnadpis">
                <Input value={content.gallerySection?.eyebrow || ""} onChange={(e) => setSection("gallerySection", "eyebrow", e.target.value)} className={inputClass} placeholder="Galéria" />
              </Field>
              <Field label="Nadpis">
                <Input value={content.gallerySection?.title || ""} onChange={(e) => setSection("gallerySection", "title", e.target.value)} className={inputClass} placeholder="Náš kávový bicykel" />
              </Field>
              <Field label="Popis">
                <Textarea value={content.gallerySection?.subtitle || ""} onChange={(e) => setSection("gallerySection", "subtitle", e.target.value)} className={inputClass} rows={2} />
              </Field>
            </SectionShell>
          )}

          {active === "events" && (
            <SectionShell
              sectionKey="events"
              title="Akcie / Rezervácie"
              description="Sekcia pre súkromné akcie a rezervácie. Tlačidlo sa zobrazí len ak má text aj platný odkaz."
            >
              <Field label="Podnadpis">
                <Input value={content.events?.eyebrow || content.events?.subtitle || ""} onChange={(e) => setSection("events", "subtitle", e.target.value)} className={inputClass} placeholder="Akcie a súkromné rezervácie" />
              </Field>
              <Field label="Nadpis">
                <Input value={content.events?.title || ""} onChange={(e) => setSection("events", "title", e.target.value)} className={inputClass} placeholder="Golden Lama na vašej akcii" />
              </Field>
              <Field label="Popis" hint="Formátovaný text. Prázdne = bezpečný predvolený text.">
                <RichTextEditor
                  value={content.events?.description}
                  onChange={(html) => setSection("events", "description", html)}
                  placeholder="Popíšte ponuku pre akcie…"
                />
              </Field>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Text tlačidla">
                  <Input value={content.events?.ctaText || ""} onChange={(e) => setSection("events", "ctaText", e.target.value)} className={inputClass} placeholder="Rezervovať pre akciu" />
                </Field>
                <Field label="Odkaz tlačidla" hint={linkHint} error={linkErrors["events.ctaLink"] ? "Neplatný odkaz" : undefined}>
                  <Input value={content.events?.ctaLink || ""} onChange={(e) => setSection("events", "ctaLink", e.target.value)} className={inputClass} placeholder="mailto:... alebo #contact" />
                </Field>
              </div>
            </SectionShell>
          )}

          {active === "app" && (
            <SectionShell
              sectionKey="app"
              title="Aplikácia / Vernosť"
              description="Sekcia mobilnej aplikácie. Tlačidlá obchodov sa zobrazia len ak vyplníte ich odkaz."
            >
              <Field label="Podnadpis">
                <Input value={content.app?.eyebrow || content.app?.subtitle || ""} onChange={(e) => setSection("app", "subtitle", e.target.value)} className={inputClass} placeholder="Vernostný program" />
              </Field>
              <Field label="Nadpis">
                <Input value={content.app?.title || ""} onChange={(e) => setSection("app", "title", e.target.value)} className={inputClass} placeholder="Stiahnite si našu aplikáciu" />
              </Field>
              <Field label="Popis" hint="Formátovaný text. Prázdne = bezpečný predvolený text.">
                <RichTextEditor
                  value={content.app?.description}
                  onChange={(html) => setSection("app", "description", html)}
                  placeholder="Popíšte vernostný program…"
                />
              </Field>

              <div className="rounded-lg border border-[#8C6F4E]/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-[#F5E3C2]">Obrázok aplikácie</p>
                  <label className="flex items-center gap-2 text-sm text-[#F5E3C2]/80">
                    <Switch checked={content.app?.showImage !== false} onCheckedChange={(v) => setSection("app", "showImage", v)} />
                    {content.app?.showImage !== false ? "Zobrazené" : "Skryté"}
                  </label>
                </div>
                {content.app?.showImage !== false && (
                  <>
                    <MediaPicker
                      value={content.app?.imageSrc || ""}
                      onChange={(url) => setSection("app", "imageSrc", url)}
                      alt={content.app?.imageAlt || ""}
                      onAltChange={(a) => setSection("app", "imageAlt", a)}
                      fallbackSrc="/images/app-preview.png"
                    />
                    <Field label="Popisok pod obrázkom" hint="Voliteľné.">
                      <Input value={content.app?.imageCaption || ""} onChange={(e) => setSection("app", "imageCaption", e.target.value)} className={inputClass} />
                    </Field>
                  </>
                )}
              </div>

              <div className="rounded-lg border border-[#8C6F4E]/30 p-4 space-y-3">
                <p className="text-sm font-medium text-[#F5E3C2]">App Store (iOS)</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Text tlačidla">
                    <Input value={content.app?.iosText || ""} onChange={(e) => setSection("app", "iosText", e.target.value)} className={inputClass} placeholder="App Store" />
                  </Field>
                  <Field label="Odkaz" hint={linkHint} error={linkErrors["app.iosLink"] ? "Neplatný odkaz" : undefined}>
                    <Input value={content.app?.iosLink || ""} onChange={(e) => setSection("app", "iosLink", e.target.value)} className={inputClass} placeholder="https://apps.apple.com/..." />
                  </Field>
                </div>
                <p className="text-xs text-[#8C6F4E]">Bez odkazu sa tlačidlo App Store nezobrazí.</p>
              </div>

              <div className="rounded-lg border border-[#8C6F4E]/30 p-4 space-y-3">
                <p className="text-sm font-medium text-[#F5E3C2]">Google Play (Android)</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Text tlačidla">
                    <Input value={content.app?.androidText || ""} onChange={(e) => setSection("app", "androidText", e.target.value)} className={inputClass} placeholder="Google Play" />
                  </Field>
                  <Field label="Odkaz" hint={linkHint} error={linkErrors["app.androidLink"] ? "Neplatný odkaz" : undefined}>
                    <Input value={content.app?.androidLink || ""} onChange={(e) => setSection("app", "androidLink", e.target.value)} className={inputClass} placeholder="https://play.google.com/..." />
                  </Field>
                </div>
                <p className="text-xs text-[#8C6F4E]">Bez odkazu sa tlačidlo Google Play nezobrazí.</p>
              </div>
            </SectionShell>
          )}

          {active === "contact" && (
            <SectionShell
              sectionKey="contact"
              title="Kontakt"
              description="Kontaktné údaje a sociálne siete. Tlačidlo Instagramu a sociálne ikony sa zobrazia len ak sú vyplnené."
            >
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Podnadpis">
                  <Input value={content.contact?.eyebrow || ""} onChange={(e) => setContact("eyebrow", e.target.value)} className={inputClass} placeholder="Kontakt" />
                </Field>
                <Field label="Nadpis">
                  <Input value={content.contact?.title || ""} onChange={(e) => setContact("title", e.target.value)} className={inputClass} placeholder="Spojte sa s nami" />
                </Field>
              </div>
              <Field label="Popis" hint="Formátovaný text. Prázdne = bezpečný predvolený text.">
                <RichTextEditor
                  value={content.contact?.subtitle}
                  onChange={(html) => setContact("subtitle", html)}
                  placeholder="Krátka výzva ku kontaktu…"
                />
              </Field>
              <div className="grid sm:grid-cols-3 gap-3">
                <Field label="Email">
                  <Input value={content.contact?.email || ""} onChange={(e) => setContact("email", e.target.value)} className={inputClass} placeholder="ahoj@goldenlama.sk" />
                </Field>
                <Field label="Telefón" hint="Prázdne = skryté">
                  <Input value={content.contact?.phone || ""} onChange={(e) => setContact("phone", e.target.value)} className={inputClass} />
                </Field>
                <Field label="Instagram" hint="Prázdne = tlačidlo skryté">
                  <Input value={content.contact?.instagram || ""} onChange={(e) => setContact("instagram", e.target.value)} className={inputClass} placeholder="@goldenlamacoffee" />
                </Field>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Facebook URL" hint={linkHint} error={linkErrors["contact.facebook"] ? "Neplatný odkaz" : undefined}>
                  <Input value={content.contact?.facebook || ""} onChange={(e) => setContact("facebook", e.target.value)} className={inputClass} placeholder="https://facebook.com/..." />
                </Field>
                <Field label="TikTok URL" hint={linkHint} error={linkErrors["contact.tiktok"] ? "Neplatný odkaz" : undefined}>
                  <Input value={content.contact?.tiktok || ""} onChange={(e) => setContact("tiktok", e.target.value)} className={inputClass} placeholder="https://tiktok.com/@..." />
                </Field>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Text email tlačidla">
                  <Input value={content.contact?.emailCtaText || ""} onChange={(e) => setContact("emailCtaText", e.target.value)} className={inputClass} placeholder="Napíšte nám" />
                </Field>
                <Field label="Text Instagram tlačidla">
                  <Input value={content.contact?.instagramCtaText || ""} onChange={(e) => setContact("instagramCtaText", e.target.value)} className={inputClass} placeholder="Sledujte nás" />
                </Field>
              </div>
            </SectionShell>
          )}

          {active === "footer" && (
            <SectionShell
              sectionKey="footer"
              title="Pätička"
              description="Text a slogan v spodnej časti stránky. Navigácia a copyright sú generované automaticky."
            >
              <Field label="Slogan (zlatý text)">
                <Input value={content.footer?.tagline || ""} onChange={(e) => setSection("footer", "tagline", e.target.value)} className={inputClass} placeholder="Be Golden" />
              </Field>
              <Field label="Text pätičky" hint="Formátovaný text. Prázdne = bezpečný predvolený text.">
                <RichTextEditor
                  value={content.footer?.text}
                  onChange={(html) => setSection("footer", "text", html)}
                  placeholder="Krátky popis značky…"
                />
              </Field>
            </SectionShell>
          )}
        </div>
      </div>
    </div>
  )
}
