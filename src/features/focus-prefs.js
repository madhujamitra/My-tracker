/** Focus Mode preferences (localStorage) — from todo-app. */

export const FOCUS_ON_START_KEY = 'my-task-focus-on-start'
export const FOCUS_DURATION_MIN_KEY = 'my-task-focus-duration-min'
export const FOCUS_END_AT_KEY = 'my-task-focus-end-at'
export const FOCUS_TASK_ID_KEY = 'my-task-focus-task-id'

export const DEFAULT_FOCUS_DURATION_MIN = 25
export const FOCUS_DURATION_PRESETS = [25, 50]

export function readFocusOnStart(storage = localStorage) {
  const raw = storage.getItem(FOCUS_ON_START_KEY)
  if (raw === null) return true
  return raw !== '0' && raw !== 'false'
}

export function writeFocusOnStart(value, storage = localStorage) {
  storage.setItem(FOCUS_ON_START_KEY, value ? '1' : '0')
}

export function readFocusDurationMin(storage = localStorage) {
  const raw = storage.getItem(FOCUS_DURATION_MIN_KEY)
  if (raw === null) return DEFAULT_FOCUS_DURATION_MIN
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 1 || n > 180) return DEFAULT_FOCUS_DURATION_MIN
  return Math.floor(n)
}

export function writeFocusDurationMin(minutes, storage = localStorage) {
  const n = Math.floor(minutes)
  if (!Number.isFinite(n) || n < 1 || n > 180) return
  storage.setItem(FOCUS_DURATION_MIN_KEY, String(n))
}

export function readFocusCountdownSession(storage = sessionStorage) {
  const taskId = storage.getItem(FOCUS_TASK_ID_KEY)
  const endRaw = storage.getItem(FOCUS_END_AT_KEY)
  if (!taskId || !endRaw) return null
  const endAt = Number(endRaw)
  if (!Number.isFinite(endAt)) return null
  return { taskId, endAt }
}

export function writeFocusCountdownSession(session, storage = sessionStorage) {
  storage.setItem(FOCUS_TASK_ID_KEY, session.taskId)
  storage.setItem(FOCUS_END_AT_KEY, String(session.endAt))
}

export function clearFocusCountdownSession(storage = sessionStorage) {
  storage.removeItem(FOCUS_TASK_ID_KEY)
  storage.removeItem(FOCUS_END_AT_KEY)
}
