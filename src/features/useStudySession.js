import { useEffect, useState } from 'react'
import {
  endAtFromNow,
  formatStudyClock,
  freezeCountdown,
  isCountdownDone,
  remainingMs,
  resumeCountdown,
} from './focus-countdown.js'

export const STUDY_SESSION_STORAGE_KEY = 'my-task.study-session.v1'

export function readStudySession(storage = globalThis.sessionStorage) {
  try {
    const raw = storage?.getItem?.(STUDY_SESSION_STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data || typeof data.durationMin !== 'number') return null
    return data
  } catch {
    return null
  }
}

export function writeStudySession(data, storage = globalThis.sessionStorage) {
  if (!storage?.setItem) return
  storage.setItem(STUDY_SESSION_STORAGE_KEY, JSON.stringify(data))
}

export function clearStudySession(storage = globalThis.sessionStorage) {
  storage?.removeItem?.(STUDY_SESSION_STORAGE_KEY)
}

/**
 * Study countdown that can pause/resume without restarting.
 * Survives leaving the Timer tab via sessionStorage.
 */
export function useStudySession() {
  const initial = readStudySession()
  const [durationMin, setDurationMin] = useState(() => initial?.durationMin ?? null)
  const [endAt, setEndAt] = useState(() => initial?.endAt ?? null)
  const [paused, setPaused] = useState(() => Boolean(initial?.paused))
  const [pausedLeft, setPausedLeft] = useState(() => Number(initial?.pausedLeft) || 0)
  const [done, setDone] = useState(() => Boolean(initial?.done))
  const [overlay, setOverlay] = useState(false)
  const [tick, setTick] = useState(0)

  const active = durationMin != null
  const remaining = !active
    ? 0
    : paused || done
      ? pausedLeft
      : remainingMs(endAt)
  const remainingLabel = formatStudyClock(remaining)

  useEffect(() => {
    if (!active || paused || done) return undefined
    const id = window.setInterval(() => setTick((t) => t + 1), 250)
    return () => window.clearInterval(id)
  }, [active, paused, done])

  useEffect(() => {
    if (!active || paused || done) return
    void tick
    if (isCountdownDone(endAt)) {
      setPausedLeft(0)
      setDone(true)
      setPaused(true)
    }
  }, [tick, active, paused, done, endAt])

  useEffect(() => {
    if (!active) {
      clearStudySession()
      return
    }
    writeStudySession({
      durationMin,
      endAt,
      paused,
      pausedLeft: paused || done ? pausedLeft : remainingMs(endAt),
      done,
    })
  }, [active, durationMin, endAt, paused, pausedLeft, done])

  function start(minutes) {
    const end = endAtFromNow(minutes)
    setDurationMin(minutes)
    setEndAt(end)
    setPaused(false)
    setPausedLeft(remainingMs(end))
    setDone(false)
    setOverlay(false)
  }

  function pause() {
    if (!active || paused || done) return
    setPausedLeft(freezeCountdown(endAt))
    setPaused(true)
  }

  function resume() {
    if (!active || done) return
    setEndAt(resumeCountdown(pausedLeft))
    setPaused(false)
  }

  function end() {
    setDurationMin(null)
    setEndAt(null)
    setPaused(false)
    setPausedLeft(0)
    setDone(false)
    setOverlay(false)
    clearStudySession()
  }

  return {
    active,
    overlay,
    durationMin,
    remaining,
    remainingLabel,
    paused,
    done,
    start,
    pause,
    resume,
    end,
    openOverlay: () => setOverlay(true),
    closeOverlay: () => setOverlay(false),
  }
}
