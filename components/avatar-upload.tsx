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
  const [preview, setPreview] = useState<string | null>(null)
  const [currentFile, setCurrentFile] = useState<File | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCurrentFile(file)
    setPreview(URL.createObjectURL(file))
    setError('')
  }

  const handleUpload = async () => {
    if (!currentFile) return
    setLoading(true)
    setError('')
    try {
      const result = await uploadAvatar(profile.id, currentFile)
      alert('Result: ' + JSON.stringify(result))
      if (result.success && result.url) {
        await updateAvatarUrl(profile.id, result.url)
        onUpdate(result.url)
        setPreview(null)
        setCurrentFile(null)
      } else {
        setError('Fehler: ' + (result.error || 'unbekannt'))
      }
    } catch (err: any) {
      alert('Exception: ' + (err?.message || JSON.stringify(err)))
      setError('Fehler: ' + (err?.message || 'unbekannt'))
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col items-center">
      {/* Vorschau + Bestätigen */}
      {preview && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-6">
          <img src={preview} alt="Vorschau" className="w-48 h-48 rounded-full object-cover border-4 border-red-600 mb-6" />
          {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
          <div className="flex gap-3 w-full max-w-xs">
            <button
              onClick={() => { setPreview(null); setCurrentFile(null) }}
              className="flex-1 bg-zinc-800 text-zinc-300 py-3 rounded-xl font-bold text-sm"
            >
              Abbrechen
            </button>
            <button
              onClick={handleUpload}
              disabled={loading}
              className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-50"
            >
              {loading ? 'Lädt...' : 'Speichern'}
            </button>
          </div>
        </div>
      )}

      <label className="cursor-pointer flex flex-col items-center">
        <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-red-600 mb-1">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-3xl">👤</div>
          )}
        </div>
        <span className="text-[10px] text-zinc-500">Foto ändern</span>
        <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
      </label>
      {!preview && error && <p className="text-[10px] text-red-500 mt-1">{error}</p>}
    </div>
  )
}