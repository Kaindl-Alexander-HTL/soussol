import type { Metadata } from 'next'
import { ForgotPasswordForm } from '@/components/admin/ForgotPasswordForm'

export const metadata: Metadata = {
  title: 'Forgot password — SOUS SOL Admin',
  robots: { index: false, follow: false },
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />
}
