import { Resend } from 'resend'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import {
  shell,
  heading,
  paragraph,
  label,
  field,
  button,
  codeBlock,
} from '@/lib/email-template'

const resend = new Resend(process.env.RESEND_API_KEY)

type EmailPayload = Parameters<typeof resend.emails.send>[0]

// resend.emails.send() wirft NICHT, sondern liefert { data, error }. Ohne diese
// Prüfung verschwindet jeder Versandfehler lautlos — ein .catch() am Aufrufer
// würde nie feuern. Hier wird daraus eine echte Exception, damit die Aufrufer
// den Fehler sehen und loggen können.
async function send(payload: EmailPayload) {
  const { error } = await resend.emails.send(payload)
  if (error) {
    throw new Error(`${error.name}: ${error.message}`)
  }
}

type RegistrationEmailParams = {
  guestName: string
  instagramHandle?: string
  stravaHandle?: string
  phone?: string
  email?: string
  eventTitle: string
  startsAt: string
  isWaitlist: boolean
}

export async function sendRegistrationNotification(params: RegistrationEmailParams) {
  const { guestName, instagramHandle, stravaHandle, phone, email, eventTitle, startsAt, isWaitlist } = params

  const dateStr = format(new Date(startsAt), 'dd. MMMM yyyy, HH:mm', { locale: de })
  const subject = isWaitlist
    ? `[Warteliste] ${guestName} — ${eventTitle}`
    : `Neue Anmeldung: ${guestName} — ${eventTitle}`

  const lines = [
    isWaitlist ? 'WARTELISTE' : 'NEUE ANMELDUNG',
    '',
    `Name:      ${guestName}`,
  ]
  if (instagramHandle) lines.push(`Instagram: @${instagramHandle}`)
  if (stravaHandle)    lines.push(`Strava:    ${stravaHandle}`)
  if (phone)           lines.push(`Telefon:   ${phone}`)
  if (email)           lines.push(`E-Mail:    ${email}`)
  lines.push(`Event:     ${eventTitle}`)
  lines.push(`Datum:     ${dateStr}`)

  const text = lines.join('\n')

  await send({
    from: 'SOUS SOL <noreply@soussol-archive.com>',
    to: process.env.ADMIN_EMAIL!,
    subject,
    text,
  })
}

type MemberInviteParams = {
  name: string
  email: string
  accessToken: string
}

export async function sendMemberInvite(params: MemberInviteParams) {
  const { name, email, accessToken } = params

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sous.club'
  const link = `${siteUrl}/api/enter?token=${accessToken}`

  const text = [
    `Hallo ${name},`,
    '',
    'du bist dabei. Über diesen Link kommst du rein:',
    link,
    '',
    'Falls der Link nicht funktioniert, kannst du diesen Code auf der Seite eingeben:',
    accessToken,
    '',
    'Speichere dir den Code am besten in deinen Notizen oder einem Passwortmanager,',
    'damit du ihn später einfach wieder kopieren kannst.',
    '',
    'Bis bald.',
    '',
    'SOUS SOL — Linz',
  ].join('\n')

  const html = shell({
    preheader: 'Du bist dabei.',
    content: [
      heading('Du bist dabei.'),
      `<div style="height:26px;line-height:26px;font-size:0;">&nbsp;</div>`,
      paragraph(`Hallo ${name},`),
      paragraph('ab jetzt gehörst du zum Outer Circle. Ein Klick, und du bist drin.'),
      `<div style="height:6px;line-height:6px;font-size:0;">&nbsp;</div>`,
      button(link, 'Reinkommen'),
      `<div style="height:34px;line-height:34px;font-size:0;">&nbsp;</div>`,
      label('Falls der Button nicht geht'),
      `<div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div>`,
      paragraph('Gib diesen Code auf der Seite ein:'),
      codeBlock(accessToken),
      `<div style="height:14px;line-height:14px;font-size:0;">&nbsp;</div>`,
      paragraph(
        'Speichere dir den Code am besten in deinen Notizen oder einem Passwortmanager, damit du ihn später einfach wieder kopieren kannst.'
      ),
      `<div style="height:26px;line-height:26px;font-size:0;">&nbsp;</div>`,
      label('Bis bald'),
    ].join('\n'),
  })

  await send({
    from: 'SOUS SOL <noreply@soussol-archive.com>',
    to: email,
    subject: 'Willkommen bei SOUS SOL',
    text,
    html,
  })
}

// Für "Zugang verloren": schickt den bestehenden Zugang nochmal. Kein neuer
// Token — der alte Link bleibt gültig, sonst würde ein Fremder, der nur die
// Adresse kennt, dem Mitglied den Zugang unter den Füßen wegziehen.
export async function sendMemberAccessReminder(params: MemberInviteParams) {
  const { name, email, accessToken } = params

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sous.club'
  const link = `${siteUrl}/api/enter?token=${accessToken}`

  const text = [
    `Hallo ${name},`,
    '',
    'hier ist dein Zugang nochmal:',
    link,
    '',
    'Oder mit diesem Code auf der Seite:',
    accessToken,
    '',
    'Speichere dir den Code am besten in deinen Notizen oder einem Passwortmanager,',
    'damit du ihn später einfach wieder kopieren kannst.',
    '',
    'Bis bald.',
    '',
    'SOUS SOL — Linz',
  ].join('\n')

  const html = shell({
    preheader: 'Hier ist dein Zugang.',
    content: [
      heading('Dein Zugang.'),
      `<div style="height:26px;line-height:26px;font-size:0;">&nbsp;</div>`,
      paragraph(`Hallo ${name},`),
      paragraph('hier ist dein Zugang nochmal. Ein Klick, und du bist drin.'),
      `<div style="height:6px;line-height:6px;font-size:0;">&nbsp;</div>`,
      button(link, 'Reinkommen'),
      `<div style="height:34px;line-height:34px;font-size:0;">&nbsp;</div>`,
      label('Falls der Button nicht geht'),
      `<div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div>`,
      paragraph('Gib diesen Code auf der Seite ein:'),
      codeBlock(accessToken),
      `<div style="height:14px;line-height:14px;font-size:0;">&nbsp;</div>`,
      paragraph(
        'Speichere dir den Code am besten in deinen Notizen oder einem Passwortmanager, damit du ihn später einfach wieder kopieren kannst.'
      ),
      `<div style="height:26px;line-height:26px;font-size:0;">&nbsp;</div>`,
      label('Bis bald'),
    ].join('\n'),
  })

  await send({
    from: 'SOUS SOL <noreply@soussol-archive.com>',
    to: email,
    subject: 'Dein Zugang — SOUS SOL',
    text,
    html,
  })
}

// Wenn der Zugang erneuert wird, darf nicht die Willkommens-Mail rausgehen —
// der Empfänger ist ja längst dabei. Wichtig ist hier die Warnung, dass der
// alte Link ab sofort tot ist.
export async function sendMemberAccessRenewed(params: MemberInviteParams) {
  const { name, email, accessToken } = params

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sous.club'
  const link = `${siteUrl}/api/enter?token=${accessToken}`

  const text = [
    `Hallo ${name},`,
    '',
    'dein Zugang wurde erneuert. Der alte Link und der alte Code funktionieren',
    'ab sofort nicht mehr.',
    '',
    'Hier kommst du rein:',
    link,
    '',
    'Oder mit diesem Code auf der Seite:',
    accessToken,
    '',
    'Speichere dir den Code am besten in deinen Notizen oder einem Passwortmanager,',
    'damit du ihn später einfach wieder kopieren kannst.',
    '',
    'Bis bald.',
    '',
    'SOUS SOL — Linz',
  ].join('\n')

  const html = shell({
    preheader: 'Dein Zugang wurde erneuert.',
    content: [
      heading('Neuer Zugang.'),
      `<div style="height:26px;line-height:26px;font-size:0;">&nbsp;</div>`,
      paragraph(`Hallo ${name},`),
      paragraph(
        'dein Zugang wurde erneuert. Der alte Link und der alte Code funktionieren ab sofort nicht mehr.'
      ),
      `<div style="height:6px;line-height:6px;font-size:0;">&nbsp;</div>`,
      button(link, 'Reinkommen'),
      `<div style="height:34px;line-height:34px;font-size:0;">&nbsp;</div>`,
      label('Falls der Button nicht geht'),
      `<div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div>`,
      paragraph('Gib diesen Code auf der Seite ein:'),
      codeBlock(accessToken),
      `<div style="height:14px;line-height:14px;font-size:0;">&nbsp;</div>`,
      paragraph(
        'Speichere dir den Code am besten in deinen Notizen oder einem Passwortmanager, damit du ihn später einfach wieder kopieren kannst.'
      ),
      `<div style="height:26px;line-height:26px;font-size:0;">&nbsp;</div>`,
      label('Bis bald'),
    ].join('\n'),
  })

  await send({
    from: 'SOUS SOL <noreply@soussol-archive.com>',
    to: email,
    subject: 'Dein neuer Zugang — SOUS SOL',
    text,
    html,
  })
}

type ApplicationEmailParams = {
  name: string
  email: string
  message?: string | null
}

// Geht an Tim, sobald sich jemand bewirbt. replyTo steht auf der Adresse des
// Bewerbers — so kann Tim direkt aus dem Mailclient antworten.
export async function sendApplicationNotification(params: ApplicationEmailParams) {
  const { name, email, message } = params
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sous.club'

  const lines = [
    'NEUE BEWERBUNG',
    '',
    `Name:    ${name}`,
    `E-Mail:  ${email}`,
  ]
  if (message) {
    lines.push('', 'Nachricht:', message)
  }
  lines.push('', `Annehmen oder ablehnen: ${siteUrl}/admin`)

  const html = shell({
    preheader: `${name} — ${email}`,
    content: [
      heading('Neue Bewerbung'),
      `<div style="height:30px;line-height:30px;font-size:0;">&nbsp;</div>`,
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">',
      field('Name', name),
      field('E-Mail', email),
      message ? field('Nachricht', message) : '',
      '</table>',
      `<div style="height:14px;line-height:14px;font-size:0;">&nbsp;</div>`,
      button(`${siteUrl}/admin`, 'Im Admin öffnen'),
    ].join('\n'),
  })

  await send({
    from: 'SOUS SOL <noreply@soussol-archive.com>',
    to: process.env.ADMIN_EMAIL!,
    replyTo: email,
    subject: `Neue Bewerbung: ${name}`,
    text: lines.join('\n'),
    html,
  })
}

// Bestätigung an den Bewerber — damit niemand rätselt, ob das Formular ging.
export async function sendApplicationConfirmation(params: ApplicationEmailParams) {
  const { name, email } = params

  const text = [
    `Hallo ${name},`,
    '',
    'deine Bewerbung ist angekommen.',
    '',
    'Tim schaut sie sich an. Wenn es passt, bekommst du von uns einen Zugang —',
    'mit einem Link und einem Code, über den du reinkommst.',
    '',
    'Bis dahin.',
    '',
    'SOUS SOL — Linz',
  ].join('\n')

  const html = shell({
    preheader: 'Deine Bewerbung ist angekommen.',
    content: [
      heading('Angekommen.'),
      `<div style="height:26px;line-height:26px;font-size:0;">&nbsp;</div>`,
      paragraph(`Hallo ${name},`),
      paragraph('deine Bewerbung ist da. Tim schaut sie sich an.'),
      paragraph(
        'Wenn es passt, bekommst du von uns einen Zugang — mit einem Link und einem Code, über den du reinkommst.'
      ),
      `<div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div>`,
      label('Bis dahin'),
    ].join('\n'),
  })

  await send({
    from: 'SOUS SOL <noreply@soussol-archive.com>',
    to: email,
    subject: 'Deine Bewerbung bei SOUS SOL',
    text,
    html,
  })
}

type TicketConfirmationParams = {
  buyerName: string
  buyerEmail: string
  eventTitle: string
  startsAt: string
  ticketTypeName: string
  quantity: number
  totalAmountCents: number
}

export async function sendTicketConfirmation(params: TicketConfirmationParams) {
  const { buyerName, buyerEmail, eventTitle, startsAt, ticketTypeName, quantity, totalAmountCents } = params

  const dateStr = format(new Date(startsAt), 'dd. MMMM yyyy, HH:mm', { locale: de })
  const amountStr = (totalAmountCents / 100).toFixed(2).replace('.', ',')

  const text = [
    `Hallo ${buyerName},`,
    '',
    `dein Ticket für ${eventTitle} ist bestätigt.`,
    '',
    `Ticket:  ${ticketTypeName}`,
    `Menge:   ${quantity}`,
    `Betrag:  ${amountStr} €`,
    `Datum:   ${dateStr}`,
    '',
    'Bis dann.',
  ].join('\n')

  await send({
    from: 'SOUS SOL <noreply@soussol-archive.com>',
    to: buyerEmail,
    subject: `Ticket bestätigt — ${eventTitle}`,
    text,
  })
}

type TicketSaleNotificationParams = {
  buyerName: string
  buyerEmail: string
  eventTitle: string
  ticketTypeName: string
  quantity: number
  totalAmountCents: number
  overbooked: boolean
}

export async function sendTicketSaleNotification(params: TicketSaleNotificationParams) {
  const { buyerName, buyerEmail, eventTitle, ticketTypeName, quantity, totalAmountCents, overbooked } = params

  const amountStr = (totalAmountCents / 100).toFixed(2).replace('.', ',')
  const subject = overbooked
    ? `⚠️ ÜBERBUCHT — ${buyerName} — ${eventTitle}`
    : `Neuer Ticket-Verkauf: ${buyerName} — ${eventTitle}`

  const lines = [
    overbooked ? '⚠️ ÜBERBUCHT — MANUELL PRÜFEN' : 'NEUER TICKET-VERKAUF',
    '',
    `Käufer:  ${buyerName}`,
    `E-Mail:  ${buyerEmail}`,
    `Event:   ${eventTitle}`,
    `Ticket:  ${ticketTypeName}`,
    `Menge:   ${quantity}`,
    `Betrag:  ${amountStr} €`,
  ]

  await send({
    from: 'SOUS SOL <noreply@soussol-archive.com>',
    to: process.env.ADMIN_EMAIL!,
    subject,
    text: lines.join('\n'),
  })
}
