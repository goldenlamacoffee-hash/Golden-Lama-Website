import type { Metadata } from 'next'
import { Raleway, Exo_2, Pacifico } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

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

export const metadata: Metadata = {
  title: 'Golden Lama Coffee | Remeselná káva na kolesách',
  description: 'Zažite ručne pripravenú špeciálnu kávu z nášho mobilného kávového bicykla. Nájdete nás na miestnych trhoch, podujatiach a po celom meste.',
  robots: {
    index: false,
    follow: false,
  },
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="sk" className={`${raleway.variable} ${exo2.variable} ${pacifico.variable}`}>
      <body className="font-body antialiased bg-background">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
