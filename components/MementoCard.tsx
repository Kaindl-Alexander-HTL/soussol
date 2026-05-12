import type { Memento } from '@/lib/types'

export function MementoCard({ memento }: { memento: Memento }) {
  switch (memento.kind) {
    case 'polaroid':
      return <Polaroid m={memento} />
    case 'note':
      return <Note m={memento} />
    case 'stamp':
      return <Stamp m={memento} />
    case 'scan':
      return <Scan m={memento} />
    case 'strava':
      return <StravaCard m={memento} />
    default:
      return <OtherCard m={memento} />
  }
}

// ─── Polaroid ────────────────────────────────────────────────────────────────

function Polaroid({ m }: { m: Memento }) {
  return (
    <div
      className="flex flex-col bg-paper shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
      style={{ width: 200, padding: '10px 10px 36px' }}
    >
      {/* Photo area */}
      <div
        className="overflow-hidden bg-bone"
        style={{ width: 180, height: 180 }}
      >
        {m.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={m.image_url}
            alt={m.caption ?? ''}
            className="h-full w-full object-cover"
            style={{ filter: 'grayscale(1) contrast(1.1)' }}
            loading="eager"
            draggable={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="font-sans text-[9px] tracking-[0.2em] text-ink/20 uppercase">
              {m.date_label ?? '—'}
            </span>
          </div>
        )}
      </div>

      {/* Caption + date */}
      <div className="mt-2 text-center">
        {m.caption && (
          <p className="font-hand text-[15px] leading-snug text-ink">{m.caption}</p>
        )}
        {m.date_label && (
          <p className="mt-0.5 font-hand text-[11px] text-ink/40">{m.date_label}</p>
        )}
      </div>
    </div>
  )
}

// ─── Note ─────────────────────────────────────────────────────────────────────

function Note({ m }: { m: Memento }) {
  return (
    <div
      className="bg-paper shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
      style={{ width: 190, minHeight: 160, padding: '20px 18px' }}
    >
      {m.caption && (
        <p className="font-hand text-[20px] leading-tight text-ink">{m.caption}</p>
      )}
      {m.body && (
        <p className="mt-2 font-hand text-[14px] leading-snug text-ink/70">{m.body}</p>
      )}
      {m.date_label && (
        <p className="mt-4 font-hand text-[11px] text-ink/35">{m.date_label}</p>
      )}
    </div>
  )
}

// ─── Stamp ────────────────────────────────────────────────────────────────────

function Stamp({ m }: { m: Memento }) {
  return (
    <div
      className="flex items-center justify-center"
      style={{ width: 150, height: 150 }}
    >
      {/* Outer ring */}
      <div
        className="flex h-full w-full items-center justify-center rounded-full"
        style={{
          border: '3px solid rgba(245,241,232,0.7)',
          boxShadow: '0 0 0 6px rgba(245,241,232,0.15)',
          opacity: 0.85,
        }}
      >
        <div className="flex flex-col items-center gap-1 p-4 text-center">
          {m.caption && (
            <p
              className="font-serif italic text-paper"
              style={{ fontSize: 15, lineHeight: 1.2 }}
            >
              {m.caption}
            </p>
          )}
          {m.date_label && (
            <p
              className="font-sans uppercase text-paper/50"
              style={{ fontSize: 9, letterSpacing: '0.25em' }}
            >
              {m.date_label}
            </p>
          )}
          <div
            className="mt-1 w-10 border-t border-paper/30"
          />
          <p
            className="font-sans uppercase text-paper/40"
            style={{ fontSize: 8, letterSpacing: '0.3em' }}
          >
            SOUS SOL
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Scan (photographed paper) ────────────────────────────────────────────────

function Scan({ m }: { m: Memento }) {
  return (
    <div
      className="bg-bone"
      style={{
        width: 210,
        minHeight: 260,
        padding: '22px 20px',
        boxShadow:
          'inset 0 0 40px rgba(0,0,0,0.12), 0 6px 28px rgba(0,0,0,0.55)',
      }}
    >
      {m.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={m.image_url}
          alt={m.caption ?? ''}
          className="mb-3 w-full object-cover"
          style={{ filter: 'grayscale(0.4) contrast(1.05) sepia(0.15)' }}
          loading="eager"
          draggable={false}
        />
      ) : (
        /* Lined paper effect */
        <div className="mb-3" style={{ height: 140 }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="border-b border-ink/10"
              style={{ height: 20 }}
            />
          ))}
        </div>
      )}
      {m.caption && (
        <p className="font-hand text-[14px] leading-snug text-ink/80">{m.caption}</p>
      )}
      {m.date_label && (
        <p className="mt-2 font-hand text-[11px] text-ink/40">{m.date_label}</p>
      )}
    </div>
  )
}

// ─── Strava ───────────────────────────────────────────────────────────────────

function StravaCard({ m }: { m: Memento }) {
  return (
    <div
      className="border border-white/10 bg-ink"
      style={{ width: 210, padding: '16px 18px' }}
    >
      <div className="mb-3 flex items-center gap-2">
        <div
          className="h-px flex-1 bg-white/10"
        />
        <span className="font-sans text-[8px] tracking-[0.35em] text-white/20 uppercase">
          Strava
        </span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      {m.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={m.image_url}
          alt={m.caption ?? ''}
          className="mb-3 w-full object-cover"
          style={{ filter: 'grayscale(1) contrast(1.15)', height: 100 }}
          loading="eager"
          draggable={false}
        />
      )}

      {m.caption && (
        <p className="font-serif italic text-[17px] leading-tight text-paper">{m.caption}</p>
      )}
      {m.body && (
        <p className="mt-2 whitespace-pre-line font-sans text-[11px] leading-relaxed text-mist">
          {m.body}
        </p>
      )}
      {m.date_label && (
        <p className="mt-3 font-sans text-[10px] text-white/20">{m.date_label}</p>
      )}
    </div>
  )
}

// ─── Other ────────────────────────────────────────────────────────────────────

function OtherCard({ m }: { m: Memento }) {
  return (
    <div
      className="border border-white/8 bg-ink/80"
      style={{ width: 190, padding: '16px 16px' }}
    >
      {m.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={m.image_url}
          alt={m.caption ?? ''}
          className="mb-3 w-full object-cover"
          style={{ filter: 'grayscale(1)', height: 120 }}
          loading="eager"
          draggable={false}
        />
      )}
      {m.caption && (
        <p className="font-serif italic text-[16px] text-paper">{m.caption}</p>
      )}
      {m.date_label && (
        <p className="mt-1 font-sans text-[10px] text-mist">{m.date_label}</p>
      )}
    </div>
  )
}
