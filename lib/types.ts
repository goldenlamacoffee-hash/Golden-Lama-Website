export interface GalleryImage {
  src: string
  alt: string
  caption?: string
}

export interface MenuItem {
  name: string
  description: string
  price: number
}

export interface MenuCategory {
  category: string
  items: MenuItem[]
}

export interface ScheduleItem {
  day: string
  location: string
  address: string
  time: string
}

export interface PageContent {
  hero: {
    title: string
    subtitle: string
    description: string
    primaryCtaText?: string
    primaryCtaLink?: string
    secondaryCtaText?: string
    secondaryCtaLink?: string
    /** When false, the matching CTA button is hidden even if text/link exist. Defaults to shown. */
    showPrimaryCta?: boolean
    showSecondaryCta?: boolean
  }
  about: {
    title: string
    subtitle?: string
    paragraphs: string[]
    /** Section show/hide. Undefined or true = visible. */
    visible?: boolean
  }
  /** Heading/intro copy for the Menu section (items themselves live in `menu`). */
  menuSection?: {
    eyebrow?: string
    title?: string
    subtitle?: string
    note?: string
    visible?: boolean
  }
  /** Heading/intro copy for the Locations / schedule section. */
  locationsSection?: {
    eyebrow?: string
    title?: string
    subtitle?: string
    mapUrl?: string
    note?: string
    visible?: boolean
  }
  /** Heading/intro copy for the Gallery section (images live in `gallery`). */
  gallerySection?: {
    eyebrow?: string
    title?: string
    subtitle?: string
    visible?: boolean
  }
  events?: {
    eyebrow?: string
    title?: string
    subtitle?: string
    description?: string
    ctaText?: string
    ctaLink?: string
    bullets?: string[]
    visible?: boolean
  }
  app?: {
    eyebrow?: string
    title?: string
    subtitle?: string
    description?: string
    features?: string[]
    iosText?: string
    iosLink?: string
    androidText?: string
    androidLink?: string
    visible?: boolean
  }
  contact: {
    eyebrow?: string
    title?: string
    subtitle?: string
    email: string
    phone: string
    instagram: string
    facebook?: string
    tiktok?: string
    emailCtaText?: string
    instagramCtaText?: string
    visible?: boolean
  }
  footer?: {
    tagline?: string
    text?: string
  }
}

export interface LegalSection {
  heading: string
  content: string
}

export interface LegalPageData {
  title: string
  lastUpdated: string
  sections: LegalSection[]
}

export interface SiteData {
  menu: MenuCategory[]
  schedule: ScheduleItem[]
  gallery: GalleryImage[]
  content: PageContent
  privacy: LegalPageData
  terms: LegalPageData
}
