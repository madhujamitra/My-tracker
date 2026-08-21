import { liveHours, localISODate } from '../utils/date.js'

/** Timer-store key for the study countdown (not a sheet row). */
export const STUDY_TIMER_KEY = 'study'

/** Sum logged + in-progress hours for one day's timer entries. */
export function sumDayHours(entries, nowMs = Date.now()) {
  if (!entries || typeof entries !== 'object') return 0
  let total = 0
  for (const entry of Object.values(entries)) {
    total += liveHours(entry, 0, nowMs)
  }
  return total
}

function dateKey(year, monthIndex, day) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Daily timed hours for a calendar month (productivity from the timer store). */
export function hoursByDayInMonth(
  timersByDate,
  year,
  monthIndex,
  daysInMonth,
  nowMs = Date.now(),
) {
  const days = []
  for (let day = 1; day <= daysInMonth; day++) {
    const key = dateKey(year, monthIndex, day)
    days.push({
      day,
      date: key,
      hours: sumDayHours(timersByDate?.[key], nowMs),
    })
  }
  return days
}

export function totalHoursInMonth(
  timersByDate,
  year,
  monthIndex,
  daysInMonth,
  nowMs = Date.now(),
) {
  return hoursByDayInMonth(timersByDate, year, monthIndex, daysInMonth, nowMs).reduce(
    (sum, d) => sum + d.hours,
    0,
  )
}

/** Hours per item index across a month (keys are sheet row ids). */
export function hoursByItemInMonth(
  timersByDate,
  year,
  monthIndex,
  daysInMonth,
  nowMs = Date.now(),
) {
  const byItem = {}
  for (let day = 1; day <= daysInMonth; day++) {
    const entries = timersByDate?.[dateKey(year, monthIndex, day)]
    if (!entries || typeof entries !== 'object') continue
    for (const [id, entry] of Object.entries(entries)) {
      byItem[id] = (byItem[id] || 0) + liveHours(entry, 0, nowMs)
    }
  }
  return byItem
}

export function todayTimedHours(timersByDate, nowMs = Date.now(), today = localISODate()) {
  return sumDayHours(timersByDate?.[today], nowMs)
}
