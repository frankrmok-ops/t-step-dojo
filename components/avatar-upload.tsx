'use client'

import { useState } from 'react'
import { PlayerProfile, uploadAvatar, updateAvatarUrl } from '@/lib'

interface AvatarUploadProps {
  profile: PlayerProfile
  onUpdate: (newUrl: string) => void
}

async function resizeImage(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const MAX = 400
      let w = img.width
      let h = img.height
      if (w > h) { if (w > MAX) { h = h * MAX / w; w = MAX } }
      else { if (h > MAX) { w = w * MAX / h; h = MAX } }
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.8)
    }
    img.src = url
  })
}

export function AvatarUpload({ profile, onUpdate }: AvatarUploadProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError('')

    try {
      const resized = await resizeImage(file)
      const resizedFile = new File([resized], `${profile.id}.jpg`, { type: 'image/jpeg' })
      const result = await uploadAvatar(profile.id, resizedFile)
      if (result.success && result.url) {
        await updateAvatarUrl(profile.id, result.url)
        onUpdate(result.url)
      } else {
        setError(result.error || 'Upload fehlgeschlagen')
      }
    } catch (err) {
      setError('Fehler beim Verarbeiten des Bildes')
    }

    setLoading(false)
  }

  return (
    <div className="flex flex-col items-center">
      <label className="cursor-pointer flex flex-col items-center">
        <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-red-600 mb-1">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-3xl">
              👤
            </div>
          )}
          {loading && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        <span className="text-[10px] text-zinc-500">
          {loading ? 'Lädt...' : 'Foto ändern'}
        </span>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </label>
      {error && <p className="text-[10px] text-red-500 mt-1 text-center max-w-20">{error}</p>}
    </div>
  )
}