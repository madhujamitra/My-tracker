/** Cell truthy check matching the sheet / App toggle rules. */
export function isCellDone(row, day) {
  const val = row?.[day]
  return val === true || val === 'true' || val === 'TRUE' || val === 1
}

/**
 * Habit = daily check-in that resets each morning (no miss carry).
 * Task  = user to-do that stays open until completed once; if still open
 *         after the created day, it surfaces the next day as missed.
 */
export function classifyItem({ row, itemType = 'todo', createdDay = 1, refDay }) {
  const type = String(itemType || 'todo').toLowerCase()
  const startDay = Math.max(1, Number(createdDay) || 1)
  const day = Number(refDay) || 1
  const doneToday = isCellDone(row, day)

  if (type === 'habit') {
    return {
      itemType: 'habit',
      isDoneToday: doneToday,
      isRolledOver: false,
      missedDay: null,
      isClosed: false,
      includeInQueue: true,
      statusLabel: doneToday ? 'completed' : 'due_today',
    }
  }

  // Task: closed once completed on any day from creation through today
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
      isClosed: true,
      // Keep on today's list only if finished today; older completions drop off
      includeInQueue: completedOn === day,
      statusLabel: 'completed',
    }
  }

  const isRolledOver = day > startDay
  return {
    itemType: 'todo',
    isDoneToday: false,
    isRolledOver,
    missedDay: isRolledOver ? startDay : null,
    isClosed: false,
    includeInQueue: true,
    statusLabel: isRolledOver ? 'missed' : 'due_today',
  }
}

export function sortQueueItems(a, b) {
  if (a.isRolledOver && !b.isRolledOver) return -1
  if (!a.isRolledOver && b.isRolledOver) return 1
  if (!a.isDoneToday && !a.isClosed && (b.isDoneToday || b.isClosed)) return -1
  if ((a.isDoneToday || a.isClosed) && !b.isDoneToday && !b.isClosed) return 1
  return 0
}
