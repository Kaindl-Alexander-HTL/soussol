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
