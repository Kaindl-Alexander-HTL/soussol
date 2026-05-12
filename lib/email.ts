import { Resend } from 'resend'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

const resend = new Resend(process.env.RESEND_API_KEY)

type RegistrationEmailParams = {
  guestName: string
  instagramHandle: string
  eventTitle: string
  startsAt: string
  isWaitlist: boolean
}

export async function sendRegistrationNotification(params: RegistrationEmailParams) {
  const { guestName, instagramHandle, eventTitle, startsAt, isWaitlist } = params

  const dateStr = format(new Date(startsAt), 'dd. MMMM yyyy, HH:mm', { locale: de })
  const subject = isWaitlist
    ? `[Warteliste] ${guestName} — ${eventTitle}`
    : `Neue Anmeldung: ${guestName} — ${eventTitle}`

  const text = [
    isWaitlist ? 'WARTELISTE' : 'NEUE ANMELDUNG',
    '',
    `Name:      ${guestName}`,
    `Instagram: @${instagramHandle}`,
    `Event:     ${eventTitle}`,
    `Datum:     ${dateStr}`,
  ].join('\n')

  await resend.emails.send({
    from: 'SOUS SOL <noreply@soussol-archive.com>',
    to: process.env.ADMIN_EMAIL!,
    subject,
    text,
  })
}
