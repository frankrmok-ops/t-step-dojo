'use client'

import { useState, useEffect } from 'react'
import { PlayerProfile, getAllDonations, addDonation, Donation } from '@/lib'
import { CrossedKatanas } from './crossed-katanas'

interface SupportersProps {
  profile: PlayerProfile
  onBack: () => void
}

const PAYPAL_URL = 'https://www.paypal.com/donate?business=frank.r.mok%40googlemail.com&currency_code=EUR'

export function Supporters({ profile, onBack }: SupportersProps) {
  const [donations, setDonations] = useState<Donation[]>([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState(profile.name)
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [amountError, setAmountError] = useState('')

  useEffect(() => {
    getAllDonations().then(data => setDonations(data))
  }, [])

  const handlePayPal = () => {
    window.open(PAYPAL_URL, '_blank')
    setShowForm(true)
  }

  const handleSubmitEntry = async () => {
    setAmountError('')
    const parsedAmount = parseFloat(amount.replace(',', '.'))
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setAmountError('Bitte gib einen gültigen Betrag ein')
      return
    }
    if (!name.trim() && !isAnonymous) return
    const donation = await addDonation(
      name.trim() || 'Anonym',
      parsedAmount,
      message.trim(),
      isAnonymous
    )
    setDonations([donation, ...donations])
    setSubmitted(true)
    setShowForm(false)
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 p-3">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div className="flex items-center gap-2">
            <CrossedKatanas className="h-8 w-8" />
            <div>
              <h1 className="text-base font-bold text-red-500">T-Step DOJO</h1>
              <p className="text-[10px] text-zinc-500">Supporter & Spende</p>
            </div>
          </div>
          <button
            onClick={onBack}
            className="rounded bg-zinc-800 px-3 py-1 text-xs text-zinc-400 hover:bg-zinc-700 hover:text-white"
          >
            ← Zurück
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-4 p-3">
        {/* Donation Hero */}
        <div className="rounded-lg border border-yellow-900/40 bg-gradient-to-b from-yellow-950/20 to-zinc-900/50 p-4 text-center">
          <p className="mb-1 text-2xl">💛</p>
          <h2 className="mb-1 text-xl font-bold text-white">DOJO Supporter & Spende</h2>
          <p className="mb-1 text-xs text-zinc-400">
            Jede Spende — egal wie klein — hilft dabei, T-Step DOJO weiterzuentwickeln.
          </p>
          <p className="mb-4 text-xs font-bold text-yellow-500">
            100% der Spenden fließen direkt in die Weiterentwicklung der App.
          </p>
          <button
            onClick={handlePayPal}
            className="w-full rounded-lg bg-gradient-to-r from-yellow-600 to-yellow-500 py-3 text-sm font-bold text-black shadow-lg shadow-yellow-900/30 hover:from-yellow-500 hover:to-yellow-400 active:from-yellow-700 active:to-yellow-600"
          >
            💰 Jetzt via PayPal spenden
          </button>
          <p className="mt-2 text-[10px] text-zinc-500">
            Du entscheidest den Betrag — alle Beträge sind willkommen.
          </p>
        </div>

        {/* Post-payment form */}
        {showForm && !submitted && (
          <div className="rounded-lg border border-yellow-900/50 bg-zinc-900/50 p-4">
            <h3 className="mb-1 text-sm font-bold text-yellow-400">
              Danke für deine Spende! 🙏
            </h3>
            <p className="mb-3 text-xs text-zinc-500">
              Trag dich optional in die Supporter Wall ein:
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="anonymous"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="accent-yellow-500"
                />
                <label htmlFor="anonymous" className="text-xs text-zinc-400">
                  Anonym eintragen
                </label>
              </div>

              {!isAnonymous && (
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-yellow-500 focus:outline-none"
                    placeholder="Dein Name"
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs text-zinc-400">
                  Gespendeter Betrag (€)
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value)
                    setAmountError('')
                  }}
                  className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-yellow-500 focus:outline-none"
                  placeholder="z.B. 5.00"
                />
                {amountError && (
                  <p className="mt-1 text-xs text-red-500">{amountError}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs text-zinc-400">
                  Nachricht (optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-yellow-500 focus:outline-none"
                  placeholder="Deine Nachricht ans Dojo..."
                  rows={2}
                />
              </div>

              <button
                onClick={handleSubmitEntry}
                className="w-full rounded-lg bg-gradient-to-r from-yellow-600 to-yellow-500 py-2.5 text-sm font-bold text-black hover:from-yellow-500 hover:to-yellow-400"
              >
                In Supporter Wall eintragen
              </button>
            </div>
          </div>
        )}

        {submitted && (
          <div className="rounded-lg border border-green-800 bg-green-950/30 p-3 text-center">
            <p className="text-sm font-bold text-green-400">
              Danke für deine Unterstützung! Du bist jetzt in der Supporter Wall! 🏆
            </p>
          </div>
        )}

        {/* Supporter Wall */}
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
            Supporter Wall
          </h3>
          {donations.length === 0 ? (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-6 text-center">
              <p className="text-sm text-zinc-600">
                Noch keine Supporter. Sei der Erste! 💛
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {donations.map((donation, index) => (
                <div
                  key={donation.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-600">#{index + 1}</span>
                      <div>
                        <p className="text-sm font-bold text-white">
                          {donation.isAnonymous ? '🥷 Anonym' : donation.name}
                        </p>
                        {donation.message && (
                          <p className="text-xs text-zinc-400">{donation.message}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-yellow-500">
                        {donation.amount.toFixed(2)}€
                      </p>
                      <p className="text-[10px] text-zinc-600">
                        {new Date(donation.date).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}