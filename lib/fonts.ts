import {
  Cormorant_Garamond,
  DM_Mono,
  Caveat,
  Playfair_Display,
  Inter,
  Instrument_Serif,
  Space_Grotesk,
  Libre_Baskerville,
  JetBrains_Mono,
} from 'next/font/google'

// Kuratierte Font-Paare. Alle werden über next/font zur Build-Zeit self-hosted —
// zur Laufzeit geht kein Request an Google (DSGVO) und es gibt keinen Layout-Shift.
//
// preload nur für das Default-Paar: sonst würde der Browser Preload-Links für
// alle Paare bekommen und Schriften laden, die gar nicht gerendert werden. Die
// übrigen Paare holt er erst, wenn Tim sie aktiviert hat (display: 'swap').
//
// Das Design setzt stark auf `font-serif italic` — deshalb hat jede Serif hier
// einen echten Kursiv-Schnitt, keinen synthetisch schräggestellten.

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  weight: ['300', '400', '500', '600'],
  display: 'swap',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-dm-mono',
  weight: ['300', '400', '500'],
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
  display: 'swap',
  preload: false,
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: false,
})

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-instrument',
  weight: ['400'],
  display: 'swap',
  preload: false,
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
  preload: false,
})

const libreBaskerville = Libre_Baskerville({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-libre',
  weight: ['400', '700'],
  display: 'swap',
  preload: false,
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-jetbrains',
  display: 'swap',
  preload: false,
})

// Handschrift bleibt fix — sie ist ein Akzent, kein Teil des Schriftsystems.
const caveat = Caveat({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-hand',
})

export type FontThemeId = 'original' | 'editorial' | 'modern' | 'raw'

export type FontTheme = {
  id: FontThemeId
  label: string
  note: string
  serif: string
  sans: string
}

export const FONT_THEMES: FontTheme[] = [
  {
    id: 'original',
    label: 'Original',
    note: 'Cormorant Garamond · DM Mono',
    serif: 'var(--font-cormorant)',
    sans: 'var(--font-dm-mono)',
  },
  {
    id: 'editorial',
    label: 'Editorial',
    note: 'Playfair Display · Inter',
    serif: 'var(--font-playfair)',
    sans: 'var(--font-inter)',
  },
  {
    id: 'modern',
    label: 'Modern',
    note: 'Instrument Serif · Space Grotesk',
    serif: 'var(--font-instrument)',
    sans: 'var(--font-space-grotesk)',
  },
  {
    id: 'raw',
    label: 'Raw',
    note: 'Libre Baskerville · JetBrains Mono',
    serif: 'var(--font-libre)',
    sans: 'var(--font-jetbrains)',
  },
]

export const DEFAULT_FONT_THEME = FONT_THEMES[0]

export function resolveFontTheme(id: unknown): FontTheme {
  return FONT_THEMES.find((t) => t.id === id) ?? DEFAULT_FONT_THEME
}

// Alle Font-Variablen zusammen — kommen auf <html>, damit jedes Paar per
// CSS-Variable erreichbar ist. Welches aktiv ist, entscheidet das Layout.
export const fontVariables = [
  cormorant.variable,
  dmMono.variable,
  playfair.variable,
  inter.variable,
  instrumentSerif.variable,
  spaceGrotesk.variable,
  libreBaskerville.variable,
  jetbrainsMono.variable,
  caveat.variable,
].join(' ')
