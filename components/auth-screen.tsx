'use client'

import { useState } from 'react'
import { registerUser, loginUser, PlayerProfile, SECURITY_QUESTIONS, getSecurityQuestion, resetPassword } from '@/lib'
import { CrossedKatanas } from './crossed-katanas'

interface AuthScreenProps {
  onLogin: (profile: PlayerProfile) => void
}

type AuthMode = 'login' | 'register' | 'forgot'

function EyeIcon({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    )
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  )
}

function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  autoComplete
}: {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  autoComplete: string
}) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 pr-10 text-sm text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none"
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
        tabIndex={-1}
      >
        <EyeIcon visible={visible} />
      </button>
    </div>
  )
}

export function AuthScreen({ onLogin }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const [regName, setRegName] = useState('')
  const [regTeam, setRegTeam] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirmPassword, setRegConfirmPassword] = useState('')
  const [regSecurityQuestion, setRegSecurityQuestion] = useState(SECURITY_QUESTIONS[0])
  const [regSecurityAnswer, setRegSecurityAnswer] = useState('')

  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotStep, setForgotStep] = useState<'email' | 'answer' | 'newpass'>('email')
  const [forgotQuestion, setForgotQuestion] = useState('')
  const [forgotAnswer, setForgotAnswer] = useState('')
  const [forgotNewPassword, setForgotNewPassword] = useState('')
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!loginEmail.trim() || !loginPassword) {
      setError('Bitte alle Felder ausfüllen')
      triggerShake()
      setLoading(false)
      return
    }

    const result = await loginUser(loginEmail.trim(), loginPassword)

    if (result.success && result.profile) {
      onLogin(result.profile)
    } else {
      setError('Falsches Passwort oder E-Mail-Adresse. Bitte überprüfe deine Eingabe.')
      triggerShake()
    }
    setLoading(false)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!regName.trim()) {
      setError('Athleten-Name ist erforderlich')
      triggerShake()
      setLoading(false)
      return
    }
    if (regName.trim().length < 2) {
      setError('Name muss mindestens 2 Zeichen haben')
      triggerShake()
      setLoading(false)
      return
    }
    if (!regEmail.trim()) {
      setError('E-Mail-Adresse ist erforderlich')
      triggerShake()
      setLoading(false)
      return
    }
    if (!regEmail.includes('@')) {
      setError('Ungültige E-Mail-Adresse')
      triggerShake()
      setLoading(false)
      return
    }
    if (!regPassword) {
      setError('Passwort ist erforderlich')
      triggerShake()
      setLoading(false)
      return
    }
    if (regPassword.length < 4) {
      setError('Passwort muss mindestens 4 Zeichen haben')
      triggerShake()
      setLoading(false)
      return
    }
    if (regPassword !== regConfirmPassword) {
      setError('Passwörter stimmen nicht überein')
      triggerShake()
      setLoading(false)
      return
    }
    if (!regSecurityAnswer.trim()) {
      setError('Sicherheitsantwort ist erforderlich')
      triggerShake()
      setLoading(false)
      return
    }

    const result = await registerUser(
      regName.trim(),
      regTeam.trim(),
      regEmail.trim(),
      regPassword,
      regSecurityQuestion,
      regSecurityAnswer
    )

    if (result.success && result.profile) {
      onLogin(result.profile)
    } else {
      setError(result.error || 'Registrierung fehlgeschlagen')
      triggerShake()
    }
    setLoading(false)
  }

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')

    if (forgotStep === 'email') {
      const result = await getSecurityQuestion(forgotEmail.trim())
      if (result.success && result.question) {
        setForgotQuestion(result.question)
        setForgotStep('answer')
      } else {
        setError(result.error || 'E-Mail nicht gefunden')
        triggerShake()
      }
    } else if (forgotStep === 'answer') {
      if (!forgotAnswer.trim()) {
        setError('Bitte beantworte die Sicherheitsfrage')
        triggerShake()
        return
      }
      setForgotStep('newpass')
    } else if (forgotStep === 'newpass') {
      if (!forgotNewPassword) {
        setError('Neues Passwort ist erforderlich')
        triggerShake()
        return
      }
      if (forgotNewPassword.length < 4) {
        setError('Passwort muss mindestens 4 Zeichen haben')
        triggerShake()
        return
      }
      if (forgotNewPassword !== forgotConfirmPassword) {
        setError('Passwörter stimmen nicht überein')
        triggerShake()
        return
      }

      const result = await resetPassword(forgotEmail.trim(), forgotAnswer, forgotNewPassword)
      if (result.success) {
        setSuccessMessage('Passwort erfolgreich geändert! Du kannst dich jetzt anmelden.')
        setTimeout(() => {
          setMode('login')
          setSuccessMessage('')
          setForgotStep('email')
          setForgotEmail('')
          setForgotAnswer('')
          setForgotNewPassword('')
          setForgotConfirmPassword('')
        }, 2000)
      } else {
        setError(result.error || 'Passwort konnte nicht geändert werden')
        triggerShake()
      }
    }
  }

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode)
    setError('')
    setSuccessMessage('')
    if (newMode === 'forgot') {
      setForgotStep('email')
    }
  }

  const shakeClass = shake ? 'animate-[shake_0.5s_ease-in-out]' : ''

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-4">
      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
      `}</style>

      <div className="mb-6 flex flex-col items-center">
        <CrossedKatanas className="mb-3 h-16 w-16" />
        <h1 className="text-xl font-bold text-red-500">T-Step DOJO</h1>
        <p className="text-xs text-zinc-500">Reflex Training System</p>
      </div>

      {mode !== 'forgot' && (
        <div className="mb-4 flex w-full max-w-xs overflow-hidden rounded-lg border border-zinc-700">
          <button
            onClick={() => switchMode('login')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              mode === 'login'
                ? 'bg-red-600 text-white'
                : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            Anmelden
          </button>
          <button
            onClick={() => switchMode('register')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              mode === 'register'
                ? 'bg-red-600 text-white'
                : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            Registrieren
          </button>
        </div>
      )}

      {mode === 'forgot' && (
        <div className="mb-4 w-full max-w-xs">
          <button
            onClick={() => switchMode('login')}
            className="mb-2 flex items-center text-sm text-zinc-400 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Zurück zur Anmeldung
          </button>
          <h2 className="text-lg font-bold text-white">Passwort vergessen?</h2>
          <p className="text-xs text-zinc-500">
            {forgotStep === 'email' && 'Gib deine E-Mail-Adresse ein'}
            {forgotStep === 'answer' && 'Beantworte deine Sicherheitsfrage'}
            {forgotStep === 'newpass' && 'Wähle ein neues Passwort'}
          </p>
        </div>
      )}

      {mode === 'login' && (
        <form onSubmit={handleLogin} className={`w-full max-w-xs space-y-3 ${shakeClass}`}>
          <div>
            <label htmlFor="login-email" className="mb-1 block text-xs text-zinc-400">
              E-Mail-Adresse
            </label>
            <input
              id="login-email"
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none"
              placeholder="deine@email.de"
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="mb-1 block text-xs text-zinc-400">
              Passwort
            </label>
            <PasswordInput
              id="login-password"
              value={loginPassword}
              onChange={setLoginPassword}
              placeholder="Passwort eingeben"
              autoComplete="current-password"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gradient-to-r from-red-700 to-red-600 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-900/30 hover:from-red-600 hover:to-red-500 active:from-red-800 active:to-red-700 disabled:opacity-50"
          >
            {loading ? 'Laden...' : 'Anmelden'}
          </button>

          <button
            type="button"
            onClick={() => switchMode('forgot')}
            className="w-full text-center text-xs text-zinc-500 hover:text-red-400"
          >
            Passwort vergessen?
          </button>
        </form>
      )}

      {mode === 'register' && (
        <form onSubmit={handleRegister} className={`w-full max-w-xs space-y-2.5 ${shakeClass}`}>
          <div>
            <label htmlFor="reg-name" className="mb-1 block text-xs text-zinc-400">
              Athleten-Name *
            </label>
            <input
              id="reg-name"
              type="text"
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none"
              placeholder="Dein Name"
              autoComplete="name"
            />
          </div>
          <div>
            <label htmlFor="reg-team" className="mb-1 block text-xs text-zinc-400">
              Team/Verein
            </label>
            <input
              id="reg-team"
              type="text"
              value={regTeam}
              onChange={(e) => setRegTeam(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none"
              placeholder="Dein Team oder Verein"
              autoComplete="organization"
            />
          </div>
          <div>
            <label htmlFor="reg-email" className="mb-1 block text-xs text-zinc-400">
              E-Mail-Adresse *
            </label>
            <input
              id="reg-email"
              type="email"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none"
              placeholder="deine@email.de"
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="reg-password" className="mb-1 block text-xs text-zinc-400">
              Passwort *
            </label>
            <PasswordInput
              id="reg-password"
              value={regPassword}
              onChange={setRegPassword}
              placeholder="Passwort wählen"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label htmlFor="reg-confirm" className="mb-1 block text-xs text-zinc-400">
              Passwort bestätigen *
            </label>
            <PasswordInput
              id="reg-confirm"
              value={regConfirmPassword}
              onChange={setRegConfirmPassword}
              placeholder="Passwort wiederholen"
              autoComplete="new-password"
            />
          </div>

          <div>
            <label htmlFor="reg-security-q" className="mb-1 block text-xs text-zinc-400">
              Sicherheitsfrage *
            </label>
            <select
              id="reg-security-q"
              value={regSecurityQuestion}
              onChange={(e) => setRegSecurityQuestion(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
            >
              {SECURITY_QUESTIONS.map((q) => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="reg-security-a" className="mb-1 block text-xs text-zinc-400">
              Sicherheitsantwort *
            </label>
            <input
              id="reg-security-a"
              type="text"
              value={regSecurityAnswer}
              onChange={(e) => setRegSecurityAnswer(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none"
              placeholder="Deine Antwort"
              autoComplete="off"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gradient-to-r from-red-700 to-red-600 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-900/30 hover:from-red-600 hover:to-red-500 active:from-red-800 active:to-red-700 disabled:opacity-50"
          >
            {loading ? 'Laden...' : 'Registrieren'}
          </button>
        </form>
      )}

      {mode === 'forgot' && (
        <form onSubmit={handleForgotSubmit} className={`w-full max-w-xs space-y-3 ${shakeClass}`}>
          {forgotStep === 'email' && (
            <div>
              <label htmlFor="forgot-email" className="mb-1 block text-xs text-zinc-400">
                E-Mail-Adresse
              </label>
              <input
                id="forgot-email"
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none"
                placeholder="deine@email.de"
                autoComplete="email"
              />
            </div>
          )}

          {forgotStep === 'answer' && (
            <>
              <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-3">
                <p className="text-xs text-zinc-400">Sicherheitsfrage:</p>
                <p className="text-sm font-medium text-white">{forgotQuestion}</p>
              </div>
              <div>
                <label htmlFor="forgot-answer" className="mb-1 block text-xs text-zinc-400">
                  Deine Antwort
                </label>
                <input
                  id="forgot-answer"
                  type="text"
                  value={forgotAnswer}
                  onChange={(e) => setForgotAnswer(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none"
                  placeholder="Antwort eingeben"
                  autoComplete="off"
                />
              </div>
            </>
          )}

          {forgotStep === 'newpass' && (
            <>
              <div>
                <label htmlFor="forgot-newpass" className="mb-1 block text-xs text-zinc-400">
                  Neues Passwort
                </label>
                <PasswordInput
                  id="forgot-newpass"
                  value={forgotNewPassword}
                  onChange={setForgotNewPassword}
                  placeholder="Neues Passwort"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label htmlFor="forgot-confirm" className="mb-1 block text-xs text-zinc-400">
                  Passwort bestätigen
                </label>
                <PasswordInput
                  id="forgot-confirm"
                  value={forgotConfirmPassword}
                  onChange={setForgotConfirmPassword}
                  placeholder="Passwort wiederholen"
                  autoComplete="new-password"
                />
              </div>
            </>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}
          {successMessage && <p className="text-xs text-green-500">{successMessage}</p>}

          <button
            type="submit"
            className="w-full rounded-lg bg-gradient-to-r from-red-700 to-red-600 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-900/30 hover:from-red-600 hover:to-red-500 active:from-red-800 active:to-red-700"
          >
            {forgotStep === 'email' && 'Weiter'}
            {forgotStep === 'answer' && 'Antwort prüfen'}
            {forgotStep === 'newpass' && 'Passwort speichern'}
          </button>
        </form>
      )}

      <div className="mt-8 text-center">
        <p className="text-[10px] text-zinc-600">
          &quot;Der Weg ist das Ziel&quot;
        </p>
        <p className="mt-0.5 text-[10px] text-zinc-700">- Konfuzius</p>
      </div>
    </div>
  )
}