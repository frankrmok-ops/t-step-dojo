'use client'

import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { PlayerProfile, uploadAvatar, updateAvatarUrl } from '@/lib'

interface AvatarUploadProps {
  profile: PlayerProfile
  onUpdate: (newUrl: string) => void
}

async function getCroppedImg(imageSrc: string, croppedAreaPixels: any): Promise<Blob> {
  const image = new Image()
  image.crossOrigin = 'anonymous'
  image.src = imageSrc
  await new Promise((resolve) => { image.onload = resolve })
  const canvas = document.createElement('canvas')
  canvas.width = 300
  canvas.height = 300
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(image, croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height, 0, 0, 300, 300)
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.85))
}

export function AvatarUpload({ profile, onUpdate }: AvatarUploadProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImageSrc(reader.result as string)
    reader.readAsDataURL(file)
  }

  const onCropComplete = useCallback((_: any, croppedPixels: any) => {
    setCroppedAreaPixels(croppedPixels)
  }, [])

  const handleUpload = async () => {
    if (!imageSrc || !croppedAreaPixels) return
    setLoading(true)
    setError('')
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels)
      const file = new File([blob], `${profile.id}.jpg`, { type: 'image/jpeg' })
      const result = await uploadAvatar(profile.id, file)
      if (result.success && result.url) {
        await updateAvatarUrl(profile.id, result.url)
        onUpdate(result.url)
        setImageSrc(null)
      } else {
        setError(result.error || 'Upload fehlgeschlagen')
      }
    } catch (err) {
      setError('Fehler beim Verarbeiten')
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col items-center">
      {/* Crop Modal */}
      {imageSrc && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="relative flex-1">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          <div className="p-4 space-y-3 bg-zinc-900">
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-red-500"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setImageSrc(null)}
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
        </div>
      )}

      {/* Avatar Anzeige */}
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
      {error && <p className="text-[10px] text-red-500 mt-1 text-center">{error}</p>}
    </div>
  )
}