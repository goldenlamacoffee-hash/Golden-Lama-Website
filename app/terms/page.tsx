import { getContent } from '@/lib/data'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface LegalSection {
  heading: string
  content: string
}

interface LegalPageData {
  title: string
  lastUpdated: string
  sections: LegalSection[]
}

export const dynamic = 'force-dynamic'

export default async function TermsPage() {
  const data = await getContent('terms') as LegalPageData | null
  
  const terms = data || {
    title: 'Obchodné podmienky',
    lastUpdated: '',
    sections: []
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#F5E3C2]">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-[#E09E14] hover:text-[#E09E14]/80 mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Späť na hlavnú stránku
        </Link>
        
        <h1 className="font-heading text-4xl md:text-5xl font-bold text-[#F5E3C2] mb-4 uppercase tracking-wide">
          {terms.title}
        </h1>
        
        {terms.lastUpdated && (
          <p className="text-[#F5E3C2]/60 mb-12">
            Posledná aktualizácia: {terms.lastUpdated}
          </p>
        )}
        
        <div className="space-y-8">
          {terms.sections.map((section, index) => (
            <section key={index}>
              <h2 className="font-heading text-xl font-bold text-[#E09E14] mb-3">
                {section.heading}
              </h2>
              <p className="text-[#F5E3C2]/80 leading-relaxed">
                {section.content}
              </p>
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}
