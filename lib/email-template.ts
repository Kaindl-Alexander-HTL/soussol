// HTML-Bausteine für Mails im SOUS SOL-Look.
//
// Mailclients sind kein Browser: kein externes CSS, keine Webfonts (Gmail
// entfernt @font-face), Outlook rendert mit Word. Deshalb hier durchgehend
// Tabellen-Layout, ausschließlich Inline-Styles und Hex-Farben statt rgba().
//
// Die Farben sind die der Website, auf #0A0A0A ausgerechnet:
//   ash   rgba(255,255,255,.78) → #C9C9C9
//   smoke rgba(255,255,255,.55) → #919191
//   mist  rgba(255,255,255,.30) → #545454
//
// Schriften: Cormorant Garamond lässt sich in Mails nicht laden, Georgia
// kursiv kommt der editorialen Anmutung am nächsten. Fließtext bewusst in
// einer System-Sans statt Mono — in Mails ist Lesbarkeit wichtiger als die
// exakte Kopie der Website-Typo. Labels bleiben gesperrt in Mono.

const INK = '#0A0A0A'
const PAPER = '#F2EDE3'
const ASH = '#C9C9C9'
const SMOKE = '#919191'
const MIST = '#545454'
const HAIRLINE = '#1E1E1E'

const SERIF = "Georgia, 'Times New Roman', Times, serif"
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
const MONO = "SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace"

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Gesperrtes Kleinlabel, z.B. "NAME" oder "SOUS SOL". */
export function label(value: string, color: string = SMOKE): string {
  return `<p style="margin:0;font-family:${MONO};font-size:10px;letter-spacing:0.28em;text-transform:uppercase;color:${color};">${escapeHtml(value)}</p>`
}

/** Große Serif-Kursive — das Gestaltungsmerkmal der Website. */
export function heading(value: string): string {
  return `<h1 style="margin:0;font-family:${SERIF};font-style:italic;font-weight:400;font-size:34px;line-height:1.15;color:${PAPER};">${escapeHtml(value)}</h1>`
}

export function paragraph(value: string, color: string = ASH): string {
  return `<p style="margin:0 0 18px 0;font-family:${SANS};font-size:15px;font-weight:300;line-height:1.75;color:${color};">${escapeHtml(value).replace(/\n/g, '<br />')}</p>`
}

export function divider(): string {
  return `<div style="height:1px;line-height:1px;font-size:0;background-color:${HAIRLINE};">&nbsp;</div>`
}

/** Beschriftetes Datenfeld für die Admin-Mail. */
export function field(name: string, value: string): string {
  return `
    <tr>
      <td style="padding:0 0 14px 0;">
        ${label(name, MIST)}
        <p style="margin:4px 0 0 0;font-family:${SANS};font-size:15px;font-weight:300;line-height:1.6;color:${ASH};">${escapeHtml(value).replace(/\n/g, '<br />')}</p>
      </td>
    </tr>`
}

/** Heller Button auf dunklem Grund — bulletproof über Tabelle, kein <button>. */
export function button(href: string, text: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 0 0;">
      <tr>
        <td style="background-color:${PAPER};">
          <a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 26px;font-family:${MONO};font-size:11px;letter-spacing:0.24em;text-transform:uppercase;color:${INK};text-decoration:none;">${escapeHtml(text)}&nbsp;&rarr;</a>
        </td>
      </tr>
    </table>`
}

/** Monospace-Kasten, z.B. für einen Zugangscode. */
export function codeBlock(value: string): string {
  return `<p style="margin:0;padding:16px 18px;background-color:#141414;font-family:${MONO};font-size:15px;letter-spacing:0.06em;color:${PAPER};word-break:break-all;">${escapeHtml(value)}</p>`
}

/**
 * Rahmen um den Inhalt: Wortmarke oben, Haarlinien, Footer.
 * `preheader` ist die Vorschauzeile in der Inbox — sichtbar in der Liste,
 * unsichtbar in der geöffneten Mail.
 */
export function shell({
  preheader,
  content,
}: {
  preheader: string
  content: string
}): string {
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="dark" />
<meta name="supported-color-schemes" content="dark" />
<title>SOUS SOL</title>
</head>
<body style="margin:0;padding:0;background-color:${INK};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;">${escapeHtml(preheader)}</div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${INK}" style="background-color:${INK};">
    <tr>
      <td align="center" style="padding:48px 20px;">

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px;">

          <!-- Wortmarke -->
          <tr>
            <td style="padding:0 0 34px 0;">
              <p style="margin:0;font-family:${SERIF};font-size:11px;letter-spacing:0.42em;text-transform:uppercase;color:${SMOKE};">SOUS SOL</p>
            </td>
          </tr>

          <tr><td>${divider()}</td></tr>

          <!-- Inhalt -->
          <tr>
            <td style="padding:38px 0 0 0;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:44px 0 0 0;">
              ${divider()}
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:18px;">
                <tr>
                  <td align="left" style="font-family:${MONO};font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:${MIST};">
                    Linz
                  </td>
                  <td align="right" style="font-family:${MONO};font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:${MIST};">
                    soussol-archive.com
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
