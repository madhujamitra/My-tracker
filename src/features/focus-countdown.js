/** Pure countdown helpers for Focus Mode (from todo-app). */

export function endAtFromNow(durationMin, nowMs = Date.now()) {
  const minutes = Math.max(0, durationMin)
  return nowMs + minutes * 60_000
}

export function remainingMs(endAt, nowMs = Date.now()) {
  return Math.max(0, endAt - nowMs)
}

export function formatCountdown(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function isCountdownDone(endAt, nowMs = Date.now()) {
  return remainingMs(endAt, nowMs) <= 0
}
