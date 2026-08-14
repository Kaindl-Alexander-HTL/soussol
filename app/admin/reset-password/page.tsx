import type { Metadata } from 'next'
import { ResetPasswordForm } from '@/components/admin/ResetPasswordForm'

export const metadata: Metadata = {
  title: 'Passwort — SOUS SOL Admin',
  robots: { index: false, follow: false },
}

// Bewusst außerhalb von (protected): Wer hier landet, hat nur eine
// Recovery-Session und soll gerade erst ein Passwort setzen.
export default function ResetPasswordPage() {
  return <ResetPasswordForm />
}
