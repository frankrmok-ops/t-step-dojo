'use client'

import { useState, useEffect } from 'react'
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
  const [displayUrl, setDisplayUrl] = useState<string>(profile.avatarUrl || '')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCurrentFile(file)
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    setError('')
  }

  const handleUpload = async () => {
    if (!currentFile) return
    setLoading(true)
    setError('')
    try {
      const result = await uploadAvatar(profile.id, currentFile)
      if (result.success && result.url) {
        await updateAvatarUrl(profile.id, result.url)
        const newUrl = result.url + '?t=' + Date.now()
        setDisplayUrl(newUrl)
        onUpdate(newUrl)
        setPreview(null)
        setCurrentFile(null)
      } else {
        setError('Fehler: ' + (result.error || 'unbekannt'))
      }
    } catch (err: any) {
      setError('Fehler: ' + (err?.message || 'unbekannt'))
    }
    setLoading(false)
  }

  const avatarSrc = preview || displayUrl

  useEffect(() => {
    if (displayUrl) alert('displayUrl gesetzt: ' + displayUrl.substring(0, 50))
  }, [displayUrl])

  return (
    <div className="flex flex-col items-center">
      {preview && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-6">
          <img src={preview} alt="Vorschau" className="w-48 h-48 rounded-full object-cover border-4 border-red-600 mb-6" />
          {error && <p className="text-red-400 text-xs mb-3 text-center">{error}</p>}
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
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt="Avatar"
              className="w-full h-full object-cover"
              onError={() => setDisplayUrl('')}
            />
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