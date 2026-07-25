import { Resend } from 'resend'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

const resend = new Resend(process.env.RESEND_API_KEY)

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

  await resend.emails.send({
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
    'Bis bald.',
  ].join('\n')

  await resend.emails.send({
    from: 'SOUS SOL <noreply@soussol-archive.com>',
    to: email,
    subject: 'Willkommen bei SOUS SOL',
    text,
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

  await resend.emails.send({
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

  await resend.emails.send({
    from: 'SOUS SOL <noreply@soussol-archive.com>',
    to: process.env.ADMIN_EMAIL!,
    subject,
    text: lines.join('\n'),
  })
}
