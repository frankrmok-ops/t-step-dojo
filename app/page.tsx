'use client'

import { useState, useEffect } from 'react'
import { PlayerProfile, getPlayerProfile, logoutUser } from '@/lib'
import { AuthScreen } from '@/components/auth-screen'
import { Dashboard } from '@/components/dashboard'
import { TrainingMode } from '@/components/training-mode'
import { TrainingComplete } from '@/components/training-complete'
import { AdminPanel } from '@/components/admin-panel'

type AppState = 'auth' | 'dashboard' | 'training' | 'loading' | 'complete'

interface TrainingConfig {
  targetReps: number
  minSeconds: number
  maxSeconds: number
}


export default function Home() {
  const [appState, setAppState] = useState<AppState>('loading')
  const [profile, setProfile] = useState<PlayerProfile | null>(null)
  const [trainingConfig, setTrainingConfig] = useState<TrainingConfig>({
    targetReps: 10,
    minSeconds: 1,
    maxSeconds: 5
  })
  const [sessionReps, setSessionReps] = useState(0)
  const [previousBelt, setPreviousBelt] = useState('')
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null)
  const [showAdmin, setShowAdmin] = useState(false)

  // Auto-login: check for existing active session on mount
  useEffect(() => {
    const existingProfile = getPlayerProfile()
    if (existingProfile) {
      setProfile(existingProfile)
      setAppState('dashboard')
    } else {
      setAppState('auth')
    }
  }, [])

  const handleLogin = (newProfile: any) => {
    const profileObj = newProfile as PlayerProfile
    setProfile(profileObj)
    setAppState('dashboard')
  }

  const handleLogout = () => {
    logoutUser()
    setProfile(null)
    setVideoBlob(null)
    setAppState('auth')
  }

  const handleStartTraining = (targetReps: number, minSeconds: number, maxSeconds: number) => {
    if (profile) {
      setPreviousBelt(profile.belt)
      setTrainingConfig({ targetReps, minSeconds, maxSeconds })
      setVideoBlob(null)
      setAppState('training')
    }
  }

  const handleTrainingComplete = (updatedProfile: PlayerProfile, recordedVideo: Blob | null) => {
    const repsCompleted = updatedProfile.totalReps - (profile?.totalReps || 0)
    setSessionReps(repsCompleted)
    setProfile(updatedProfile)
    setVideoBlob(recordedVideo)
    setAppState('complete')
  }

  const handleContinue = () => {
    setVideoBlob(null)
    setAppState('dashboard')
  }

  const handleExitTraining = () => {
    setVideoBlob(null)
    setAppState('dashboard')
  }

  const handleProfileCleared = () => {
    setProfile(null)
    setVideoBlob(null)
    setAppState('auth')
  }

  // Loading state
  if (appState === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="animate-pulse text-red-500">Laden...</div>
      </div>
    )
  }

  return (
    <>
      {appState === 'auth' && (
        <AuthScreen onLogin={handleLogin} />
      )}

      {appState === 'dashboard' && profile && (
        <Dashboard
          profile={profile}
          onStartTraining={handleStartTraining}
          onAdminClick={() => setShowAdmin(true)}
          onLogout={handleLogout}
        />
      )}

      {appState === 'training' && profile && (
        <TrainingMode
          profile={profile}
          targetReps={trainingConfig.targetReps}
          minSeconds={trainingConfig.minSeconds}
          maxSeconds={trainingConfig.maxSeconds}
          onComplete={handleTrainingComplete}
          onExit={handleExitTraining}
        />
      )}

      {appState === 'complete' && profile && (
        <TrainingComplete
          profile={profile}
          sessionReps={sessionReps}
          previousBelt={previousBelt}
          videoBlob={videoBlob}
          onContinue={handleContinue}
        />
      )}

      {showAdmin && (
        <AdminPanel
          profile={profile}
          onProfileCleared={handleProfileCleared}
          onClose={() => setShowAdmin(false)}
        />
      )}
    </>
  )
}
