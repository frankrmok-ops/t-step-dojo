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

type TrainingState = 'requesting' | 'waiting_tap' | 'positioning' | 'training'

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
  const [countdown, setCountdown] = useState(0)
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

  const handleTap = useCallback(() => {
    if (trainingState !== 'waiting_tap') return
    setTrainingState('positioning')
    setPositionTimer(10)
  }, [trainingState])

  useEffect(() => {
    if (trainingState !== 'positioning') return
    if (positionTimer <= 0) {
      playBeep(1200, 300)
      setTrainingState('training')
      scheduleNextSquare()
      return
    }
    playBeep(660, 100)
    const timer = setTimeout(() => setPositionTimer(t => t - 1), 1000)
    return () => clearTimeout(timer)
  }, [trainingState, positionTimer])

  

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

  const completeTraining = useCallback(async (finalReps: number) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.onstop = async () => {
        const mimeType = mediaRecorderRef.current?.mimeType || 'video/webm'
        const videoBlob = new Blob(recordedChunksRef.current, { type: mimeType })
        const updatedProfile = await addTrainingSession(profile, finalReps, targetReps, minSeconds, maxSeconds)
        onComplete(updatedProfile, videoBlob)
      }
    } else {
      const updatedProfile = await addTrainingSession(profile, finalReps, targetReps, minSeconds, maxSeconds)
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

  useEffect(() => {
    if (trainingState !== 'training') return

    const loop = () => {
      const hasMotion = detectMotion()
      setMotionDetected(hasMotion)

      if (hasMotion && triggerActiveRef.current && !motionCooldownRef.current) {
        motionCooldownRef.current = true
        triggerActiveRef.current = false
        playBeep(1000, 100)

        completedRepsRef.current += 1
        repsRemainingRef.current = Math.max(0, repsRemainingRef.current - 1)

        setCompletedReps(completedRepsRef.current)
        setRepsRemaining(repsRemainingRef.current)

        if (repsRemainingRef.current <= 0) {
          completeTraining(completedRepsRef.current)
          return
        }

        setTimeout(() => {
          motionCooldownRef.current = false
        }, 800)

        scheduleNextSquare()
      }

      animationFrameRef.current = requestAnimationFrame(loop)
    }

    animationFrameRef.current = requestAnimationFrame(loop)

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [trainingState, detectMotion, playBeep, scheduleNextSquare, completeTraining])

  const handleAbbrechen = () => {
    completeTraining(completedRepsRef.current)
  }

  const currentBelt = profile.belt
  const nextBelt = getNextBelt(currentBelt)
  const repsToNext = getRepsToNextBelt(profile.totalReps)

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black select-none">
      {/* Kamera-Feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-cover scale-x-[-1]"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* ZUSTAND: Kamera wird angefragt */}
      {trainingState === 'requesting' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 px-6 text-center z-50">
          <div className="text-5xl mb-4">📷</div>
          <h2 className="text-white text-2xl font-bold mb-2">Kamera wird gestartet…</h2>
          <p className="text-zinc-400 text-sm">Bitte Kamera & Mikrofon erlauben</p>
        </div>
      )}

      {/* ZUSTAND: Kamera Fehler */}
      {cameraError !== '' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 px-6 text-center z-50">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-white text-xl font-bold mb-2">Kamera-Fehler</h2>
          <p className="text-zinc-400 text-sm mb-6">{cameraError}</p>
          <button
            onClick={onExit}
            className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold"
          >
            Zurück
          </button>
        </div>
      )}

      {/* ZUSTAND: Tippen zum Starten */}
      {trainingState === 'waiting_tap' && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center z-40"
          onClick={handleTap}
        >
          <div className="bg-black/60 rounded-2xl px-8 py-6 text-center">
            <div className="text-5xl mb-3">🥋</div>
            <h2 className="text-white text-2xl font-bold mb-1">Bereit?</h2>
            <p className="text-zinc-300 text-sm mb-4">Tippe um zu starten</p>
            <div className="text-zinc-400 text-xs">
              Ziel: <span className="text-white font-bold">{targetReps} Reps</span>
            </div>
          </div>
        </div>
      )}

      {/* ZUSTAND: Positionierung (10 Sek) */}
      {trainingState === 'positioning' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-40">
          <div className="bg-black/70 rounded-2xl px-8 py-6 text-center">
            <p className="text-zinc-300 text-sm mb-2">Positioniere dich!</p>
            <div className="text-white text-7xl font-black">{positionTimer}</div>
            <p className="text-zinc-400 text-xs mt-2">Sekunden bis zum Start</p>
          </div>
        </div>
      )}

      

      {/* ZUSTAND: Training läuft */}
      {trainingState === 'training' && (
        <>
          {/* Reps Anzeige oben */}
          <div className="absolute top-0 left-0 right-0 z-30 flex justify-between items-center px-4 pt-safe-top pt-4">
            <div className="bg-black/60 rounded-xl px-3 py-2 text-center">
              <div className="text-zinc-400 text-xs">Erledigt</div>
              <div className="text-white text-2xl font-black">{completedReps}</div>
            </div>
            <div className="bg-black/60 rounded-xl px-3 py-2 text-center">
              <div className="text-zinc-400 text-xs">Verbleibend</div>
              <div className="text-red-500 text-2xl font-black">{repsRemaining}</div>
            </div>
          </div>

          {/* Motion Indikator */}
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30">
            <div className={`w-3 h-3 rounded-full ${motionDetected ? 'bg-green-400' : 'bg-zinc-600'}`} />
          </div>

          {/* Trigger-Quadrat */}
          {showSquare && (
            <div className="absolute inset-0 flex items-center justify-center z-20">
              <div className="bg-red-600 rounded-2xl animate-pulse"
                style={{ width: '40vw', height: '40vw', maxWidth: 200, maxHeight: 200 }}
              />
            </div>
          )}

          {/* Warte-Indikator */}
          {isWaiting && !showSquare && (
            <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-30">
              <p className="text-zinc-400 text-xs text-center">Warte auf Signal…</p>
            </div>
          )}

          {/* Reps Countdown groß unten */}
          <div className="absolute bottom-28 left-0 right-0 flex flex-col items-center z-30">
            <div className="text-white font-black opacity-90" style={{ fontSize: '25vw', lineHeight: 1 }}>{repsRemaining}</div>
            <p className="text-zinc-400 text-xs mt-1">verbleibende Reps</p>
          </div>

          {/* Abbrechen Button */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-center z-30">
            <button
              onClick={handleAbbrechen}
              className="bg-black/70 border border-zinc-600 text-zinc-300 px-8 py-3 rounded-xl font-bold text-sm"
            >
              Training beenden
            </button>
          </div>
        </>
      )}
    </div>
  )
}