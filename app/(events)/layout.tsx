import { PublicNav } from '@/components/PublicNav'

export default function EventsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-ink">
      <PublicNav />
      <main>{children}</main>
    </div>
  )
}
