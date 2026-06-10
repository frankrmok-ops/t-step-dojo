'use client'

import { useState, useEffect } from 'react'
import { PlayerProfile, BELT_LABELS, getAllDonations, Donation, getRepsToNextBelt, getBestSession, getAverageReps, getCurrentStreak, getDailyChallenge, isChallengeCompletedToday, getTodayReps } from '../lib/storage'
import { supabase } from '../lib/supabase'
import { CrossedKatanas } from './crossed-katanas'
import { TrainingCalendar } from './training-calendar'

interface DashboardProps {
  profile: PlayerProfile
  onStartTraining: (targetReps: number, minSeconds: number, maxSeconds: number) => void
  onAdminClick: () => void
  onLogout: () => void
  onSupportersClick: () => void
  onLeaderboardClick: () => void
}

function DualRegulator({
  label, value, onChange, min = 1, max = 10
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
}) {
  const decrease = () => onChange(Math.max(min, value - 1))
  const increase = () => onChange(Math.min(max, value + 1))

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] text-zinc-400">{label}</span>
      <div className="flex items-center gap-0.5">
        <button onClick={decrease} className="flex h-7 w-7 items-center justify-center rounded bg-zinc-800 text-base font-bold text-red-500 hover:bg-zinc-700 active:bg-zinc-600">-</button>
        <div className="flex h-7 w-8 items-center justify-center rounded bg-zinc-900 text-xs font-bold text-white">{value}</div>
        <button onClick={increase} className="flex h-7 w-7 items-center justify-center rounded bg-zinc-800 text-base font-bold text-red-500 hover:bg-zinc-700 active:bg-zinc-600">+</button>
      </div>
    </div>
  )
}

export function Dashboard({ profile, onStartTraining, onAdminClick, onLogout, onSupportersClick, onLeaderboardClick }: DashboardProps) {
  const [targetReps, setTargetReps] = useState(10)
  const [minSeconds, setMinSeconds] = useState(1)
  const [maxSeconds, setMaxSeconds] = useState(5)
  const [donations, setDonations] = useState<Donation[]>([])
  const [topPlayers, setTopPlayers] = useState<{ name: string; team: string; totalReps: number; id: string }[]>([])
  const [myRank, setMyRank] = useState<number | null>(null)

  useEffect(() => {
    getAllDonations().then(data => setDonations(data.slice(0, 5)))
  }, [])

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data, error } = await supabase
        .from('players')
        .select('id, name, team, total_reps')
        .order('total_reps', { ascending: false })
        .limit(100)

      if (!error && data) {
        const players = data.map((row: any) => ({
          id: row.id,
          name: row.name,
          team: row.team || '',
          totalReps: row.total_reps || 0
        }))
        setTopPlayers(players)
        const rank = players.findIndex((p: any) => p.id === profile.id) + 1
        setMyRank(rank > 0 ? rank : null)
      }
    }
    fetchLeaderboard()
  }, [profile.id])

  const handleMinChange = (value: number) => {
    setMinSeconds(value)
    if (value > maxSeconds) setMaxSeconds(value)
  }

  const handleMaxChange = (value: number) => {
    if (value >= minSeconds) setMaxSeconds(value)
  }

  const decreaseReps = () => setTargetReps(Math.max(5, targetReps - 5))
  const increaseReps = () => setTargetReps(Math.min(100, targetReps + 5))

  return (
    <div className="min-h-screen bg-black overflow-x-hidden">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 px-3 pt-safe-top pb-3">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div className="flex items-center gap-2">
            <CrossedKatanas className="h-8 w-8" />
            <div>
              <h1 className="text-base font-bold text-red-500">T-Step DOJO</h1>
              <p className="text-[10px] text-zinc-500">Reflex Training</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onLogout} className="rounded bg-zinc-800 px-2 py-1 text-[10px] text-zinc-400 hover:bg-zinc-700 hover:text-white">
              Ausloggen
            </button>
            <button onClick={onAdminClick} className="text-zinc-600 hover:text-zinc-400" title="Admin">
              <span className="text-lg">&#128274;</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-3 p-3">
        {/* Profile Card */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">{profile.name}</h2>
              <p className="text-xs text-zinc-400">{BELT_LABELS[profile.belt]}</p>
              {profile.team && <p className="text-[10px] text-zinc-500">{profile.team}</p>}
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-red-500">{profile.totalReps}</p>
              <p className="text-[10px] text-zinc-500">Wiederholungen</p>
              {myRank && <p className="text-[10px] text-zinc-400">Rang #{myRank}</p>}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-zinc-800">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-zinc-500">Nächster Gürtel</p>
              <p className="text-[10px] font-bold text-yellow-500">{getRepsToNextBelt(profile.totalReps)} Reps fehlen noch</p>
            </div>
            <div className="mt-1 h-1.5 w-full rounded-full bg-zinc-800">
              <div
                className="h-1.5 rounded-full bg-gradient-to-r from-red-700 to-red-500"
                style={{ width: `${Math.min(100, 100 - (getRepsToNextBelt(profile.totalReps) / 250) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tages-Challenge */}
        <div className={`rounded-lg border p-3 ${isChallengeCompletedToday(profile) ? 'border-green-800 bg-green-950/30' : 'border-red-900/50 bg-zinc-900/50'}`}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">⚡ Tages-Challenge</p>
            {isChallengeCompletedToday(profile) && <span className="text-[10px] text-green-500 font-bold">✅ Erledigt!</span>}
          </div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-white font-bold">Heute: <span className="text-red-500">{getDailyChallenge(profile)} Reps</span> schaffen</p>
            <p className="text-xs text-zinc-400">{getTodayReps(profile)}/{getDailyChallenge(profile)}</p>
          </div>
          <div className="h-2 w-full rounded-full bg-zinc-800">
            <div
              className={`h-2 rounded-full transition-all ${isChallengeCompletedToday(profile) ? 'bg-green-500' : 'bg-red-600'}`}
              style={{ width: `${Math.min(100, (getTodayReps(profile) / getDailyChallenge(profile)) * 100)}%` }}
            />
          </div>
        </div>

        {/* Statistik Karte */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">📊 Statistik</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-black text-white">{getBestSession(profile)}</p>
              <p className="text-[9px] text-zinc-500">Beste Session</p>
            </div>
            <div>
              <p className="text-lg font-black text-white">{getAverageReps(profile)}</p>
              <p className="text-[9px] text-zinc-500">Ø pro Session</p>
            </div>
            <div>
              <p className="text-lg font-black text-yellow-500">{getCurrentStreak(profile)} 🔥</p>
              <p className="text-[9px] text-zinc-500">Tage Streak</p>
            </div>
          </div>
        </div>

        {/* Spendenlink Support Button */}
        <button onClick={onSupportersClick} className="w-full rounded-lg border border-yellow-900/50 bg-gradient-to-r from-yellow-950/40 to-zinc-900/50 p-3 text-left transition-all hover:from-yellow-950/60">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <div>
              <p className="text-sm font-bold text-yellow-400">Spendenlink Support</p>
              <p className="text-[10px] text-zinc-400">100% fließt ins Projekt</p>
            </div>
          </div>
        </button>

        {/* Unsere Supporter Wall — direkt unter Spendenlink */}
        <div className="rounded-lg border border-yellow-900/30 bg-zinc-900/40 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-600">🏆 Unsere Supporter</p>
            <button onClick={onSupportersClick} className="text-[10px] text-yellow-600 hover:text-yellow-400">Alle ansehen ›</button>
          </div>
          {donations.length === 0 ? (
            <p className="text-center text-[10px] text-zinc-600 py-2">Noch keine Supporter — sei der Erste! 💛</p>
          ) : (
            <div className="space-y-1.5">
              {donations.map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded bg-zinc-800/50 px-2 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs">{d.isAnonymous ? '🥷' : '⭐'}</span>
                    <div>
                      <p className="text-xs font-bold text-white">{d.isAnonymous ? 'Anonymer Supporter' : d.name}</p>
                      {d.message && <p className="text-[10px] text-zinc-500 truncate max-w-[180px]">{d.message}</p>}
                    </div>
                  </div>
                  <p className="text-xs font-bold text-yellow-500">{d.amount.toFixed(2)}€</p>
                </div>
              ))}
            </div>
          )}
          <p className="mt-2 text-center text-[10px] text-zinc-600">Danke für eure Unterstützung! 🙏 100% fließt ins Projekt.</p>
        </div>

        {/* Training Configuration */}
        <div className="rounded-lg border border-red-900/50 bg-gradient-to-b from-red-950/20 to-zinc-900/50 p-3">
          <h3 className="mb-2 text-center text-xs font-bold text-red-500">Training konfigurieren</h3>
          <div className="mb-2">
            <p className="mb-1 text-center text-[10px] text-zinc-400">Ziel Wiederholungen</p>
            <div className="flex items-center justify-center gap-2">
              <button onClick={decreaseReps} className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800 text-xl font-bold text-red-500 hover:bg-zinc-700">-</button>
              <div className="flex h-10 w-16 items-center justify-center rounded-lg bg-zinc-900 text-xl font-bold text-white">{targetReps}</div>
              <button onClick={increaseReps} className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800 text-xl font-bold text-red-500 hover:bg-zinc-700">+</button>
            </div>
          </div>
          <div className="mb-2">
            <p className="mb-1 text-center text-[10px] text-zinc-400">Zufälliges Zeitfenster (1-10 Sek)</p>
            <div className="flex items-center justify-center gap-4">
              <DualRegulator label="Min Sekunden" value={minSeconds} onChange={handleMinChange} min={1} max={10} />
              <DualRegulator label="Max Sekunden" value={maxSeconds} onChange={handleMaxChange} min={1} max={10} />
            </div>
          </div>
          <button
            onClick={() => onStartTraining(targetReps, minSeconds, maxSeconds)}
            className="w-full rounded-lg bg-gradient-to-r from-red-700 to-red-600 py-3 text-base font-bold text-white shadow-lg shadow-red-900/30 hover:from-red-600 hover:to-red-500"
          >
            Training starten
          </button>
        </div>

        {/* Top 100 Rangliste */}
        <div className="flex gap-2">
          {/* TOP 100 Rangliste */}
          <div className="flex-1 min-w-0 rounded-lg border border-red-900/30 bg-zinc-900/40 flex flex-col">
            <div className="flex items-center justify-between px-2 pt-2 pb-1 border-b border-zinc-800">
              <p className="text-[10px] font-bold uppercase tracking-widest text-red-500">🥇 Top 100</p>
              <button onClick={onLeaderboardClick} className="text-[9px] text-red-600 hover:text-red-400">Vollbild ›</button>
            </div>
            <div className="overflow-y-auto max-h-64 p-1 space-y-0.5">
              {topPlayers.length === 0 ? (
                <p className="text-[9px] text-zinc-600 text-center py-4">Lädt…</p>
              ) : (
                topPlayers.map((player, index) => (
                  <div
                    key={player.id}
                    className={`flex items-center gap-1 rounded px-1.5 py-1 ${player.id === profile.id ? 'bg-red-950/50 border border-red-800' : 'bg-zinc-800/40'}`}
                  >
                    <span className={`text-[9px] font-black w-5 flex-shrink-0 ${
                      index === 0 ? 'text-yellow-400' :
                      index === 1 ? 'text-zinc-400' :
                      index === 2 ? 'text-amber-700' : 'text-zinc-500'
                    }`}>
                      {index + 1}
                    </span>
                    <span className={`text-[9px] truncate flex-1 ${player.id === profile.id ? 'text-red-400 font-bold' : 'text-zinc-300'}`}>
                      {player.name}
                    </span>
                    <span className="text-[9px] font-bold text-red-500 flex-shrink-0">
                      {player.totalReps}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          
        </div>
      </main>
    </div>
  )
}