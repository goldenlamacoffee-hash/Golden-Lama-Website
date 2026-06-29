import type { Metadata } from 'next'
import { Raleway, Exo_2, Pacifico } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { GoogleAnalytics } from '@next/third-parties/google'
import './globals.css'

// Google Analytics 4 measurement ID. Configurable via env, with a safe default.
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-E51GRQTZ6T'

const raleway = Raleway({ 
  subsets: ["latin", "latin-ext"],
  variable: '--font-raleway'
});

const exo2 = Exo_2({ 
  subsets: ["latin", "latin-ext"],
  variable: '--font-exo2'
});

const pacifico = Pacifico({ 
  weight: "400",
  subsets: ["latin"],
  variable: '--font-pacifico'
});

const siteUrl = 'https://www.goldenlama.sk'
const siteTitle = 'Golden Lama Coffee | Remeselná káva na kolesách'
const siteDescription =
  'Zažite ručne pripravenú špeciálnu kávu z nášho mobilného kávového bicykla. Nájdete nás na miestnych trhoch, podujatiach a po celom meste.'
const ogImage = '/images/golden-lama-og.png'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: siteTitle,
  description: siteDescription,
  applicationName: 'Golden Lama Coffee',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png' },
    ],
    apple: '/apple-icon.png',
    shortcut: '/favicon.ico',
  },
  openGraph: {
    type: 'website',
    siteName: 'Golden Lama Coffee',
    title: siteTitle,
    description: siteDescription,
    url: siteUrl,
    locale: 'sk_SK',
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: 'Golden Lama Coffee',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
    images: [ogImage],
  },
}

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'CafeOrCoffeeShop',
  name: 'Golden Lama Coffee',
  description: siteDescription,
  url: siteUrl,
  logo: `${siteUrl}/icon.png`,
  image: `${siteUrl}${ogImage}`,
  servesCuisine: 'Coffee',
  slogan: 'Be Golden',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="sk" className={`${raleway.variable} ${exo2.variable} ${pacifico.variable}`}>
      <body className="font-body antialiased bg-background">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
      {process.env.NODE_ENV === 'production' && GA_MEASUREMENT_ID && (
        <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />
      )}
    </html>
  )
}
