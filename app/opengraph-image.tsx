import { ImageResponse } from 'next/og'

export const alt = 'SOUS SOL — Underground Sport Community Linz'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0A0A0A',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '80px 96px',
        }}
      >
        {/* Grain simulation via pattern */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(ellipse at 20% 80%, rgba(255,255,255,0.03) 0%, transparent 60%)',
          }}
        />

        {/* Wordmark top */}
        <div
          style={{
            fontFamily: 'serif',
            fontSize: 13,
            letterSpacing: '0.4em',
            color: 'rgba(255,255,255,0.3)',
            textTransform: 'uppercase',
            display: 'flex',
          }}
        >
          SOUS SOL
        </div>

        {/* Main text bottom-left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div
            style={{
              fontFamily: 'serif',
              fontStyle: 'italic',
              fontSize: 96,
              color: '#F5F1E8',
              lineHeight: 0.95,
              letterSpacing: '-0.01em',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <span>Built in the</span>
            <span>basement.</span>
          </div>
          <div
            style={{
              fontFamily: 'sans-serif',
              fontSize: 14,
              letterSpacing: '0.3em',
              color: 'rgba(255,255,255,0.35)',
              textTransform: 'uppercase',
              display: 'flex',
            }}
          >
            Underground Sport Community — Linz
          </div>
        </div>

        {/* Divider line */}
        <div
          style={{
            position: 'absolute',
            right: 96,
            top: 80,
            bottom: 80,
            width: 1,
            background: 'rgba(255,255,255,0.06)',
          }}
        />
      </div>
    ),
    { ...size }
  )
}
