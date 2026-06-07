'use client'

import { useState, useCallback } from 'react'
import { PlayerProfile, BELT_LABELS, BELT_COLORS, getNextBelt, getRepsToNextBelt } from '@/lib'
import { CrossedKatanas } from './crossed-katanas'

interface TrainingCompleteProps {
  profile: PlayerProfile
  sessionReps: number
  previousBelt: string
  videoBlob: Blob | null
  onContinue: () => void
}

export function TrainingComplete({
  profile,
  sessionReps,
  previousBelt,
  videoBlob,
  onContinue
}: TrainingCompleteProps) {
  const [isSharing, setIsSharing] = useState(false)
  const [shareStatus, setShareStatus] = useState<string | null>(null)
  const beltUpgraded = profile.belt !== previousBelt
  const nextBelt = getNextBelt(profile.belt)
  const repsToNext = getRepsToNextBelt(profile.totalReps)

  // Get file extension based on mime type
  const getFileExtension = useCallback(() => {
    if (!videoBlob) return 'webm'
    const mimeType = videoBlob.type
    if (mimeType.includes('mp4')) return 'mp4'
    if (mimeType.includes('webm')) return 'webm'
    return 'webm'
  }, [videoBlob])

  // Force download video to device storage
  const handleDownloadVideo = useCallback(() => {
    if (!videoBlob) return
    
    const extension = getFileExtension()
    const filename = `T-Step-DOJO-Training-${profile.name}-${new Date().toISOString().split('T')[0]}.${extension}`
    
    const url = URL.createObjectURL(videoBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    
    // Cleanup after a short delay
    setTimeout(() => {
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 100)
    
    setShareStatus('Video gespeichert!')
    setTimeout(() => setShareStatus(null), 2000)
  }, [videoBlob, profile.name, getFileExtension])

  // Share video via Web Share API or fallback
  const handleShareVideo = async () => {
    if (!videoBlob) return
    setIsSharing(true)
    setShareStatus(null)

    const extension = getFileExtension()
    const filename = `T-Step-DOJO-Training-${profile.name}-${new Date().toISOString().split('T')[0]}.${extension}`

    try {
      // Create file from blob
      const file = new File([videoBlob], filename, { type: videoBlob.type })

      // Check if Web Share API with file sharing is available
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'T-Step DOJO Training',
          text: `Trainingseinheit abgeschlossen! ${sessionReps} Wiederholungen - ${profile.name} (${BELT_LABELS[profile.belt]})`,
          files: [file]
        })
        setShareStatus('Erfolgreich geteilt!')
      } else if (navigator.share) {
        // Share without file (text only)
        await navigator.share({
          title: 'T-Step DOJO Training',
          text: `Trainingseinheit abgeschlossen! ${sessionReps} Wiederholungen - ${profile.name} (${BELT_LABELS[profile.belt]})`
        })
        // Also download the video
        handleDownloadVideo()
        setShareStatus('Text geteilt, Video gespeichert!')
      } else {
        // Full fallback - download video and open WhatsApp
        handleDownloadVideo()
        const text = encodeURIComponent(
          `T-Step DOJO Training abgeschlossen! ${sessionReps} Wiederholungen - ${profile.name} (${BELT_LABELS[profile.belt]}) - Video wurde separat gespeichert!`
        )
        window.open(`https://wa.me/?text=${text}`, '_blank')
        setShareStatus('Video gespeichert, WhatsApp geoeffnet!')
      }
    } catch (err) {
      // User cancelled or error occurred
      if ((err as Error).name !== 'AbortError') {
        // Fallback to download
        handleDownloadVideo()
        setShareStatus('Teilen fehlgeschlagen, Video gespeichert!')
      }
    } finally {
      setIsSharing(false)
      setTimeout(() => setShareStatus(null), 3000)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-4">
      {/* Success icon */}
      <div className="mb-4">
        <CrossedKatanas className="h-16 w-16" />
      </div>

      {/* Completion message */}
      <h1 className="mb-1 text-xl font-bold text-green-500">Training abgeschlossen!</h1>
      <p className="mb-6 text-sm text-zinc-400">Ausgezeichnete Arbeit, {profile.name}!</p>

      {/* Stats card */}
      <div className="mb-4 w-full max-w-xs rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="mb-3 text-center">
          <p className="text-4xl font-bold text-red-500">+{sessionReps}</p>
          <p className="text-sm text-zinc-400">Wiederholungen</p>
        </div>

        <div className="border-t border-zinc-800 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Gesamt:</span>
            <span className="font-bold text-white">{profile.totalReps}</span>
          </div>
        </div>
      </div>

      {/* Belt upgrade notification */}
      {beltUpgraded && (
        <div className="mb-4 w-full max-w-xs animate-pulse rounded-lg border-2 border-yellow-500 bg-yellow-900/20 p-3 text-center">
          <p className="mb-2 text-sm text-yellow-400">Aufstieg!</p>
          <div className="flex items-center justify-center gap-2">
            <div
              className="h-4 w-8 rounded border-2 border-zinc-600"
              style={{ backgroundColor: BELT_COLORS[profile.belt] }}
            />
            <span className="font-bold text-white">{BELT_LABELS[profile.belt]}</span>
          </div>
        </div>
      )}

      {/* Next belt info */}
      {nextBelt && (
        <p className="mb-4 text-center text-xs text-zinc-500">
          Noch {repsToNext} Wiederholungen bis zum{' '}
          <span style={{ color: BELT_COLORS[nextBelt] }}>{BELT_LABELS[nextBelt]}</span>
        </p>
      )}

      {/* Video actions */}
      {videoBlob && (
        <div className="mb-4 w-full max-w-xs space-y-2">
          <button
            onClick={handleDownloadVideo}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-3 text-sm font-medium text-white hover:bg-zinc-700 active:bg-zinc-600"
          >
            Video lokal speichern
          </button>
          <button
            onClick={handleShareVideo}
            disabled={isSharing}
            className="w-full rounded-lg bg-green-700 py-3 text-sm font-bold text-white hover:bg-green-600 active:bg-green-500 disabled:opacity-50"
          >
            {isSharing ? 'Wird geteilt...' : 'Trainingsvideo per WhatsApp an Trainer senden'}
          </button>
          {shareStatus && (
            <p className="text-center text-xs text-green-400">{shareStatus}</p>
          )}
        </div>
      )}

      {!videoBlob && (
        <p className="mb-4 text-center text-xs text-zinc-500">
          Kein Video aufgezeichnet - Kamera war nicht verfuegbar
        </p>
      )}

      {/* Continue button */}
      <button
        onClick={onContinue}
        className="w-full max-w-xs rounded-lg bg-gradient-to-r from-red-700 to-red-600 py-4 text-lg font-bold text-white shadow-lg shadow-red-900/30 hover:from-red-600 hover:to-red-500 active:from-red-800 active:to-red-700"
      >
        Weiter
      </button>
    </div>
  )
}
