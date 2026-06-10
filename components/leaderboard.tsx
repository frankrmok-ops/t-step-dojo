'use client'

import { useState, useEffect } from 'react'
import { PlayerProfile, BELT_LABELS, BeltLevel } from '@/lib/storage'
import { supabase } from '@/lib/supabase'

const BELTS = [
  { name: 'Alle', color: 'bg-zinc-600', text: 'text-white', border: 'border-zinc-500', minReps: 0, maxReps: Infinity },
  { name: 'Weiß', color: 'bg-white', text: 'text-black', border: 'border-white', minReps: 0, maxReps: 249 },
  { name: 'Gelb', color: 'bg-yellow-400', text: 'text-black', border: 'border-yellow-400', minReps: 250, maxReps: 749 },
  { name: 'Orange', color: 'bg-orange-500', text: 'text-white', border: 'border-orange-500', minReps: 750, maxReps: 1749 },
  { name: 'Grün', color: 'bg-green-600', text: 'text-white', border: 'border-green-600', minReps: 1750, maxReps: 3749 },
  { name: 'Blau', color: 'bg-blue-600', text: 'text-white', border: 'border-blue-600', minReps: 3750, maxReps: 8249 },
  { name: 'Braun', color: 'bg-amber-800', text: 'text-white', border: 'border-amber-800', minReps: 8250, maxReps: 18249 },
  { name: 'Schwarz', color: 'bg-zinc-900', text: 'text-white', border: 'border-zinc-400', minReps: 18250, maxReps: Infinity },
]

interface LeaderboardProps {
  currentUserId: string
  onBack: () => void
}

export default function Leaderboard({ currentUserId, onBack }: LeaderboardProps) {
  const [activeBelt, setActiveBelt] = useState('Alle')
  const [allUsers, setAllUsers] = useState<PlayerProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('total_reps', { ascending: false })

      if (!error && data) {
        const profiles: PlayerProfile[] = data.map((row: any) => ({
          id: row.id,
          name: row.name,
          team: row.team || '',
          email: row.email,
          passwordHash: row.password_hash,
          securityQuestion: row.security_question || '',
          securityAnswer: row.security_answer || '',
          totalReps: row.total_reps || 0,
          belt: (row.belt as BeltLevel) || 'white',
          createdAt: row.created_at,
          lastTrainingDate: row.last_training_date,
          trainingHistory: row.training_history || []
        }))
        setAllUsers(profiles)
      }
      setLoading(false)
    }
    fetchUsers()
  }, [])

  const activeBeltData = BELTS.find(b => b.name === activeBelt)!

  const filtered = allUsers.filter(u => {
    if (activeBelt === 'Alle') return true
    return u.totalReps >= activeBeltData.minReps && u.totalReps <= activeBeltData.maxReps
  })

  const myRank = allUsers.findIndex(u => u.id === currentUserId) + 1
  const me = allUsers.find(u => u.id === currentUserId)

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-4 border-b border-zinc-800">
        <button
          onClick={onBack}
          className="text-zinc-400 hover:text-white transition-colors text-2xl leading-none"
        >
          ←
        </button>
        <h1 className="text-2xl font-black tracking-widest uppercase text-red-600">
          Rangliste
        </h1>
        {!loading && (
          <span className="ml-auto text-xs text-zinc-500">{allUsers.length} Kämpfer</span>
        )}
      </div>

      {/* Gürtel Tabs */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto border-b border-zinc-800">
        {BELTS.map(belt => (
          <button
            key={belt.name}
            onClick={() => setActiveBelt(belt.name)}
            className={`
              flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all
              ${belt.color} ${belt.text} ${belt.border}
              ${activeBelt === belt.name ? 'scale-105 shadow-lg' : 'opacity-50'}
            `}
          >
            {belt.name}
          </button>
        ))}
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="text-center text-zinc-500 mt-20 text-sm">Lade Rangliste…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-zinc-500 mt-20 text-sm">
            Noch keine Kämpfer in dieser Gürtelklasse.
          </div>
        ) : (
          filtered.map((user, index) => {
            const isCurrentUser = user.id === currentUserId
            const rank = allUsers.findIndex(u => u.id === user.id) + 1
            const userBelt = BELTS.slice(1).reverse().find(b => user.totalReps >= b.minReps)

            return (
              <div
                key={user.id}
                className={`
                  flex items-center gap-4 rounded-xl px-4 py-3 border
                  ${isCurrentUser
                    ? 'bg-red-950/40 border-red-600'
                    : 'bg-zinc-900 border-zinc-800'}
                `}
              >
                {/* Rang */}
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-black text-lg flex-shrink-0
                  ${rank === 1 ? 'bg-yellow-400 text-black' :
                    rank === 2 ? 'bg-zinc-400 text-black' :
                    rank === 3 ? 'bg-amber-700 text-white' :
                    'bg-zinc-800 text-zinc-300'}
                `}>
                  {rank}
                </div>

                {/* Name + Gürtel */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className={`font-bold text-base truncate ${isCurrentUser ? 'text-red-400' : 'text-white'}`}>
                      {user.name}
                    </span>
                    {isCurrentUser && (
                      <span className="text-xs text-red-500">(Du)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {userBelt && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${userBelt.color} ${userBelt.text}`}>
                        {userBelt.name}
                      </span>
                    )}
                    {user.team && (
                      <span className="text-xs text-zinc-500 truncate">{user.team}</span>
                    )}
                  </div>
                </div>

                {/* Reps */}
                <div className="flex-shrink-0 text-right">
                  <div className="text-xl font-black text-red-500">
                    {user.totalReps.toLocaleString('de-DE')}
                  </div>
                  <div className="text-xs text-zinc-500">Reps</div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer — eigener Rang */}
      {me && (
        <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-950">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Dein Rang:</span>
            <span className="font-black text-red-500 text-lg">#{myRank}</span>
            <span className="text-zinc-300 font-bold">{me.totalReps.toLocaleString('de-DE')} Reps</span>
          </div>
        </div>
      )}
    </div>
  )
}
