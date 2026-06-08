// Belt system constants - Exponential progression for 18,250 total reps (50/day for 365 days)
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

// Exponential belt progression - early belts fast, higher belts harder
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

// Storage keys
const USERS_KEY = 'tstep_dojo_users'
const ACTIVE_SESSION_KEY = 'tstep_dojo_active_session'
const ADMIN_PIN = 'akaBlade2k.'

// Simple hash function for password (not cryptographically secure, but sufficient for localStorage demo)
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16)
}

// Generate unique ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// Get all users from localStorage
export function getAllUsers(): PlayerProfile[] {
  if (typeof window === 'undefined') return []
  const stored = localStorage.getItem(USERS_KEY)
  if (!stored) return []
  try {
    return JSON.parse(stored)
  } catch {
    return []
  }
}

// Save all users to localStorage
function saveAllUsers(users: PlayerProfile[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

// Get active session user ID
export function getActiveSessionId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(ACTIVE_SESSION_KEY)
}

// Set active session
export function setActiveSession(userId: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ACTIVE_SESSION_KEY, userId)
}

// Clear active session (logout)
export function clearActiveSession(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(ACTIVE_SESSION_KEY)
}

// Get currently logged in player profile
export function getPlayerProfile(): PlayerProfile | null {
  const activeId = getActiveSessionId()
  if (!activeId) return null
  const users = getAllUsers()
  return users.find(u => u.id === activeId) || null
}

// Find user by email
export function findUserByEmail(email: string): PlayerProfile | null {
  const users = getAllUsers()
  return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null
}

// Register new user
export function registerUser(
  name: string,
  team: string,
  email: string,
  password: string,
  securityQuestion: string = SECURITY_QUESTIONS[0],
  securityAnswer: string = ''
): { success: boolean; error?: string; profile?: PlayerProfile } {
  const users = getAllUsers()
  
  // Check if email already exists
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
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
  
  users.push(profile)
  saveAllUsers(users)
  setActiveSession(profile.id)
  
  return { success: true, profile }
}

// Login user
export function loginUser(
  email: string,
  password: string
): { success: boolean; error?: string; profile?: PlayerProfile } {
  const user = findUserByEmail(email)
  
  if (!user) {
    return { success: false, error: 'E-Mail nicht gefunden' }
  }
  
  if (user.passwordHash !== simpleHash(password)) {
    return { success: false, error: 'Falsches Passwort' }
  }
  
  setActiveSession(user.id)
  return { success: true, profile: user }
}

// Logout user
export function logoutUser(): void {
  clearActiveSession()
}

// Verify security answer and reset password
export function resetPassword(
  email: string,
  securityAnswer: string,
  newPassword: string
): { success: boolean; error?: string } {
  const users = getAllUsers()
  const userIndex = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase())
  
  if (userIndex === -1) {
    return { success: false, error: 'E-Mail nicht gefunden' }
  }
  
  const user = users[userIndex]
  
  if (user.securityAnswer !== securityAnswer.toLowerCase().trim()) {
    return { success: false, error: 'Sicherheitsantwort ist falsch' }
  }
  
  users[userIndex] = {
    ...user,
    passwordHash: simpleHash(newPassword)
  }
  
  saveAllUsers(users)
  return { success: true }
}

// Get user security question by email
export function getSecurityQuestion(email: string): { success: boolean; question?: string; error?: string } {
  const user = findUserByEmail(email)
  if (!user) {
    return { success: false, error: 'E-Mail nicht gefunden' }
  }
  return { success: true, question: user.securityQuestion }
}

// Save/update player profile
export function savePlayerProfile(profile: PlayerProfile): void {
  if (typeof window === 'undefined') return
  const users = getAllUsers()
  const index = users.findIndex(u => u.id === profile.id)
  if (index !== -1) {
    users[index] = profile
    saveAllUsers(users)
  }
}

// Legacy function for compatibility - now creates with default values
export function createPlayerProfile(name: string): PlayerProfile {
  const result = registerUser(name, '', `${name.toLowerCase().replace(/\s/g, '')}@local.dojo`, 'default123')
  return result.profile!
}

// Clear specific player profile (admin function)
export function clearPlayerProfile(): void {
  const activeId = getActiveSessionId()
  if (!activeId) return
  
  const users = getAllUsers()
  const filtered = users.filter(u => u.id !== activeId)
  saveAllUsers(filtered)
  clearActiveSession()
}

// Clear all users (admin function)
export function clearAllUsers(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(USERS_KEY)
  clearActiveSession()
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

export function addTrainingSession(
  profile: PlayerProfile,
  reps: number,
  targetReps: number,
  minSeconds: number,
  maxSeconds: number,
  videoUrl?: string
): PlayerProfile {
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
  
  savePlayerProfile(updatedProfile)
  return updatedProfile
}
// Donations
const DONATIONS_KEY = 'tstep_dojo_donations'

export interface Donation {
  id: string
  name: string
  amount: number
  message: string
  isAnonymous: boolean
  date: string
}

export function getAllDonations(): Donation[] {
  if (typeof window === 'undefined') return []
  const stored = localStorage.getItem(DONATIONS_KEY)
  if (!stored) return []
  try {
    return JSON.parse(stored)
  } catch {
    return []
  }
}

export function addDonation(
  name: string,
  amount: number,
  message: string,
  isAnonymous: boolean
): Donation {
  const donation: Donation = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2),
    name: isAnonymous ? 'Anonym' : name,
    amount,
    message,
    isAnonymous,
    date: new Date().toISOString()
  }
  const donations = getAllDonations()
  donations.unshift(donation)
  localStorage.setItem(DONATIONS_KEY, JSON.stringify(donations))
  return donation
}