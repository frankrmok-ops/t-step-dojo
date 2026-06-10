'use client'

import { useState, useCallback, useEffect } from 'react'
import { PlayerProfile, BELT_LABELS, BELT_COLORS, getNextBelt, getRepsToNextBelt } from '@/lib'
import { CrossedKatanas } from './crossed-katanas'

interface TrainingCompleteProps {
  profile: PlayerProfile
  sessionReps: number
  previousBelt: string
  videoBlob: Blob | null
  onContinue: () => void
}

function Confetti() {
  const pieces = Array.from({ length: 30 }, (_, i) => i)
  const colors = ['#DC143C', '#FFD700', '#FF6B00', '#FFFFFF', '#FF4444']
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
      {pieces.map((i) => {
        const color = colors[i % colors.length]
        const left = `${Math.random() * 100}%`
        const delay = `${Math.random() * 2}s`
        const duration = `${2 + Math.random() * 2}s`
        const size = `${6 + Math.random() * 8}px`
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: '-20px',
              left,
              width: size,
              height: size,
              backgroundColor: color,
              borderRadius: Math.random() > 0.5 ? '50%' : '0',
              animation: `fall ${duration} ${delay} ease-in forwards`,
            }}
          />
        )
      })}
      <style>{`
        @keyframes fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  )
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
  const [showCelebration, setShowCelebration] = useState(false)
  const beltUpgraded = profile.belt !== previousBelt
  const nextBelt = getNextBelt(profile.belt)
  const repsToNext = getRepsToNextBelt(profile.totalReps)

  useEffect(() => {
    if (beltUpgraded) {
      setShowCelebration(true)
      const timer = setTimeout(() => setShowCelebration(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [beltUpgraded])

  const getFileExtension = useCallback(() => {
    if (!videoBlob) return 'webm'
    const mimeType = videoBlob.type
    if (mimeType.includes('mp4')) return 'mp4'
    if (mimeType.includes('webm')) return 'webm'
    return 'webm'
  }, [videoBlob])

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
    setTimeout(() => {
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 100)
    setShareStatus('Video gespeichert!')
    setTimeout(() => setShareStatus(null), 2000)
  }, [videoBlob, profile.name, getFileExtension])

  const handleShareVideo = async () => {
    if (!videoBlob) return
    setIsSharing(true)
    setShareStatus(null)
    const extension = getFileExtension()
    const filename = `T-Step-DOJO-Training-${profile.name}-${new Date().toISOString().split('T')[0]}.${extension}`
    try {
      const file = new File([videoBlob], filename, { type: videoBlob.type })
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'T-Step DOJO Training',
          text: `Trainingseinheit abgeschlossen! ${sessionReps} Wiederholungen - ${profile.name} (${BELT_LABELS[profile.belt]})`,
          files: [file]
        })
        setShareStatus('Erfolgreich geteilt!')
      } else if (navigator.share) {
        await navigator.share({
          title: 'T-Step DOJO Training',
          text: `Trainingseinheit abgeschlossen! ${sessionReps} Wiederholungen - ${profile.name} (${BELT_LABELS[profile.belt]})`
        })
        handleDownloadVideo()
        setShareStatus('Text geteilt, Video gespeichert!')
      } else {
        handleDownloadVideo()
        const text = encodeURIComponent(`T-Step DOJO Training abgeschlossen! ${sessionReps} Wiederholungen - ${profile.name} (${BELT_LABELS[profile.belt]})`)
        window.open(`https://wa.me/?text=${text}`, '_blank')
        setShareStatus('Video gespeichert, WhatsApp geoeffnet!')
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        handleDownloadVideo()
        setShareStatus('Teilen fehlgeschlagen, Video gespeichert!')
      }
    } finally {
      setIsSharing(false)
      setTimeout(() => setShareStatus(null), 3000)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-black p-4 overflow-hidden">

      {/* Konfetti bei Gürtel-Aufstieg */}
      {showCelebration && <Confetti />}

      {/* Gürtel-Aufstieg Feier */}
      {beltUpgraded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-40 bg-black/80"
          onClick={() => setShowCelebration(false)}>
          <div className="text-center px-6">
            <div className="text-6xl mb-4">🏆</div>
            <p className="text-yellow-400 text-lg font-bold mb-2">GÜRTEL AUFSTIEG!</p>
            <div
              className="mx-auto mb-4 h-6 w-24 rounded"
              style={{ backgroundColor: BELT_COLORS[profile.belt] }}
            />
            <p className="text-white text-3xl font-black mb-2">{BELT_LABELS[profile.belt]}</p>
            <p className="text-zinc-400 text-sm mb-6">Du hast einen neuen Gürtel erreicht!</p>
            <button
              onClick={(e) => { e.stopPropagation(); setShowCelebration(false) }}
              className="bg-yellow-500 text-black px-8 py-3 rounded-xl font-black text-sm"
            >
              Weiter 🥋
            </button>
          </div>
        </div>
      )}

      {/* Normaler Inhalt */}
      <div className="mb-4">
        <CrossedKatanas className="h-16 w-16" />
      </div>

      <h1 className="mb-1 text-xl font-bold text-green-500">Training abgeschlossen!</h1>
      <p className="mb-6 text-sm text-zinc-400">Ausgezeichnete Arbeit, {profile.name}!</p>

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

      {nextBelt && (
        <p className="mb-4 text-center text-xs text-zinc-500">
          Noch {repsToNext} Wiederholungen bis zum{' '}
          <span style={{ color: BELT_COLORS[nextBelt] }}>{BELT_LABELS[nextBelt]}</span>
        </p>
      )}

      {videoBlob && (
        <div className="mb-4 w-full max-w-xs space-y-2">
          <button
            onClick={handleDownloadVideo}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-3 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Video lokal speichern
          </button>
          <button
            onClick={handleShareVideo}
            disabled={isSharing}
            className="w-full rounded-lg bg-green-700 py-3 text-sm font-bold text-white hover:bg-green-600 disabled:opacity-50"
          >
            {isSharing ? 'Wird geteilt...' : 'Trainingsvideo per WhatsApp senden'}
          </button>
          {shareStatus && <p className="text-center text-xs text-green-400">{shareStatus}</p>}
        </div>
      )}

      {!videoBlob && (
        <p className="mb-4 text-center text-xs text-zinc-500">Kein Video aufgezeichnet</p>
      )}

      <button
        onClick={onContinue}
        className="w-full max-w-xs rounded-lg bg-gradient-to-r from-red-700 to-red-600 py-4 text-lg font-bold text-white shadow-lg shadow-red-900/30"
      >
        Weiter
      </button>
    </div>
  )
}