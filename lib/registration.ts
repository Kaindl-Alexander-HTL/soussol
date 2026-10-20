import { z } from 'zod'

// Signed-in members only send the event: name and email come from their
// member profile on the server, so the body may not carry them.
const memberSchema = z.strictObject({
  event_id: z.guid(),
  as_member: z.literal(true),
})

const guestSchema = z.object({
  event_id: z.guid(),
  // A member request must never fall through to the guest shape.
  as_member: z.never().optional(),
  guest_name: z.string().min(1).max(200),
  instagram_handle: z.string().max(100).transform((v) => v.replace(/^@/, '')).optional(),
  strava_handle: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().max(200).optional(),
  notes: z.string().max(1000).optional(),
}).refine(
  (d) => d.instagram_handle || d.strava_handle || d.phone || d.email,
  { message: 'Provide at least one contact method.' }
)

export const registrationSchema = z.union([memberSchema, guestSchema])
export type GuestRegistration = z.infer<typeof guestSchema>

export function findRegistrationByEmail<T extends { email: string | null }>(
  registrations: T[],
  email: string,
): T | undefined {
  const wanted = email.trim().toLowerCase()
  return registrations.find((r) => r.email?.trim().toLowerCase() === wanted)
}
