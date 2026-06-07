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

export function TrainingMode({
  profile,
  targetReps,
  minSeconds,
  maxSeconds,
  onComplete,
  onExit
}: TrainingModeProps) {
  const [repsRemaining, setRepsRemaining] = useState(targetReps)
  const [showSquare, setShowSquare] = useState(false)
  const [isWaiting, setIsWaiting] = useState(true)
  const [countdown, setCountdown] = useState(3)
  const [isStarted, setIsStarted] = useState(false)
  const [completedReps, setCompletedReps] = useState(0)
  const [motionDetected, setMotionDetected] = useState(false)
  
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

  // Motion detection threshold
  const MOTION_THRESHOLD = 30
  const PIXEL_CHANGE_THRESHOLD = 0.03 // 3% of pixels must change

  // Initialize camera and recording
  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }

        // Setup MediaRecorder for video recording - prefer mp4 for compatibility
        const mimeTypes = [
          'video/mp4',
          'video/webm;codecs=h264',
          'video/webm;codecs=vp9',
          'video/webm'
        ]
        
        let selectedMimeType = ''
        for (const mimeType of mimeTypes) {
          if (MediaRecorder.isTypeSupported(mimeType)) {
            selectedMimeType = mimeType
            break
          }
        }

        if (!selectedMimeType) {
          selectedMimeType = 'video/webm'
        }

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

        // Start recording with timeslice for reliable data capture
        mediaRecorder.start(500)
      } catch (err) {
        console.log('[v0] Camera/Recording error:', err)
      }
    }
    initCamera()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  // Motion detection using pixel differencing
  const detectMotion = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return false
    
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    
    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return false

    // Set canvas dimensions to match video
    canvas.width = 160
    canvas.height = 120

    // Draw current frame (mirrored)
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

    // Compare pixels - check RGB difference
    for (let i = 0; i < currData.length; i += 4) {
      const rDiff = Math.abs(currData[i] - prevData[i])
      const gDiff = Math.abs(currData[i + 1] - prevData[i + 1])
      const bDiff = Math.abs(currData[i + 2] - prevData[i + 2])
      
      if (rDiff + gDiff + bDiff > MOTION_THRESHOLD * 3) {
        changedPixels++
      }
    }

    prevFrameRef.current = currentFrame
    
    const motionRatio = changedPixels / totalPixels
    return motionRatio > PIXEL_CHANGE_THRESHOLD
  }, [])

  // Motion detection loop
  useEffect(() => {
    if (!isStarted || countdown > 0) return

    const runDetection = () => {
      const hasMotion = detectMotion()
      setMotionDetected(hasMotion)

      // If trigger is active and motion detected, count as hit
      if (triggerActiveRef.current && hasMotion && !motionCooldownRef.current) {
        motionCooldownRef.current = true
        
        const newRepsRemaining = repsRemaining - 1
        const newCompletedReps = completedReps + 1
        
        setRepsRemaining(newRepsRemaining)
        setCompletedReps(newCompletedReps)
        setShowSquare(false)
        triggerActiveRef.current = false

        if (newRepsRemaining <= 0) {
          // Training complete
          completeTraining(newCompletedReps)
        } else {
          // Schedule next square after cooldown
          setTimeout(() => {
            motionCooldownRef.current = false
            scheduleNextSquare()
          }, 500)
        }
      }

      animationFrameRef.current = requestAnimationFrame(runDetection)
    }

    animationFrameRef.current = requestAnimationFrame(runDetection)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isStarted, countdown, repsRemaining, completedReps, detectMotion])

  // Complete training and save video
  const completeTraining = useCallback((finalReps: number) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    // Stop recording and compile video
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.onstop = () => {
        const mimeType = mediaRecorderRef.current?.mimeType || 'video/webm'
        const videoBlob = new Blob(recordedChunksRef.current, { type: mimeType })
        
        const updatedProfile = addTrainingSession(
          profile,
          finalReps,
          targetReps,
          minSeconds,
          maxSeconds
        )
        onComplete(updatedProfile, videoBlob)
      }
    } else {
      const updatedProfile = addTrainingSession(
        profile,
        finalReps,
        targetReps,
        minSeconds,
        maxSeconds
      )
      onComplete(updatedProfile, null)
    }
  }, [profile, targetReps, minSeconds, maxSeconds, onComplete])

  // Countdown before start
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (countdown === 0 && !isStarted) {
      setIsStarted(true)
      scheduleNextSquare()
    }
  }, [countdown, isStarted])

  // Schedule next red square appearance
  const scheduleNextSquare = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const nextBelt = getNextBelt(profile.belt)
  const repsToNext = getRepsToNextBelt(profile.totalReps)
  const progressPercent = Math.min(100, ((targetReps - repsRemaining) / targetReps) * 100)

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center bg-black">
      {/* Hidden canvas for motion detection */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Countdown overlay */}
      {countdown > 0 && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90">
          <p className="mb-4 text-xl text-zinc-400">Mach dich bereit!</p>
          <div className="text-9xl font-bold text-red-600">{countdown}</div>
        </div>
      )}

      {/* Top info bar */}
      <div className="w-full bg-gradient-to-b from-black to-transparent p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-red-500">T-Step DOJO</p>
            <p className="text-xs text-zinc-500">{profile.name} - {BELT_LABELS[profile.belt]}</p>
          </div>
          <button
            onClick={onExit}
            className="rounded border border-zinc-700 px-3 py-1 text-sm text-zinc-400 hover:bg-zinc-800"
          >
            Abbrechen
          </button>
        </div>
      </div>

      {/* Main content - vertically centered */}
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        {/* Red Square Trigger - upper center */}
        <div className="mb-6 flex h-24 w-24 items-center justify-center">
          {showSquare ? (
            <div className="h-20 w-20 animate-pulse rounded-lg bg-red-600 shadow-[0_0_60px_rgba(220,38,38,0.9)]" />
          ) : (
            <div className="h-20 w-20 rounded-lg border-2 border-dashed border-zinc-700" />
          )}
        </div>

        {/* Camera preview with silhouette overlay - below red square */}
        <div className="relative overflow-hidden rounded-xl border-2 border-red-600/50">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-52 w-40 bg-zinc-900 object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
          
          {/* Silhouette positioning guide overlay */}
          <div className="pointer-events-none absolute inset-0">
            {/* Head position circle */}
            <div className="absolute left-1/2 top-4 h-10 w-10 -translate-x-1/2 rounded-full border-2 border-cyan-400/40" />
            {/* Body outline */}
            <div className="absolute left-1/2 top-14 h-28 w-16 -translate-x-1/2 rounded-t-full border-2 border-cyan-400/40" />
            {/* Center crosshair */}
            <div className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2">
              <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-cyan-400/30" />
              <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-cyan-400/30" />
            </div>
            {/* Corner guides */}
            <div className="absolute left-2 top-2 h-4 w-4 border-l-2 border-t-2 border-cyan-400/50" />
            <div className="absolute right-2 top-2 h-4 w-4 border-r-2 border-t-2 border-cyan-400/50" />
            <div className="absolute bottom-2 left-2 h-4 w-4 border-b-2 border-l-2 border-cyan-400/50" />
            <div className="absolute bottom-2 right-2 h-4 w-4 border-b-2 border-r-2 border-cyan-400/50" />
          </div>

          {/* Recording indicator */}
          <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1 text-center text-xs text-red-400">
            REC {isStarted ? '●' : '○'} {motionDetected && <span className="ml-2 text-green-400">Motion</span>}
          </div>
        </div>

        {/* Status text */}
        <p className="mt-4 text-center text-sm text-zinc-500">
          {isWaiting ? 'Warte auf das rote Quadrat...' : 'REAGIERE! Bewegung erkannt = Treffer!'}
        </p>
      </div>

      {/* Bottom info bar */}
      <div className="w-full bg-gradient-to-t from-black to-transparent p-4">
        {/* Progress bar */}
        <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-red-600 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-white">
          <div className="text-center">
            <p className="text-3xl font-bold text-red-500">{repsRemaining}</p>
            <p className="text-xs text-zinc-500">Verbleibend</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-500">{completedReps}</p>
            <p className="text-xs text-zinc-500">Abgeschlossen</p>
          </div>
          {nextBelt && (
            <div className="text-center">
              <p className="text-sm font-bold" style={{ color: BELT_COLORS[nextBelt] }}>
                {Math.max(0, repsToNext - completedReps)}
              </p>
              <p className="text-xs text-zinc-500">bis {BELT_LABELS[nextBelt]}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
