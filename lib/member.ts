import 'server-only'
import { randomBytes } from 'crypto'
import { cookies } from 'next/headers'
import { verifyCookie } from '@/lib/access-cookie'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { MemberRole } from '@/lib/types'

export type CurrentMember = { id: string; name: string; email: string; role: MemberRole }

const TOKEN_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

// 32 Zeichen aus [A-Za-z0-9]. Nicht als kryptografisches Schlüsselmaterial gedacht,
// sondern als praktisch unerratbarer Zugangs-Token; die unique-Constraint fängt
// theoretische Kollisionen ab.
export function generateAccessToken(): string {
  const bytes = randomBytes(32)
  let token = ''
  for (let i = 0; i < bytes.length; i++) {
    token += TOKEN_ALPHABET[bytes[i] % TOKEN_ALPHABET.length]
  }
  return token
}

export async function getCurrentMember(): Promise<CurrentMember | null> {
  const cookieStore = await cookies()
  const cookieValue = cookieStore.get('sous_pass')?.value
  if (!cookieValue) return null

  const { valid, memberId } = verifyCookie(cookieValue)
  if (!valid || !memberId) return null

  const { data } = await supabaseAdmin
    .from('members')
    .select('id, name, email, role, is_active')
    .eq('id', memberId)
    .single()

  if (!data || !data.is_active) return null

  return { id: data.id, name: data.name, email: data.email, role: data.role as MemberRole }
}

export function hasArchiveAccess(member: CurrentMember | null): boolean {
  return member !== null && (member.role === 'outer' || member.role === 'inner')
}

export async function getArchiveClient() {
  return hasArchiveAccess(await getCurrentMember()) ? supabaseAdmin : null
}
