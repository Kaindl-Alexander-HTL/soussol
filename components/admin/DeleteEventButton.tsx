'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function DeleteEventButton({ id, title }: { id: string; title: string }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`Delete “${title}”?`)) return
    setDeleting(true)
    await fetch('/api/admin/events', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="font-sans text-[10px] tracking-[0.15em] text-white/20 uppercase transition-colors hover:text-white/60 disabled:opacity-30"
    >
      {deleting ? '...' : '×'}
    </button>
  )
}
