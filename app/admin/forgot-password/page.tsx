import type { Metadata } from 'next'
import { ForgotPasswordForm } from '@/components/admin/ForgotPasswordForm'

export const metadata: Metadata = {
  title: 'Passwort vergessen — SOUS SOL Admin',
  robots: { index: false, follow: false },
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />
}
