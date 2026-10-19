import type { Metadata, Viewport } from 'next'
import { fontVariables, resolveFontTheme } from '@/lib/fonts'
import { getSettings } from '@/lib/settings'
import { GrainOverlay } from '@/components/GrainOverlay'
import { PageTransition } from '@/components/PageTransition'
import { RecoveryRedirect } from '@/components/RecoveryRedirect'
import './globals.css'

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
    'Underground sports community in Linz. Running, road cycling, volleyball. Built in the basement. Raised in the streets.',
  metadataBase: new URL('https://soussol-archive.com'),
  alternates: { canonical: '/' },
  openGraph: {
    title: 'SOUS SOL',
    description: 'Underground Sport Community — Linz.',
    url: 'https://soussol-archive.com',
    siteName: 'SOUS SOL',
    locale: 'en_AT',
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

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Welches Font-Paar aktiv ist, entscheidet Tim im Admin. Alle Paare liegen als
  // CSS-Variablen an <html>; hier wird nur umgehängt, worauf --font-serif und
  // --font-sans zeigen — die Tailwind-Klassen im ganzen Projekt bleiben gleich.
  const settings = await getSettings(['font_theme'])
  const fontTheme = resolveFontTheme(settings.font_theme)

  return (
    <html
      lang="en"
      className={`${fontVariables} h-full`}
      style={
        {
          '--font-serif': fontTheme.serif,
          '--font-sans': fontTheme.sans,
        } as React.CSSProperties
      }
    >
      <body className="min-h-full font-sans font-light text-ash antialiased">
        <RecoveryRedirect />
        <GrainOverlay />
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  )
}
