import { pool } from './db'
import type { MenuCategory, ScheduleItem, GalleryImage, PageContent, SiteData, LegalPageData } from './types'

export type { MenuCategory, ScheduleItem, GalleryImage, PageContent, SiteData, LegalPageData }

export async function getContent(key: string): Promise<unknown> {
  const result = await pool.query(
    'SELECT value FROM site_content WHERE key = $1',
    [key]
  )
  return result.rows[0]?.value ?? null
}

export async function setContent(key: string, value: unknown): Promise<void> {
  await pool.query(
    `INSERT INTO site_content (key, value, updated_at) 
     VALUES ($1, $2, NOW()) 
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
    [key, JSON.stringify(value)]
  )
}

const defaultLegal: LegalPageData = {
  title: '',
  lastUpdated: '',
  sections: []
}

export async function getSiteData(): Promise<SiteData> {
  const result = await pool.query('SELECT key, value FROM site_content')
  
  const data: SiteData = {
    menu: [],
    schedule: [],
    gallery: [],
    content: {
      hero: { title: '', subtitle: '', description: '' },
      about: { title: '', paragraphs: [] },
      contact: { email: '', phone: '', instagram: '' }
    },
    privacy: { ...defaultLegal },
    terms: { ...defaultLegal }
  }
  
  for (const row of result.rows) {
    if (row.key === 'menu') data.menu = row.value
    else if (row.key === 'schedule') data.schedule = row.value
    else if (row.key === 'gallery') data.gallery = row.value
    else if (row.key === 'content') data.content = row.value
    else if (row.key === 'privacy') data.privacy = row.value
    else if (row.key === 'terms') data.terms = row.value
  }
  
  return data
}
