import { supabase } from './supabase'

// Belt system constants
export type BeltLevel = 'white' | 'yellow' | 'orange' | 'green' | 'blue' | 'brown' | 'black'

export const BELT_ORDER: BeltLevel[] = ['white', 'yellow', 'orange', 'green', 'blue', 'brown', 'black']

export const BELT_LABELS: Record<BeltLevel, string> = {
  white: 'Weißgurt',
  yellow: 'Gelbgurt',
  orange: 'Orangegurt',
  green: 'Grüngurt',
  blue: 'Blaugurt',
  brown: 'Braungurt',
  black: 'Schwarzgurt'
}

export const BELT_THRESHOLDS: Record<BeltLevel, number> = {
  white: 0,
  yellow: 250,
  orange: 750,
  green: 1750,
  blue: 3750,
  brown: 8250,
  black: 18250
}

export const BELT_COLORS: Record<BeltLevel, string> = {
  white: '#ffffff',
  yellow: '#ffd700',
  orange: '#ff8c00',
  green: '#228b22',
  blue: '#1e90ff',
  brown: '#8b4513',
  black: '#1a1a1a'
}

export const SECURITY_QUESTIONS = [
  'Wie heißt dein Football-Team?',
  'Was ist der Name deines ersten Haustieres?',
  'In welcher Stadt bist du geboren?',
  'Wie heißt dein Lieblingstrainer?',
  'Was ist dein Lieblingsfilm?'
]

export interface TrainingSession {
  date: string
  reps: number
  targetReps: number
  minSeconds: number
  maxSeconds: number
  videoUrl?: string
}

export interface PlayerProfile {
  id: string
  name: string
  team: string
  email: string
  passwordHash: string
  securityQuestion: string
  securityAnswer: string
  totalReps: number
  belt: BeltLevel
  createdAt: string
  lastTrainingDate: string
  trainingHistory: TrainingSession[]
}

export interface Donation {
  id: string
  name: string
  amount: number
  message: string
  isAnonymous: boolean
  date: string
}

// Storage keys (nur für Session)
const ACTIVE_SESSION_KEY = 'tstep_dojo_active_session'
const ADMIN_PIN = 'akaBlade2k.'

// Einfache Hash-Funktion
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16)
}

// ID generieren
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// Session (bleibt localStorage)
export function getActiveSessionId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(ACTIVE_SESSION_KEY)
}

export function setActiveSession(userId: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ACTIVE_SESSION_KEY, userId)
}

export function clearActiveSession(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(ACTIVE_SESSION_KEY)
}

// Hilfsfunktion: Supabase Row → PlayerProfile
function rowToProfile(row: Record<string, unknown>): PlayerProfile {
  return {
    id: row.id as string,
    name: row.name as string,
    team: (row.team as string) || '',
    email: row.email as string,
    passwordHash: row.password_hash as string,
    securityQuestion: (row.security_question as string) || '',
    securityAnswer: (row.security_answer as string) || '',
    totalReps: (row.total_reps as number) || 0,
    belt: (row.belt as BeltLevel) || 'white',
    createdAt: (row.created_at as string) || new Date().toISOString(),
    lastTrainingDate: (row.last_training_date as string) || new Date().toISOString(),
    trainingHistory: (row.training_history as TrainingSession[]) || []
  }
}

// Hilfsfunktion: PlayerProfile → Supabase Row
function profileToRow(profile: PlayerProfile): Record<string, unknown> {
  return {
    id: profile.id,
    name: profile.name,
    team: profile.team,
    email: profile.email,
    password_hash: profile.passwordHash,
    security_question: profile.securityQuestion,
    security_answer: profile.securityAnswer,
    total_reps: profile.totalReps,
    belt: profile.belt,
    created_at: profile.createdAt,
    last_training_date: profile.lastTrainingDate,
    training_history: profile.trainingHistory
  }
}

// Aktuelles Profil laden
export async function getPlayerProfileAsync(): Promise<PlayerProfile | null> {
  const activeId = getActiveSessionId()
  if (!activeId) return null
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', activeId)
    .single()
  if (error || !data) return null
  return rowToProfile(data)
}

// Synchrone Version (für Komponenten die noch nicht async sind)
export function getPlayerProfile(): PlayerProfile | null {
  if (typeof window === 'undefined') return null
  const cached = localStorage.getItem('tstep_dojo_profile_cache')
  if (!cached) return null
  try {
    return JSON.parse(cached)
  } catch {
    return null
  }
}

// Cache speichern
export function cacheProfile(profile: PlayerProfile): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('tstep_dojo_profile_cache', JSON.stringify(profile))
}

// Profil suchen nach Email
export async function findUserByEmail(email: string): Promise<PlayerProfile | null> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('email', email.toLowerCase())
    .single()
  if (error || !data) return null
  return rowToProfile(data)
}

// Registrierung
export async function registerUser(
  name: string,
  team: string,
  email: string,
  password: string,
  securityQuestion: string = SECURITY_QUESTIONS[0],
  securityAnswer: string = ''
): Promise<{ success: boolean; error?: string; profile?: PlayerProfile }> {
  const existing = await findUserByEmail(email)
  if (existing) {
    return { success: false, error: 'Diese E-Mail ist bereits registriert' }
  }

  const profile: PlayerProfile = {
    id: generateId(),
    name,
    team,
    email: email.toLowerCase(),
    passwordHash: simpleHash(password),
    securityQuestion,
    securityAnswer: securityAnswer.toLowerCase().trim(),
    totalReps: 0,
    belt: 'white',
    createdAt: new Date().toISOString(),
    lastTrainingDate: new Date().toISOString(),
    trainingHistory: []
  }

  const { error } = await supabase.from('players').insert(profileToRow(profile))
  if (error) {
    return { success: false, error: 'Fehler beim Registrieren: ' + error.message }
  }

  setActiveSession(profile.id)
  cacheProfile(profile)
  return { success: true, profile }
}

// Login
export async function loginUser(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; profile?: PlayerProfile }> {
  const user = await findUserByEmail(email)
  if (!user) {
    return { success: false, error: 'E-Mail nicht gefunden' }
  }
  if (user.passwordHash !== simpleHash(password)) {
    return { success: false, error: 'Falsches Passwort' }
  }
  setActiveSession(user.id)
  cacheProfile(user)
  return { success: true, profile: user }
}

// Logout
export function logoutUser(): void {
  clearActiveSession()
  if (typeof window !== 'undefined') {
    localStorage.removeItem('tstep_dojo_profile_cache')
  }
}

// Passwort zurücksetzen
export async function resetPassword(
  email: string,
  securityAnswer: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const user = await findUserByEmail(email)
  if (!user) return { success: false, error: 'E-Mail nicht gefunden' }
  if (user.securityAnswer !== securityAnswer.toLowerCase().trim()) {
    return { success: false, error: 'Sicherheitsantwort ist falsch' }
  }
  const { error } = await supabase
    .from('players')
    .update({ password_hash: simpleHash(newPassword) })
    .eq('id', user.id)
  if (error) return { success: false, error: 'Fehler beim Zurücksetzen' }
  return { success: true }
}

// Sicherheitsfrage laden
export async function getSecurityQuestion(
  email: string
): Promise<{ success: boolean; question?: string; error?: string }> {
  const user = await findUserByEmail(email)
  if (!user) return { success: false, error: 'E-Mail nicht gefunden' }
  return { success: true, question: user.securityQuestion }
}

// Profil speichern
export async function savePlayerProfile(profile: PlayerProfile): Promise<void> {
  const { error } = await supabase
    .from('players')
    .update(profileToRow(profile))
    .eq('id', profile.id)
  if (!error) cacheProfile(profile)
}

// Training hinzufügen
export async function addTrainingSession(
  profile: PlayerProfile,
  reps: number,
  targetReps: number,
  minSeconds: number,
  maxSeconds: number,
  videoUrl?: string
): Promise<PlayerProfile> {
  const session: TrainingSession = {
    date: new Date().toISOString(),
    reps,
    targetReps,
    minSeconds,
    maxSeconds,
    videoUrl
  }

  const newTotalReps = profile.totalReps + reps
  const newBelt = getBeltForReps(newTotalReps)

  const updatedProfile: PlayerProfile = {
    ...profile,
    totalReps: newTotalReps,
    belt: newBelt,
    lastTrainingDate: new Date().toISOString(),
    trainingHistory: [...profile.trainingHistory, session]
  }

  await savePlayerProfile(updatedProfile)
  return updatedProfile
}

// Profil löschen (Admin)
export async function clearPlayerProfile(): Promise<void> {
  const activeId = getActiveSessionId()
  if (!activeId) return
  await supabase.from('players').delete().eq('id', activeId)
  logoutUser()
}

// Alle User löschen (Admin)
export async function clearAllUsers(): Promise<void> {
  await supabase.from('players').delete().neq('id', '')
  logoutUser()
}

export function verifyAdminPin(pin: string): boolean {
  return pin === ADMIN_PIN
}

export function getBeltForReps(totalReps: number): BeltLevel {
  let currentBelt: BeltLevel = 'white'
  for (const belt of BELT_ORDER) {
    if (totalReps >= BELT_THRESHOLDS[belt]) {
      currentBelt = belt
    }
  }
  return currentBelt
}

export function getNextBelt(currentBelt: BeltLevel): BeltLevel | null {
  const currentIndex = BELT_ORDER.indexOf(currentBelt)
  if (currentIndex < BELT_ORDER.length - 1) {
    return BELT_ORDER[currentIndex + 1]
  }
  return null
}

export function getRepsToNextBelt(totalReps: number): number {
  const currentBelt = getBeltForReps(totalReps)
  const nextBelt = getNextBelt(currentBelt)
  if (!nextBelt) return 0
  return BELT_THRESHOLDS[nextBelt] - totalReps
}

// Tages-Challenge
export function getDailyChallenge(profile: PlayerProfile): number {
  const challenges: Record<BeltLevel, number> = {
    white: 20,
    yellow: 30,
    orange: 50,
    green: 75,
    blue: 100,
    brown: 150,
    black: 200
  }
  return challenges[profile.belt]
}

export function isChallengeCompletedToday(profile: PlayerProfile): boolean {
  const today = new Date().toISOString().split('T')[0]
  const todaySessions = profile.trainingHistory.filter(s => s.date.startsWith(today))
  const todayReps = todaySessions.reduce((sum, s) => sum + s.reps, 0)
  return todayReps >= getDailyChallenge(profile)
}

export function getTodayReps(profile: PlayerProfile): number {
  const today = new Date().toISOString().split('T')[0]
  return profile.trainingHistory
    .filter(s => s.date.startsWith(today))
    .reduce((sum, s) => sum + s.reps, 0)
}

// Statistik-Funktionen
export function getBestSession(profile: PlayerProfile): number {
  if (profile.trainingHistory.length === 0) return 0
  return Math.max(...profile.trainingHistory.map(s => s.reps))
}

export function getAverageReps(profile: PlayerProfile): number {
  if (profile.trainingHistory.length === 0) return 0
  const total = profile.trainingHistory.reduce((sum, s) => sum + s.reps, 0)
  return Math.round(total / profile.trainingHistory.length)
}

export function getCurrentStreak(profile: PlayerProfile): number {
  if (profile.trainingHistory.length === 0) return 0
  const trainedDays = new Set(profile.trainingHistory.map(s => s.date.split('T')[0]))
  let streak = 0
  const checkDate = new Date()
  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0]
    if (!trainedDays.has(dateStr)) break
    streak++
    checkDate.setDate(checkDate.getDate() - 1)
  }
  return streak
}

// Donations — Supabase
export async function getAllDonations(): Promise<Donation[]> {
  const { data, error } = await supabase
    .from('donations')
    .select('*')
    .order('date', { ascending: false })
  if (error || !data) return []
  return data.map((d: Record<string, unknown>) => ({
    id: d.id as string,
    name: (d.name as string) || 'Anonym',
    amount: d.amount as number,
    message: (d.message as string) || '',
    isAnonymous: d.is_anonymous as boolean,
    date: d.date as string
  }))
}

export async function addDonation(
  name: string,
  amount: number,
  message: string,
  isAnonymous: boolean
): Promise<Donation> {
  const donation = {
    id: generateId(),
    name: isAnonymous ? 'Anonym' : name,
    amount,
    message,
    is_anonymous: isAnonymous,
    date: new Date().toISOString()
  }
  await supabase.from('donations').insert(donation)
  return {
    id: donation.id,
    name: donation.name,
    amount: donation.amount,
    message: donation.message,
    isAnonymous: isAnonymous,
    date: donation.date
  }
}