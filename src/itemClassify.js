/** Cell truthy check matching the sheet / App toggle rules. */
export function isCellDone(row, day) {
  const val = row?.[day]
  return val === true || val === 'true' || val === 'TRUE' || val === 1
}

/** Normalize recurrence stored on task meta. Habits ignore this. */
export function normalizeRecurrence(recurrence) {
  const r = String(recurrence || 'none').toLowerCase()
  if (r === 'weekly' || r === 'biweekly' || r === 'scheduled') return r
  return 'none'
}

export function recurrenceIntervalDays(recurrence) {
  const r = normalizeRecurrence(recurrence)
  if (r === 'weekly') return 7
  if (r === 'biweekly') return 14
  return null
}

/**
 * Habit = daily check-in that resets each morning (no miss carry).
 * Task  = user to-do that stays open until completed once; if still open
 *         after the created day, it surfaces the next day as missed.
 *
 * Recurrence (tasks only):
 * - none: one-shot from createdDay (existing rollover behavior)
 * - scheduled: hidden until createdDay (advance / specific date), then one-shot
 * - weekly / biweekly: due every 7 / 14 days from createdDay; miss rolls inside
 *   the period; after complete, hidden until the next period starts
 */
export function classifyItem({
  row,
  itemType = 'todo',
  createdDay = 1,
  refDay,
  recurrence = 'none',
}) {
  const type = String(itemType || 'todo').toLowerCase()
  const startDay = Math.max(1, Number(createdDay) || 1)
  const day = Number(refDay) || 1
  const doneToday = isCellDone(row, day)
  const recur = type === 'habit' ? 'none' : normalizeRecurrence(recurrence)

  if (type === 'habit') {
    return {
      itemType: 'habit',
      isDoneToday: doneToday,
      isRolledOver: false,
      missedDay: null,
      completedOn: doneToday ? day : null,
      isClosed: false,
      includeInQueue: true,
      statusLabel: doneToday ? 'completed' : 'due_today',
      recurrence: 'none',
      periodStart: null,
    }
  }

  // Advance / scheduled: not visible before due day
  if (recur === 'scheduled' && day < startDay) {
    return {
      itemType: 'todo',
      isDoneToday: false,
      isRolledOver: false,
      missedDay: null,
      completedOn: null,
      isClosed: false,
      includeInQueue: false,
      statusLabel: 'scheduled',
      recurrence: recur,
      periodStart: startDay,
    }
  }

  const interval = recurrenceIntervalDays(recur)

  // Weekly / bi-weekly periods anchored on createdDay
  if (interval != null) {
    if (day < startDay) {
      return {
        itemType: 'todo',
        isDoneToday: false,
        isRolledOver: false,
        missedDay: null,
        completedOn: null,
        isClosed: false,
        includeInQueue: false,
        statusLabel: 'scheduled',
        recurrence: recur,
        periodStart: startDay,
      }
    }

    const k = Math.floor((day - startDay) / interval)
    const periodStart = startDay + k * interval
    const periodEnd = periodStart + interval - 1

    let completedOn = null
    for (let d = periodStart; d <= Math.min(day, periodEnd); d++) {
      if (isCellDone(row, d)) {
        completedOn = d
        break
      }
    }

    if (completedOn !== null) {
      return {
        itemType: 'todo',
        isDoneToday: completedOn === day,
        isRolledOver: false,
        missedDay: null,
        completedOn,
        isClosed: true,
        includeInQueue: completedOn === day,
        statusLabel: 'completed',
        recurrence: recur,
        periodStart,
      }
    }

    const isRolledOver = day > periodStart
    return {
      itemType: 'todo',
      isDoneToday: false,
      isRolledOver,
      missedDay: isRolledOver ? periodStart : null,
      completedOn: null,
      isClosed: false,
      includeInQueue: true,
      statusLabel: isRolledOver ? 'missed' : 'due_today',
      recurrence: recur,
      periodStart,
    }
  }

  // One-shot / scheduled-after-due: closed once completed on any day from start through today
  let completedOn = null
  for (let d = startDay; d <= day; d++) {
    if (isCellDone(row, d)) {
      completedOn = d
      break
    }
  }

  if (completedOn !== null) {
    return {
      itemType: 'todo',
      isDoneToday: completedOn === day,
      isRolledOver: false,
      missedDay: null,
      completedOn,
      isClosed: true,
      // Keep on today's list only if finished today; older completions drop off
      includeInQueue: completedOn === day,
      statusLabel: 'completed',
      recurrence: recur,
      periodStart: startDay,
    }
  }

  const isRolledOver = day > startDay
  return {
    itemType: 'todo',
    isDoneToday: false,
    isRolledOver,
    missedDay: isRolledOver ? startDay : null,
    completedOn: null,
    isClosed: false,
    includeInQueue: true,
    statusLabel: isRolledOver ? 'missed' : 'due_today',
    recurrence: recur,
    periodStart: startDay,
  }
}

export function sortQueueItems(a, b) {
  if (a.isRolledOver && !b.isRolledOver) return -1
  if (!a.isRolledOver && b.isRolledOver) return 1
  if (!a.isDoneToday && !a.isClosed && (b.isDoneToday || b.isClosed)) return -1
  if ((a.isDoneToday || a.isClosed) && !b.isDoneToday && !b.isClosed) return 1
  return 0
}
