'use client'

import { useState } from 'react'
import { PlayerProfile, BELT_LABELS } from '../lib/storage'
import { CrossedKatanas } from './crossed-katanas'
import { TrainingCalendar } from './training-calendar'

interface DashboardProps {
  profile: PlayerProfile
  onStartTraining: (targetReps: number, minSeconds: number, maxSeconds: number) => void
  onAdminClick: () => void
  onLogout: () => void
}

// Compact dual plus/minus regulator component for mobile
function DualRegulator({
  label,
  value,
  onChange,
  min = 1,
  max = 10
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
}) {
  const decrease = () => {
    const newValue = Math.max(min, value - 1)
    onChange(newValue)
  }

  const increase = () => {
    const newValue = Math.min(max, value + 1)
    onChange(newValue)
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] text-zinc-400">{label}</span>
      <div className="flex items-center gap-0.5">
        <button
          onClick={decrease}
          className="flex h-7 w-7 items-center justify-center rounded bg-zinc-800 text-base font-bold text-red-500 hover:bg-zinc-700 active:bg-zinc-600"
        >
          -
        </button>
        <div className="flex h-7 w-8 items-center justify-center rounded bg-zinc-900 text-xs font-bold text-white">
          {value}
        </div>
        <button
          onClick={increase}
          className="flex h-7 w-7 items-center justify-center rounded bg-zinc-800 text-base font-bold text-red-500 hover:bg-zinc-700 active:bg-zinc-600"
        >
          +
        </button>
      </div>
    </div>
  )
}

export function Dashboard({ profile, onStartTraining, onAdminClick, onLogout }: DashboardProps) {
  const [targetReps, setTargetReps] = useState(10)
  const [minSeconds, setMinSeconds] = useState(1)
  const [maxSeconds, setMaxSeconds] = useState(5)

  // Ensure min doesn't exceed max
  const handleMinChange = (value: number) => {
    setMinSeconds(value)
    if (value > maxSeconds) {
      setMaxSeconds(value)
    }
  }

  // Ensure max doesn't go below min
  const handleMaxChange = (value: number) => {
    if (value >= minSeconds) {
      setMaxSeconds(value)
    }
  }

  // Reps change in steps of 5
  const decreaseReps = () => setTargetReps(Math.max(5, targetReps - 5))
  const increaseReps = () => setTargetReps(Math.min(100, targetReps + 5))

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 p-3">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div className="flex items-center gap-2">
            <CrossedKatanas className="h-8 w-8" />
            <div>
              <h1 className="text-base font-bold text-red-500">T-Step DOJO</h1>
              <p className="text-[10px] text-zinc-500">Reflex Training</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onLogout}
              className="rounded bg-zinc-800 px-2 py-1 text-[10px] text-zinc-400 hover:bg-zinc-700 hover:text-white"
              title="Ausloggen"
            >
              Ausloggen
            </button>
            <button
              onClick={onAdminClick}
              className="text-zinc-600 hover:text-zinc-400"
              title="Admin"
            >
              <span className="text-lg">&#128274;</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-4 p-3">
        {/* Profile Card */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">{profile.name}</h2>
              <p className="text-xs text-zinc-400">{BELT_LABELS[profile.belt]}</p>
              {profile.team && (
                <p className="text-[10px] text-zinc-500">{profile.team}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-red-500">{profile.totalReps}</p>
              <p className="text-[10px] text-zinc-500">Wiederholungen</p>
            </div>
          </div>
        </div>

        {/* Training Configuration */}
        <div className="rounded-lg border border-red-900/50 bg-gradient-to-b from-red-950/20 to-zinc-900/50 p-3">
          <h3 className="mb-3 text-center text-xs font-bold text-red-500">Training konfigurieren</h3>
          
          {/* Target Reps - Steps of 5 */}
          <div className="mb-3">
            <p className="mb-1 text-center text-[10px] text-zinc-400">Ziel Wiederholungen</p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={decreaseReps}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800 text-xl font-bold text-red-500 hover:bg-zinc-700 active:bg-zinc-600"
              >
                -
              </button>
              <div className="flex h-10 w-16 items-center justify-center rounded-lg bg-zinc-900 text-xl font-bold text-white">
                {targetReps}
              </div>
              <button
                onClick={increaseReps}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800 text-xl font-bold text-red-500 hover:bg-zinc-700 active:bg-zinc-600"
              >
                +
              </button>
            </div>
          </div>

          {/* Time Window - Dual Regulators - Compact for mobile */}
          <div className="mb-3">
            <p className="mb-1 text-center text-[10px] text-zinc-400">Zufälliges Zeitfenster (1-10 Sek)</p>
            <div className="flex items-center justify-center gap-4">
              <DualRegulator
                label="Min Sekunden"
                value={minSeconds}
                onChange={handleMinChange}
                min={1}
                max={10}
              />
              <DualRegulator
                label="Max Sekunden"
                value={maxSeconds}
                onChange={handleMaxChange}
                min={1}
                max={10}
              />
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={() => onStartTraining(targetReps, minSeconds, maxSeconds)}
            className="w-full rounded-lg bg-gradient-to-r from-red-700 to-red-600 py-3 text-base font-bold text-white shadow-lg shadow-red-900/30 hover:from-red-600 hover:to-red-500 active:from-red-800 active:to-red-700"
          >
            Training starten
          </button>
        </div>

        {/* Calendar */}
        <TrainingCalendar profile={profile} />
      </main>
    </div>
  )
}
