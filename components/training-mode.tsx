'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { PlayerProfile, BELT_LABELS, getRepsToNextBelt, getNextBelt, addTrainingSession, BELT_COLORS } from '@/lib'

interface TrainingModeProps {
  profile: PlayerProfile
  targetReps: number
  minSeconds: number
  maxSeconds: number
  onComplete: (profile: PlayerProfile, videoBlob: Blob | null) => void
  onExit: () => void
}

type TrainingState = 'requesting' | 'waiting_tap' | 'positioning' | 'countdown' | 'training'

export function TrainingMode({
  profile,
  targetReps,
  minSeconds,
  maxSeconds,
  onComplete,
  onExit
}: TrainingModeProps) {
  const [trainingState, setTrainingState] = useState<TrainingState>('requesting')
  const [positionTimer, setPositionTimer] = useState(10)
  const [countdown, setCountdown] = useState(3)
  const [repsRemaining, setRepsRemaining] = useState(targetReps)
  const [completedReps, setCompletedReps] = useState(0)
  const [showSquare, setShowSquare] = useState(false)
  const [isWaiting, setIsWaiting] = useState(true)
  const [motionDetected, setMotionDetected] = useState(false)
  const [cameraError, setCameraError] = useState('')

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const prevFrameRef = useRef<ImageData | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const triggerActiveRef = useRef(false)
  const motionCooldownRef = useRef(false)
  const repsRemainingRef = useRef(targetReps)
  const completedRepsRef = useRef(0)

  const MOTION_THRESHOLD = 30
  const PIXEL_CHANGE_THRESHOLD = 0.03

  // Piepton erzeugen
  const playBeep = useCallback((frequency = 880, duration = 150) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      oscillator.frequency.value = frequency
      oscillator.type = 'sine'
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000)
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + duration / 1000)
    } catch (e) {
      console.log('Audio nicht verfügbar')
    }
  }, [])

  // Schritt 1: Kamera anfordern
  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: true
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }

        const mimeTypes = ['video/mp4', 'video/webm;codecs=h264', 'video/webm;codecs=vp9', 'video/webm']
        let selectedMimeType = ''
        for (const mimeType of mimeTypes) {
          if (MediaRecorder.isTypeSupported(mimeType)) {
            selectedMimeType = mimeType
            break
          }
        }
        if (!selectedMimeType) selectedMimeType = 'video/webm'

        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: selectedMimeType,
          videoBitsPerSecond: 2500000
        })
        mediaRecorderRef.current = mediaRecorder
        recordedChunksRef.current = []

        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunksRef.current.push(event.data)
          }
        }

        mediaRecorder.start(500)
        setTrainingState('waiting_tap')
      } catch (err) {
        console.error('Kamera Fehler:', err)
        setCameraError('Kamera oder Mikrofon konnte nicht gestartet werden. Bitte Berechtigung erteilen.')
      }
    }
    initCamera()

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  // Schritt 2: Tippen → 10 Sekunden Positionierungs-Timer
  const handleTap = useCallback(() => {
    if (trainingState !== 'waiting_tap') return
    setTrainingState('positioning')
    setPositionTimer(10)
  }, [trainingState])

  // Positionierungs-Countdown (10 Sekunden)
  useEffect(() => {
    if (trainingState !== 'positioning') return
    if (positionTimer <= 0) {
      setTrainingState('countdown')
      setCountdown(3)
      return
    }
    const timer = setTimeout(() => setPositionTimer(t => t - 1), 1000)
    return () => clearTimeout(timer)
  }, [trainingState, positionTimer])

  // 3-2-1 Countdown mit Piepton
  useEffect(() => {
    if (trainingState !== 'countdown') return
    if (countdown <= 0) {
      playBeep(1200, 300)
      setTrainingState('training')
      scheduleNextSquare()
      return
    }
    playBeep(880, 150)
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [trainingState, countdown, playBeep])

  // Motion detection
  const detectMotion = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return false
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return false

    canvas.width = 160
    canvas.height = 120
    ctx.save()
    ctx.scale(-1, 1)
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height)
    ctx.restore()

    const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height)
    if (!prevFrameRef.current) {
      prevFrameRef.current = currentFrame
      return false
    }

    const prevData = prevFrameRef.current.data
    const currData = currentFrame.data
    let changedPixels = 0
    const totalPixels = canvas.width * canvas.height

    for (let i = 0; i < currData.length; i += 4) {
      const rDiff = Math.abs(currData[i] - prevData[i])
      const gDiff = Math.abs(currData[i + 1] - prevData[i + 1])
      const bDiff = Math.abs(currData[i + 2] - prevData[i + 2])
      if (rDiff + gDiff + bDiff > MOTION_THRESHOLD * 3) changedPixels++
    }

    prevFrameRef.current = currentFrame
    return (changedPixels / totalPixels) > PIXEL_CHANGE_THRESHOLD
  }, [])

  const completeTraining = useCallback((finalReps: number) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.onstop = () => {
        const mimeType = mediaRecorderRef.current?.mimeType || 'video/webm'
        const videoBlob = new Blob(recordedChunksRef.current, { type: mimeType })
        const updatedProfile = addTrainingSession(profile, finalReps, targetReps, minSeconds, maxSeconds)
        onComplete(updatedProfile, videoBlob)
      }
    } else {
      const updatedProfile = addTrainingSession(profile, finalReps, targetReps, minSeconds, maxSeconds)
      onComplete(updatedProfile, null)
    }
  }, [profile, targetReps, minSeconds, maxSeconds, onComplete])

  const scheduleNextSquare = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    const delay = (minSeconds + Math.random() * (maxSeconds - minSeconds)) * 1000
    setIsWaiting(true)
    setShowSquare(false)
    triggerActiveRef.current = false

    timeoutRef.current = setTimeout(() => {
      setShowSquare(true)
      setIsWaiting(false)
      triggerActiveRef.current = true
    }, delay)
  }, [minSeconds, maxSeconds])

  // Motion detection loop
  useEffect(() => {
    if (trainingState !== 'training') return

    const runDetection = () => {
      const hasMotion = detectMotion()
      setMotionDetected(hasMotion)

      if (triggerActiveRef.current && hasMotion && !motionCooldownRef.current) {
        motionCooldownRef.current = true

        repsRemainingRef.current = repsRemainingRef.current - 1
        completedRepsRef.current = completedRepsRef.current + 1

        setRepsRemaining(repsRemainingRef.current)
        setCompletedReps(completedRepsRef.current)
        setShowSquare(false)
        triggerActiveRef.current = false

        if (repsRemainingRef.current <= 0) {
          completeTraining(completedRepsRef.current)
          return
        }

        setTimeout(() => {
          motionCooldownRef.current = false
          scheduleNextSquare()
        }, 500)
      }

      animationFrameRef.current = requestAnimationFrame(runDetection)
    }

    animationFrameRef.current = requestAnimationFrame(runDetection)
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [trainingState, detectMotion, completeTraining, scheduleNextSquare])

  const nextBelt = getNextBelt(profile.belt)
  const repsToNext = getRepsToNextBelt(profile.totalReps)
  const progressPercent = Math.min(100, (completedReps / targetReps) * 100)

  return (
    <div className="relative flex h-screen w-full flex-col bg-black overflow-hidden">
      <canvas ref={canvasRef} className="hidden" />

      {/* Kamera — Vollbild */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
      />

      {/* Dunkles Overlay */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Kamera Fehler */}
      {cameraError && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black p-6 text-center">
          <p className="mb-2 text-4xl">📵</p>
          <p className="mb-4 text-sm text-red-400">{cameraError}</p>
          <button
            onClick={onExit}
            className="rounded-lg bg-zinc-800 px-4 py-2 text-sm text-white"
          >
            Zurück
          </button>
        </div>
      )}

      {/* SCHRITT 1: Kamera lädt */}
      {trainingState === 'requesting' && !cameraError && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/80">
          <div className="animate-pulse text-4xl mb-4">📷</div>
          <p className="text-white text-sm">Kamera wird gestartet...</p>
        </div>
      )}

      {/* SCHRITT 2: Warte auf Tippen */}
      {trainingState === 'waiting_tap' && (
        <div
          className="absolute inset-0 z-40 flex flex-col items-center justify-center"
          onClick={handleTap}
        >
          <div className="rounded-2xl border border-white/20 bg-black/60 p-8 text-center mx-6">
            <p className="text-5xl mb-4">👆</p>
            <p className="text-xl font-bold text-white mb-2">Bereit?</p>
            <p className="text-sm text-zinc-300 mb-1">Tippe auf den Bildschirm</p>
            <p className="text-xs text-zinc-400">Du hast dann 10 Sekunden um dich zu positionieren</p>
          </div>
        </div>
      )}

      {/* SCHRITT 3: 10 Sekunden Positionierung */}
      {trainingState === 'positioning' && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center pointer-events-none">

          <div className="absolute top-8 left-0 right-0 flex flex-col items-center">
            <div className="rounded-2xl bg-black/70 px-6 py-3 text-center">
              <p className="text-xs text-zinc-400 mb-1">Positioniere dich!</p>
              <p className="text-6xl font-bold text-cyan-400">{positionTimer}</p>
              <p className="text-xs text-zinc-400 mt-1">Sekunden</p>
            </div>
          </div>
        </div>
      )}

      {/* SCHRITT 4: 3-2-1 Countdown */}
      {trainingState === 'countdown' && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/70">
          <p className="mb-4 text-lg text-zinc-300">Mach dich bereit!</p>
          <div className="text-9xl font-bold text-red-500">{countdown}</div>
        </div>
      )}

      {/* TRAINING AKTIV */}
      {trainingState === 'training' && (
        <>
          <div className="absolute top-16 left-0 right-0 z-20 flex justify-center">
            {showSquare ? (
              <div className="h-24 w-24 animate-pulse rounded-2xl bg-red-600 shadow-[0_0_80px_rgba(220,38,38,1)]" />
            ) : (
              <div className="h-24 w-24 rounded-2xl border-2 border-dashed border-white/30" />
            )}
          </div>
          <div className="absolute top-4 left-0 right-0 z-20 flex justify-center">
            <div className="rounded-full bg-black/60 px-4 py-1">
              <p className="text-xs text-zinc-300">
                {isWaiting ? 'Warte...' : '⚡ REAGIERE!'}
              </p>
            </div>
          </div>
        </>
      )}

      {/* Header — Training aktiv */}
      {trainingState === 'training' && (
        <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-3 bg-gradient-to-b from-black/80 to-transparent">
          <div>
            <p className="text-xs font-bold text-red-500">T-Step DOJO</p>
            <p className="text-[10px] text-zinc-400">{profile.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-red-400">● REC</span>
            {motionDetected && <span className="text-[10px] text-green-400">Motion</span>}
            <button
              onClick={onExit}
              className="rounded border border-zinc-600 px-2 py-1 text-xs text-zinc-400"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Bottom Stats */}
      {trainingState === 'training' && (
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/90 to-transparent p-4">
          <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-red-600 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="text-center">
              <p className="text-3xl font-bold text-red-500">{repsRemaining}</p>
              <p className="text-[10px] text-zinc-500">Verbleibend</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-400">{completedReps}</p>
              <p className="text-[10px] text-zinc-500">Gemacht</p>
            </div>
            {nextBelt && (
              <div className="text-center">
                <p className="text-sm font-bold" style={{ color: BELT_COLORS[nextBelt] }}>
                  {Math.max(0, repsToNext - completedReps)}
                </p>
                <p className="text-[10px] text-zinc-500">bis {BELT_LABELS[nextBelt]}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Abbrechen Button */}
      {trainingState !== 'training' && !cameraError && (
        <button
          onClick={onExit}
          className="absolute bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-zinc-800/80 px-6 py-2 text-sm text-zinc-400"
        >
          Abbrechen
        </button>
      )}
    </div>
  )
}