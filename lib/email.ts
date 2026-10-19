import { Resend } from 'resend'
import { formatVienna } from '@/lib/date-time'
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

  const dateStr = formatVienna(startsAt, 'dd MMMM yyyy, HH:mm')
  const subject = isWaitlist
    ? `[Waitlist] ${guestName} — ${eventTitle}`
    : `New registration: ${guestName} — ${eventTitle}`

  const lines = [
    isWaitlist ? 'WAITLIST' : 'NEW REGISTRATION',
    '',
    `Name:      ${guestName}`,
  ]
  if (instagramHandle) lines.push(`Instagram: @${instagramHandle}`)
  if (stravaHandle)    lines.push(`Strava:    ${stravaHandle}`)
  if (phone)           lines.push(`Phone:     ${phone}`)
  if (email)           lines.push(`Email:     ${email}`)
  lines.push(`Event:     ${eventTitle}`)
  lines.push(`Date:      ${dateStr}`)

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
    `Hello ${name},`,
    '',
    'you’re in. Use this link to enter:',
    link,
    '',
    'If the link does not work, enter this code on the site:',
    accessToken,
    '',
    'Save the code in your notes or password manager so you can use it again later.',
    '',
    'See you soon.',
    '',
    'SOUS SOL — Linz',
  ].join('\n')

  const html = shell({
    preheader: 'You’re in.',
    content: [
      heading('You’re in.'),
      `<div style="height:26px;line-height:26px;font-size:0;">&nbsp;</div>`,
      paragraph(`Hello ${name},`),
      paragraph('you’re now part of the Outer Circle. One click and you’re in.'),
      `<div style="height:6px;line-height:6px;font-size:0;">&nbsp;</div>`,
      button(link, 'Enter'),
      `<div style="height:34px;line-height:34px;font-size:0;">&nbsp;</div>`,
      label('If the button does not work'),
      `<div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div>`,
      paragraph('Enter this code on the site:'),
      codeBlock(accessToken),
      `<div style="height:14px;line-height:14px;font-size:0;">&nbsp;</div>`,
      paragraph(
        'Save the code in your notes or password manager so you can use it again later.'
      ),
      `<div style="height:26px;line-height:26px;font-size:0;">&nbsp;</div>`,
      label('See you soon'),
    ].join('\n'),
  })

  await send({
    from: 'SOUS SOL <noreply@soussol-archive.com>',
    to: email,
    subject: 'Welcome to SOUS SOL',
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
    `Hello ${name},`,
    '',
    'here are your access details again:',
    link,
    '',
    'Or enter this code on the site:',
    accessToken,
    '',
    'Save the code in your notes or password manager so you can use it again later.',
    '',
    'See you soon.',
    '',
    'SOUS SOL — Linz',
  ].join('\n')

  const html = shell({
    preheader: 'Here are your access details.',
    content: [
      heading('Your access.'),
      `<div style="height:26px;line-height:26px;font-size:0;">&nbsp;</div>`,
      paragraph(`Hello ${name},`),
      paragraph('here are your access details again. One click and you’re in.'),
      `<div style="height:6px;line-height:6px;font-size:0;">&nbsp;</div>`,
      button(link, 'Enter'),
      `<div style="height:34px;line-height:34px;font-size:0;">&nbsp;</div>`,
      label('If the button does not work'),
      `<div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div>`,
      paragraph('Enter this code on the site:'),
      codeBlock(accessToken),
      `<div style="height:14px;line-height:14px;font-size:0;">&nbsp;</div>`,
      paragraph(
        'Save the code in your notes or password manager so you can use it again later.'
      ),
      `<div style="height:26px;line-height:26px;font-size:0;">&nbsp;</div>`,
      label('See you soon'),
    ].join('\n'),
  })

  await send({
    from: 'SOUS SOL <noreply@soussol-archive.com>',
    to: email,
    subject: 'Your access — SOUS SOL',
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
    `Hello ${name},`,
    '',
    'your access details have been renewed. The old link and code no longer work.',
    '',
    'Enter here:',
    link,
    '',
    'Or enter this code on the site:',
    accessToken,
    '',
    'Save the code in your notes or password manager so you can use it again later.',
    '',
    'See you soon.',
    '',
    'SOUS SOL — Linz',
  ].join('\n')

  const html = shell({
    preheader: 'Your access was renewed.',
    content: [
      heading('New access.'),
      `<div style="height:26px;line-height:26px;font-size:0;">&nbsp;</div>`,
      paragraph(`Hello ${name},`),
      paragraph(
        'Your access was renewed. The old link and code no longer work.'
      ),
      `<div style="height:6px;line-height:6px;font-size:0;">&nbsp;</div>`,
      button(link, 'Enter'),
      `<div style="height:34px;line-height:34px;font-size:0;">&nbsp;</div>`,
      label('If the button does not work'),
      `<div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div>`,
      paragraph('Enter this code on the site:'),
      codeBlock(accessToken),
      `<div style="height:14px;line-height:14px;font-size:0;">&nbsp;</div>`,
      paragraph(
        'Save the code in your notes or password manager so you can use it again later.'
      ),
      `<div style="height:26px;line-height:26px;font-size:0;">&nbsp;</div>`,
      label('See you soon'),
    ].join('\n'),
  })

  await send({
    from: 'SOUS SOL <noreply@soussol-archive.com>',
    to: email,
    subject: 'Your new access — SOUS SOL',
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
    'NEW APPLICATION',
    '',
    `Name:    ${name}`,
    `Email:   ${email}`,
  ]
  if (message) {
    lines.push('', 'Message:', message)
  }
  lines.push('', `Accept or reject: ${siteUrl}/admin`)

  const html = shell({
    preheader: `${name} — ${email}`,
    content: [
      heading('New application'),
      `<div style="height:30px;line-height:30px;font-size:0;">&nbsp;</div>`,
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">',
      field('Name', name),
      field('Email', email),
      message ? field('Message', message) : '',
      '</table>',
      `<div style="height:14px;line-height:14px;font-size:0;">&nbsp;</div>`,
      button(`${siteUrl}/admin`, 'Open admin'),
    ].join('\n'),
  })

  await send({
    from: 'SOUS SOL <noreply@soussol-archive.com>',
    to: process.env.ADMIN_EMAIL!,
    replyTo: email,
    subject: `New application: ${name}`,
    text: lines.join('\n'),
    html,
  })
}

// Bestätigung an den Bewerber — damit niemand rätselt, ob das Formular ging.
export async function sendApplicationConfirmation(params: ApplicationEmailParams) {
  const { name, email } = params

  const text = [
    `Hello ${name},`,
    '',
    'we received your application.',
    '',
    'Tim will review it. If it is a fit, we will send access details with a link and code.',
    '',
    'Until then.',
    '',
    'SOUS SOL — Linz',
  ].join('\n')

  const html = shell({
    preheader: 'We received your application.',
    content: [
      heading('Received.'),
      `<div style="height:26px;line-height:26px;font-size:0;">&nbsp;</div>`,
      paragraph(`Hello ${name},`),
      paragraph('we received your application. Tim will review it.'),
      paragraph(
        'If it is a fit, we will send access details with a link and code.'
      ),
      `<div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div>`,
      label('Until then'),
    ].join('\n'),
  })

  await send({
    from: 'SOUS SOL <noreply@soussol-archive.com>',
    to: email,
    subject: 'Your application to SOUS SOL',
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

  const dateStr = formatVienna(startsAt, 'dd MMMM yyyy, HH:mm')
  const amountStr = (totalAmountCents / 100).toFixed(2).replace('.', ',')

  const text = [
    `Hello ${buyerName},`,
    '',
    `your ticket for ${eventTitle} is confirmed.`,
    '',
    `Ticket:  ${ticketTypeName}`,
    `Quantity: ${quantity}`,
    `Amount:   ${amountStr} €`,
    `Date:     ${dateStr}`,
    '',
    'See you there.',
  ].join('\n')

  await send({
    from: 'SOUS SOL <noreply@soussol-archive.com>',
    to: buyerEmail,
    subject: `Ticket confirmed — ${eventTitle}`,
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
    ? `⚠️ OVERBOOKED — ${buyerName} — ${eventTitle}`
    : `New ticket sale: ${buyerName} — ${eventTitle}`

  const lines = [
    overbooked ? '⚠️ OVERBOOKED — REVIEW MANUALLY' : 'NEW TICKET SALE',
    '',
    `Buyer:   ${buyerName}`,
    `Email:   ${buyerEmail}`,
    `Event:   ${eventTitle}`,
    `Ticket:  ${ticketTypeName}`,
    `Quantity: ${quantity}`,
    `Amount:   ${amountStr} €`,
  ]

  await send({
    from: 'SOUS SOL <noreply@soussol-archive.com>',
    to: process.env.ADMIN_EMAIL!,
    subject,
    text: lines.join('\n'),
  })
}
