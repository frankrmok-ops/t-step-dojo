'use client'

import { useState } from 'react'
import { verifyAdminPin, PlayerProfile, BELT_LABELS, clearPlayerProfile } from '@/lib/storage'

interface AdminPanelProps {
  profile: PlayerProfile | null
  onProfileCleared: () => void
  onClose: () => void
}

export function AdminPanel({ profile, onProfileCleared, onClose }: AdminPanelProps) {
  const [pin, setPin] = useState('')
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handlePinSubmit = () => {
    if (verifyAdminPin(pin)) {
      setIsUnlocked(true)
      setError('')
    } else {
      setError('Falscher PIN')
      setPin('')
    }
  }

  const handleDeleteProfile = () => {
    if (confirmDelete) {
      clearPlayerProfile()
      onProfileCleared()
      onClose()
    } else {
      setConfirmDelete(true)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-md rounded-lg border-2 border-red-600 bg-zinc-900 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-red-500">T-Step DOJO Admin</h2>
          <button
            onClick={onClose}
            className="text-2xl text-zinc-400 hover:text-white"
          >
            &times;
          </button>
        </div>

        {!isUnlocked ? (
          <div className="space-y-4">
            <p className="text-sm text-zinc-400">PIN eingeben um fortzufahren:</p>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
              className="w-full rounded border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-red-500 focus:outline-none"
              placeholder="PIN"
              autoFocus
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              onClick={handlePinSubmit}
              className="w-full rounded bg-red-600 py-2 font-bold text-white hover:bg-red-700"
            >
              Entsperren
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {profile ? (
              <>
                <div className="rounded border border-zinc-700 bg-zinc-800 p-4">
                  <h3 className="mb-2 font-bold text-white">Spieler Info</h3>
                  <p className="text-sm text-zinc-400">Name: <span className="text-white">{profile.name}</span></p>
                  <p className="text-sm text-zinc-400">Gürtel: <span className="text-white">{BELT_LABELS[profile.belt]}</span></p>
                  <p className="text-sm text-zinc-400">Gesamt Wiederholungen: <span className="text-white">{profile.totalReps}</span></p>
                  <p className="text-sm text-zinc-400">Trainingseinheiten: <span className="text-white">{profile.trainingHistory.length}</span></p>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={handleDeleteProfile}
                    className={`w-full rounded py-2 font-bold text-white ${
                      confirmDelete
                        ? 'bg-red-700 hover:bg-red-800'
                        : 'bg-zinc-700 hover:bg-zinc-600'
                    }`}
                  >
                    {confirmDelete ? 'Wirklich löschen?' : 'Profil löschen'}
                  </button>
                  {confirmDelete && (
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="w-full rounded bg-zinc-600 py-2 text-white hover:bg-zinc-500"
                    >
                      Abbrechen
                    </button>
                  )}
                </div>
              </>
            ) : (
              <p className="text-center text-zinc-400">Kein Profil gefunden</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
