import { useEffect, useState } from 'react'
import { liveHours, localISODate } from '../utils/date.js'

const STORAGE_PREFIX = 'my-task-timers:'

function storageKey(date) {
  return `${STORAGE_PREFIX}${date}`
}

function loadEntries(date) {
  try {
    const raw = localStorage.getItem(storageKey(date))
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveEntries(date, entries) {
  try {
    localStorage.setItem(storageKey(date), JSON.stringify(entries))
  } catch {
    // ignore quota / private mode
  }
}

/**
 * Shared day timer store (todo-app start/stop model).
 * One running timer at a time; elapsed folds into hours on stop.
 */
export function useDayTimers(date = localISODate()) {
  const [entries, setEntries] = useState(() => loadEntries(date))
  const [tick, setTick] = useState(0)

  useEffect(() => {
    setEntries(loadEntries(date))
  }, [date])

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    saveEntries(date, entries)
  }, [date, entries])

  function getEntry(key) {
    return entries[String(key)] || { hours: 0, timerStartedAt: null }
  }

  function getLiveHours(key) {
    return liveHours(getEntry(key), tick)
  }

  function isRunning(key) {
    return Boolean(getEntry(key).timerStartedAt)
  }

  function toggleTimer(key) {
    const id = String(key)
    setEntries((prev) => {
      const current = prev[id] || { hours: 0, timerStartedAt: null }
      const next = { ...prev }

      if (current.timerStartedAt) {
        next[id] = {
          hours: liveHours(current, 0),
          timerStartedAt: null,
        }
        return next
      }

      for (const [k, v] of Object.entries(next)) {
        if (v?.timerStartedAt) {
          next[k] = {
            hours: liveHours(v, 0),
            timerStartedAt: null,
          }
        }
      }

      next[id] = {
        hours: current.hours || 0,
        timerStartedAt: new Date().toISOString(),
      }
      return next
    })
  }

  function setHours(key, hours) {
    const id = String(key)
    setEntries((prev) => {
      const current = prev[id] || { hours: 0, timerStartedAt: null }
      if (current.timerStartedAt) return prev
      return {
        ...prev,
        [id]: { hours: Math.max(0, hours), timerStartedAt: null },
      }
    })
  }

  return {
    date,
    entries,
    tick,
    getEntry,
    getLiveHours,
    isRunning,
    toggleTimer,
    setHours,
  }
}
