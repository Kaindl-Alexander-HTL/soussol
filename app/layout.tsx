import type { Metadata, Viewport } from 'next'
import { Inter, Cormorant_Garamond, Caveat } from 'next/font/google'
import { GrainOverlay } from '@/components/GrainOverlay'
import { Cursor } from '@/components/Cursor'
import { PageTransition } from '@/components/PageTransition'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['300', '400'],
})

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  weight: ['300', '400', '500'],
  variable: '--font-cormorant',
})

const caveat = Caveat({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-caveat',
})

export const viewport: Viewport = {
  themeColor: '#0A0A0A',
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  title: {
    default: 'SOUS SOL',
    template: '%s — SOUS SOL',
  },
  description:
    'Underground Sport Community in Linz. Running, Rennrad, Volleyball. Built in the basement. Raised in the streets.',
  metadataBase: new URL('https://sous.club'),
  alternates: { canonical: '/' },
  openGraph: {
    title: 'SOUS SOL',
    description: 'Underground Sport Community — Linz.',
    url: 'https://sous.club',
    siteName: 'SOUS SOL',
    locale: 'de_AT',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SOUS SOL',
    description: 'Underground Sport Community — Linz.',
  },
  robots: {
    index: true,
    follow: false,
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="de"
      className={`${inter.variable} ${cormorant.variable} ${caveat.variable} h-full`}
    >
      <body className="min-h-full font-sans font-light text-ash antialiased">
        <GrainOverlay />
        <Cursor />
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  )
}
