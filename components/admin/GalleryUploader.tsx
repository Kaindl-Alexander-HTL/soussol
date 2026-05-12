'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

type GalleryPhoto = {
  id: string
  url: string
  caption: string | null
  sort_order: number
}

export function GalleryUploader({
  mementoId,
  initialPhotos,
}: {
  mementoId: string
  initialPhotos: GalleryPhoto[]
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [photos, setPhotos] = useState<GalleryPhoto[]>(initialPhotos)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    setUploadError('')

    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('file', file)

      const upRes = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      if (!upRes.ok) {
        const j = await upRes.json().catch(() => ({}))
        setUploadError(j.error ?? 'Upload fehlgeschlagen.')
        continue
      }
      const { url } = await upRes.json()

      const saveRes = await fetch('/api/admin/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memento_id: mementoId, url, sort_order: photos.length }),
      })
      if (saveRes.ok) {
        const photo = await saveRes.json()
        setPhotos((p) => [...p, photo])
      }
    }

    setUploading(false)
    router.refresh()
  }

  async function deletePhoto(id: string) {
    if (!confirm('Foto löschen?')) return
    await fetch('/api/admin/gallery', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setPhotos((p) => p.filter((ph) => ph.id !== id))
    router.refresh()
  }

  return (
    <div className="mt-12">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-sans text-[10px] tracking-[0.3em] text-mist uppercase">
          Galerie ({photos.length} Fotos)
        </h2>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="font-sans text-[10px] tracking-[0.25em] text-ash uppercase transition-colors hover:text-spark disabled:opacity-30"
        >
          {uploading ? 'Lädt...' : '+ Fotos hinzufügen'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {uploadError && (
        <p className="mb-4 font-sans text-[11px] text-white/40">{uploadError}</p>
      )}

      {photos.length === 0 ? (
        <div
          onClick={() => fileRef.current?.click()}
          className="flex cursor-pointer items-center justify-center border border-dashed border-white/10 py-12 transition-colors hover:border-white/25"
        >
          <span className="font-sans text-[10px] tracking-[0.25em] text-mist uppercase">
            Fotos hierher ziehen oder klicken
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {photos.map((photo) => (
            <div key={photo.id} className="group relative aspect-square overflow-hidden bg-white/5">
              <Image
                src={photo.url}
                alt={photo.caption ?? ''}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 33vw, 25vw"
              />
              <button
                onClick={() => deletePhoto(photo.id)}
                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center bg-ink/80 font-sans text-[11px] text-white/50 opacity-0 transition-opacity group-hover:opacity-100 hover:text-white"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex aspect-square items-center justify-center border border-dashed border-white/10 transition-colors hover:border-white/25"
          >
            <span className="font-sans text-[18px] text-mist">+</span>
          </button>
        </div>
      )}
    </div>
  )
}
