import type { Metadata, Viewport } from 'next'
import { Inter, Fraunces, Caveat } from 'next/font/google'
import { GrainOverlay } from '@/components/GrainOverlay'
import { PageTransition } from '@/components/PageTransition'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['300', '400'],
})

const fraunces = Fraunces({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
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
  metadataBase: new URL('https://soussol-archive.com'),
  alternates: { canonical: '/' },
  openGraph: {
    title: 'SOUS SOL',
    description: 'Underground Sport Community — Linz.',
    url: 'https://soussol-archive.com',
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
      className={`${inter.variable} ${fraunces.variable} ${caveat.variable} h-full`}
    >
      <body className="min-h-full font-sans font-light text-ash antialiased">
        <GrainOverlay />
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  )
}
