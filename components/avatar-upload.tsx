'use client'

import { useState } from 'react'
import { PlayerProfile, uploadAvatar, updateAvatarUrl } from '@/lib'

interface AvatarUploadProps {
  profile: PlayerProfile
  onUpdate: (newUrl: string) => void
}

export function AvatarUpload({ profile, onUpdate }: AvatarUploadProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      setError('Bild zu groß! Max 2MB')
      return
    }

    setLoading(true)
    setError('')

    const result = await uploadAvatar(profile.id, file)
    if (result.success && result.url) {
      await updateAvatarUrl(profile.id, result.url)
      onUpdate(result.url)
    } else {
      setError(result.error || 'Upload fehlgeschlagen')
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
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleFileChange}
          style={{ position: 'absolute', opacity: 0, width: 80, height: 80, cursor: 'pointer' }}
        />
      </label>
      {error && <p className="text-[10px] text-red-500 mt-1 text-center">{error}</p>}
    </div>
  )
}