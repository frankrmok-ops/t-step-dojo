'use client'

import { PlayerProfile } from '@/lib'
import { useMemo } from 'react'

interface TrainingCalendarProps {
  profile: PlayerProfile
}

export function TrainingCalendar({ profile }: TrainingCalendarProps) {
  const calendarData = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startDayOfWeek = firstDay.getDay() // 0 = Sunday
    
    // Adjust for Monday start (0 = Monday, 6 = Sunday)
    const adjustedStartDay = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1
    
    // Get training days this month
    const trainingDays = new Set<number>()
    const repsPerDay: Record<number, number> = {}
    
    profile.trainingHistory.forEach(session => {
      const sessionDate = new Date(session.date)
      if (sessionDate.getMonth() === month && sessionDate.getFullYear() === year) {
        const day = sessionDate.getDate()
        trainingDays.add(day)
        repsPerDay[day] = (repsPerDay[day] || 0) + session.reps
      }
    })
    
    return {
      year,
      month,
      daysInMonth,
      adjustedStartDay,
      trainingDays,
      repsPerDay,
      today: now.getDate()
    }
  }, [profile.trainingHistory])

  const monthNames = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ]

  const dayNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

  // Generate calendar grid
  const calendarCells: (number | null)[] = []
  for (let i = 0; i < calendarData.adjustedStartDay; i++) {
    calendarCells.push(null)
  }
  for (let day = 1; day <= calendarData.daysInMonth; day++) {
    calendarCells.push(day)
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      {/* Month header */}
      <h3 className="mb-4 text-center text-lg font-bold text-white">
        {monthNames[calendarData.month]} {calendarData.year}
      </h3>

      {/* Day headers */}
      <div className="mb-2 grid grid-cols-7 gap-1">
        {dayNames.map(day => (
          <div key={day} className="text-center text-xs font-medium text-zinc-500">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarCells.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="aspect-square" />
          }

          const isToday = day === calendarData.today
          const hasTraining = calendarData.trainingDays.has(day)
          const reps = calendarData.repsPerDay[day] || 0

          return (
            <div
              key={day}
              className={`relative flex aspect-square flex-col items-center justify-center rounded text-xs ${
                isToday
                  ? 'bg-red-900/50 ring-2 ring-red-500'
                  : hasTraining
                    ? 'bg-green-900/30'
                    : 'bg-zinc-800/50'
              }`}
            >
              <span className={`${isToday ? 'font-bold text-white' : 'text-zinc-400'}`}>
                {day}
              </span>
              {hasTraining && (
                <span className="text-[8px] text-green-400">{reps}</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-center gap-4 text-xs text-zinc-500">
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded bg-green-900/50" />
          <span>Trainiert</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded bg-red-900/50 ring-1 ring-red-500" />
          <span>Heute</span>
        </div>
      </div>
    </div>
  )
}
