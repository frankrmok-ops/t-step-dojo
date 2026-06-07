'use client'

import { PlayerProfile, BELT_LABELS, BELT_THRESHOLDS, getRepsToNextBelt, getNextBelt, BELT_ORDER, BELT_COLORS } from '@/lib'

interface ProgressBarProps {
  profile: PlayerProfile
}

export function ProgressBar({ profile }: ProgressBarProps) {
  const nextBelt = getNextBelt(profile.belt)
  const repsToNext = getRepsToNextBelt(profile.totalReps)
  
  // Calculate progress percentage
  const currentThreshold = BELT_THRESHOLDS[profile.belt]
  const nextThreshold = nextBelt ? BELT_THRESHOLDS[nextBelt] : profile.totalReps
  const progressInLevel = profile.totalReps - currentThreshold
  const levelRange = nextThreshold - currentThreshold
  const progressPercent = nextBelt ? Math.min(100, (progressInLevel / levelRange) * 100) : 100

  return (
    <div className="w-full space-y-1.5">
      {/* Belt display */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <div
            className="h-3 w-6 rounded border border-zinc-600"
            style={{ backgroundColor: BELT_COLORS[profile.belt] }}
          />
          <span className="font-bold text-white">{BELT_LABELS[profile.belt]}</span>
        </div>
        {nextBelt && (
          <span className="text-[10px] text-zinc-400">
            Noch {repsToNext} bis {BELT_LABELS[nextBelt]}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progressPercent}%`,
            backgroundColor: BELT_COLORS[profile.belt]
          }}
        />
      </div>

      {/* Total reps */}
      <p className="text-center text-[10px] text-zinc-500">
        Gesamt: {profile.totalReps} Wiederholungen
      </p>
    </div>
  )
}

export function BeltRankings() {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
      <h3 className="mb-2 text-center text-xs font-bold text-red-500">Gürtel Ränge</h3>
      <div className="grid grid-cols-7 gap-1">
        {BELT_ORDER.map((belt) => (
          <div key={belt} className="flex flex-col items-center gap-0.5">
            <div
              className="h-2.5 w-5 rounded border border-zinc-600"
              style={{ backgroundColor: BELT_COLORS[belt] }}
            />
            <span className="text-[8px] text-zinc-500">{BELT_THRESHOLDS[belt]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
