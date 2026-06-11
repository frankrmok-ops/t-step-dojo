'use client'

import { useState, useEffect } from 'react'
import { PlayerProfile, Duel, getMyDuels, sendDuelChallenge, acceptDuel, declineDuel } from '@/lib'
import { supabase } from '../lib/supabase'

interface DuelScreenProps {
  profile: PlayerProfile
  onBack: () => void
}

export function DuelScreen({ profile, onBack }: DuelScreenProps) {
  const [duels, setDuels] = useState<Duel[]>([])
  const [players, setPlayers] = useState<{ id: string; name: string; team: string; totalReps: number }[]>([])
  const [tab, setTab] = useState<'active' | 'new'>('active')
  const [selectedOpponent, setSelectedOpponent] = useState<{ id: string; name: string } | null>(null)
  const [selectedDays, setSelectedDays] = useState<1 | 3 | 7>(1)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadDuels()
    loadPlayers()
  }, [])

  const loadDuels = async () => {
    const data = await getMyDuels(profile.id)
    setDuels(data)
  }

  const loadPlayers = async () => {
    const { data } = await supabase
      .from('players')
      .select('id, name, team, total_reps')
      .neq('id', profile.id)
      .order('total_reps', { ascending: false })
      .limit(50)
    if (data) setPlayers(data.map((r: any) => ({
      id: r.id, name: r.name, team: r.team || '', totalReps: r.total_reps || 0
    })))
  }

  const handleChallenge = async () => {
    if (!selectedOpponent) return
    setLoading(true)
    const result = await sendDuelChallenge(profile, selectedOpponent.id, selectedOpponent.name, selectedDays)
    if (result.success) {
      setMessage(`Herausforderung an ${selectedOpponent.name} gesendet! ⚔️`)
      setSelectedOpponent(null)
      loadDuels()
      setTab('active')
    } else {
      setMessage('Fehler: ' + result.error)
    }
    setLoading(false)
    setTimeout(() => setMessage(''), 3000)
  }

  const handleAccept = async (duelId: string) => {
    await acceptDuel(duelId)
    loadDuels()
  }

  const handleDecline = async (duelId: string) => {
    await declineDuel(duelId)
    loadDuels()
  }

  const pendingDuels = duels.filter(d => d.status === 'pending' && d.opponentId === profile.id)
  const activeDuels = duels.filter(d => d.status === 'active')
  const finishedDuels = duels.filter(d => d.status === 'completed' || d.status === 'declined')

  const getDaysLeft = (endsAt: string | null) => {
    if (!endsAt) return 0
    const diff = new Date(endsAt).getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 px-3 pt-safe-top pb-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-zinc-400 hover:text-white text-xl">←</button>
          <div>
            <h1 className="text-base font-bold text-red-500">⚔️ Dojo-Duelle</h1>
            <p className="text-[10px] text-zinc-500">Fordere andere Kämpfer heraus</p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        <button
          onClick={() => setTab('active')}
          className={`flex-1 py-2.5 text-xs font-bold transition-colors ${tab === 'active' ? 'text-red-500 border-b-2 border-red-500' : 'text-zinc-500'}`}
        >
          Meine Duelle {pendingDuels.length > 0 && <span className="ml-1 bg-red-600 text-white rounded-full px-1.5 py-0.5">{pendingDuels.length}</span>}
        </button>
        <button
          onClick={() => setTab('new')}
          className={`flex-1 py-2.5 text-xs font-bold transition-colors ${tab === 'new' ? 'text-red-500 border-b-2 border-red-500' : 'text-zinc-500'}`}
        >
          Herausfordern
        </button>
      </div>

      <main className="p-3 space-y-3">
        {message && <p className="text-center text-xs text-green-400 bg-green-950/30 rounded-lg p-2">{message}</p>}

        {tab === 'active' && (
          <>
            {/* Ausstehende Herausforderungen */}
            {pendingDuels.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-500 mb-2">⏳ Offene Herausforderungen</p>
                {pendingDuels.map(duel => (
                  <div key={duel.id} className="rounded-lg border border-yellow-900/50 bg-yellow-950/20 p-3 mb-2">
                    <p className="text-white font-bold text-sm mb-1">⚔️ {duel.challengerName} fordert dich heraus!</p>
                    <p className="text-zinc-400 text-xs mb-3">Dauer: {duel.durationDays} Tag{duel.durationDays > 1 ? 'e' : ''}</p>
                    <div className="flex gap-2">
                      <button onClick={() => handleAccept(duel.id)} className="flex-1 bg-green-700 text-white py-2 rounded-lg text-xs font-bold">✅ Annehmen</button>
                      <button onClick={() => handleDecline(duel.id)} className="flex-1 bg-zinc-800 text-zinc-300 py-2 rounded-lg text-xs font-bold">❌ Ablehnen</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Aktive Duelle */}
            {activeDuels.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-red-500 mb-2">🔥 Aktive Duelle</p>
                {activeDuels.map(duel => {
                  const isChallenger = duel.challengerId === profile.id
                  const myReps = isChallenger ? duel.challengerReps : duel.opponentReps
                  const theirReps = isChallenger ? duel.opponentReps : duel.challengerReps
                  const opponent = isChallenger ? duel.opponentName : duel.challengerName
                  const winning = myReps >= theirReps
                  return (
                    <div key={duel.id} className="rounded-lg border border-red-900/30 bg-zinc-900/50 p-3 mb-2">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-white font-bold text-sm">vs {opponent}</p>
                        <p className="text-[10px] text-zinc-400">{getDaysLeft(duel.endsAt)} Tage noch</p>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-center">
                          <p className="text-2xl font-black text-white">{myReps}</p>
                          <p className="text-[9px] text-zinc-500">Du</p>
                        </div>
                        <div className={`text-sm font-black ${winning ? 'text-green-500' : 'text-red-500'}`}>
                          {winning ? '👑 Führend' : '💪 Aufholen'}
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-black text-red-500">{theirReps}</p>
                          <p className="text-[9px] text-zinc-500">{opponent}</p>
                        </div>
                      </div>
                      <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-2 rounded-full bg-green-500 transition-all"
                          style={{ width: `${myReps + theirReps === 0 ? 50 : (myReps / (myReps + theirReps)) * 100}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {pendingDuels.length === 0 && activeDuels.length === 0 && (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">⚔️</p>
                <p className="text-zinc-500 text-sm">Noch keine Duelle</p>
                <p className="text-zinc-600 text-xs mt-1">Fordere jemanden heraus!</p>
                <button onClick={() => setTab('new')} className="mt-4 bg-red-600 text-white px-6 py-2 rounded-lg text-sm font-bold">Jetzt herausfordern</button>
              </div>
            )}
          </>
        )}

        {tab === 'new' && (
          <>
            {/* Dauer wählen */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Dauer wählen</p>
              <div className="flex gap-2">
                {([1, 3, 7] as const).map(days => (
                  <button
                    key={days}
                    onClick={() => setSelectedDays(days)}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-colors ${selectedDays === days ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}
                  >
                    {days} Tag{days > 1 ? 'e' : ''}
                  </button>
                ))}
              </div>
            </div>

            {/* Gegner wählen */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Gegner wählen</p>
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {players.map((player, index) => (
                  <div
                    key={player.id}
                    onClick={() => setSelectedOpponent(selectedOpponent?.id === player.id ? null : { id: player.id, name: player.name })}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-colors ${selectedOpponent?.id === player.id ? 'bg-red-950/50 border border-red-700' : 'bg-zinc-800/50 hover:bg-zinc-700/50'}`}
                  >
                    <span className="text-[10px] text-zinc-500 w-5">{index + 1}</span>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-white">{player.name}</p>
                      {player.team && <p className="text-[9px] text-zinc-500">{player.team}</p>}
                    </div>
                    <p className="text-xs font-bold text-red-500">{player.totalReps}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Herausfordern Button */}
            {selectedOpponent && (
              <button
                onClick={handleChallenge}
                disabled={loading}
                className="w-full bg-gradient-to-r from-red-700 to-red-600 text-white py-3 rounded-lg font-bold text-sm disabled:opacity-50"
              >
                {loading ? 'Wird gesendet...' : `⚔️ ${selectedOpponent.name} herausfordern (${selectedDays} Tag${selectedDays > 1 ? 'e' : ''})`}
              </button>
            )}
          </>
        )}
      </main>
    </div>
  )
}