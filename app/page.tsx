import { Header } from "@/components/header"
import { Hero } from "@/components/hero"
import { About } from "@/components/about"
import { Menu } from "@/components/menu"
import { Locations } from "@/components/locations"
import { Events } from "@/components/events"
import { AppPromo } from "@/components/app-promo"
import { Gallery } from "@/components/gallery"
import { Contact } from "@/components/contact"
import { Footer } from "@/components/footer"
import { SectionDivider } from "@/components/section-divider"
import { getSiteData } from "@/lib/data"
import { Coffee, Camera } from "lucide-react"

export const dynamic = 'force-dynamic'

export default async function Home() {
  const siteData = await getSiteData()
  const { content, menu, gallery, schedule } = siteData

  // Branded dividers fill the awkward gaps where two same-colored sections meet
  // (Story→Menu on gold, App→Gallery on cream). Only show them when BOTH
  // adjacent sections are actually rendered.
  const aboutVisible = content.about?.visible !== false
  const menuVisible = content.menuSection?.visible !== false && menu.length > 0
  const appVisible = content.app?.visible !== false
  const galleryVisible = content.gallerySection?.visible !== false && gallery.length > 0

  return (
    <>
      <Header />
      <main>
        <Hero content={content} />
        <About content={content} />
        {aboutVisible && menuVisible && <SectionDivider tone="gold" icon={Coffee} />}
        <Menu menu={menu} section={content.menuSection} />
        <Locations schedule={schedule} section={content.locationsSection} />
        <Events content={content} />
        <AppPromo content={content} />
        {appVisible && galleryVisible && <SectionDivider tone="cream" icon={Camera} />}
        <Gallery gallery={gallery} section={content.gallerySection} />
        <Contact content={content} />
      </main>
      <Footer content={content} />
    </>
  )
}
