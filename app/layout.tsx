// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Echtzeiteinkauf — Ihre Einkäufe in 2 Stunden geliefert',
  description: 'Bestellen Sie bei LIDL, ALDI, REWE und mehr. Persönliche Shopper kaufen und liefern innerhalb von 2 Stunden.',
  keywords: 'Lebensmittellieferung, Supermarkt, Lieferservice, Nürnberg, Fürth',
  openGraph: {
    title: 'Echtzeiteinkauf',
    description: 'Ihre Einkäufe in 2 Stunden geliefert',
    url: 'https://echtzeiteinkauf.com',
    siteName: 'Echtzeiteinkauf',
    locale: 'de_DE',
    type: 'website',
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={inter.variable}>
      <body className="font-sans antialiased bg-white text-gray-900">
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  )
}
