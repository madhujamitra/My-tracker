/** Local calendar date YYYY-MM-DD (avoids UTC off-by-one). */
export function localISODate(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatDuration(hours) {
  const totalSec = Math.max(0, Math.floor(hours * 3600))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function formatHoursShort(hours) {
  return (Math.round(hours * 100) / 100).toFixed(hours >= 10 ? 1 : 2)
}

/** Base hours + live elapsed while a timer is running (todo-app liveHours). */
export function liveHours(entry, tick = 0) {
  const base = entry?.hours ?? 0
  if (!entry?.timerStartedAt) return base
  void tick
  return base + (Date.now() - new Date(entry.timerStartedAt).getTime()) / 3_600_000
}
