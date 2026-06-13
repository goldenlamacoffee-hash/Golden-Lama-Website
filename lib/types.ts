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
  }
  about: {
    title: string
    subtitle?: string
    paragraphs: string[]
  }
  events?: {
    title?: string
    subtitle?: string
    description?: string
    ctaText?: string
    ctaLink?: string
    bullets?: string[]
  }
  app?: {
    title?: string
    subtitle?: string
    description?: string
    features?: string[]
    iosLink?: string
    androidLink?: string
  }
  contact: {
    email: string
    phone: string
    instagram: string
    facebook?: string
    tiktok?: string
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
