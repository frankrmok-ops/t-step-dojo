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

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startDayOfWeek = firstDay.getDay()
    const adjustedStartDay = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1

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

    return { year, month, daysInMonth, adjustedStartDay, trainingDays, repsPerDay, today: now.getDate() }
  }, [profile.trainingHistory])

  const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
  const dayNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

  const calendarCells: (number | null)[] = []
  for (let i = 0; i < calendarData.adjustedStartDay; i++) calendarCells.push(null)
  for (let day = 1; day <= calendarData.daysInMonth; day++) calendarCells.push(day)

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-2">
      <h3 className="mb-1.5 text-center text-xs font-bold text-white">
        {monthNames[calendarData.month]} {calendarData.year}
      </h3>

      <div className="mb-1 grid grid-cols-7 gap-0.5">
        {dayNames.map(day => (
          <div key={day} className="text-center text-[9px] font-medium text-zinc-500">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {calendarCells.map((day, index) => {
          if (day === null) return <div key={`empty-${index}`} className="aspect-square" />
          const isToday = day === calendarData.today
          const hasTraining = calendarData.trainingDays.has(day)

          return (
            <div
              key={day}
              className={`relative flex aspect-square flex-col items-center justify-center rounded text-[10px] ${
                isToday
                  ? 'bg-red-900/50 ring-1 ring-red-500'
                  : hasTraining
                    ? 'bg-green-900/40'
                    : 'bg-zinc-800/50'
              }`}
            >
              <span className={isToday ? 'font-bold text-white' : 'text-zinc-400'}>
                {day}
              </span>
            </div>
          )
        })}
      </div>

      <div className="mt-1.5 flex items-center justify-center gap-3 text-[9px] text-zinc-500">
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded bg-green-900/50" />
          <span>Trainiert</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded bg-red-900/50 ring-1 ring-red-500" />
          <span>Heute</span>
        </div>
      </div>
    </div>
  )
}