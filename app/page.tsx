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
import { getSiteData } from "@/lib/data"

export const dynamic = 'force-dynamic'

export default async function Home() {
  const siteData = await getSiteData()

  return (
    <>
      <Header />
      <main>
        <Hero content={siteData.content} />
        <About content={siteData.content} />
        <Menu menu={siteData.menu} section={siteData.content.menuSection} />
        <Locations schedule={siteData.schedule} section={siteData.content.locationsSection} />
        <Events content={siteData.content} />
        <AppPromo content={siteData.content} />
        <Gallery gallery={siteData.gallery} section={siteData.content.gallerySection} />
        <Contact content={siteData.content} />
      </main>
      <Footer content={siteData.content} />
    </>
  )
}
