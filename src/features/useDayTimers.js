import { useEffect, useState } from 'react'
import { liveHours, localISODate } from '../utils/date.js'

/**
 * Day timer store (pause/resume). Hours accumulate; play continues from the last total.
 * When `entries` + `onEntriesChange` are provided, parent owns persistence (Supabase).
 */
export function useDayTimers(date = localISODate(), options = {}) {
  const controlled = options.entries != null && typeof options.onEntriesChange === 'function'
  const [localEntries, setLocalEntries] = useState({})
  const [tick, setTick] = useState(0)

  const entries = controlled ? options.entries || {} : localEntries

  useEffect(() => {
    if (controlled) return
    setLocalEntries({})
  }, [date, controlled])

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000)
    return () => window.clearInterval(id)
  }, [])

  function commit(next) {
    if (controlled) options.onEntriesChange(next)
    else setLocalEntries(next)
  }

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
    const current = entries[id] || { hours: 0, timerStartedAt: null }
    const next = { ...entries }

    if (current.timerStartedAt) {
      next[id] = {
        hours: liveHours(current, 0),
        timerStartedAt: null,
      }
      commit(next)
      return
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
    commit(next)
  }

  function setHours(key, hours) {
    const id = String(key)
    const current = entries[id] || { hours: 0, timerStartedAt: null }
    if (current.timerStartedAt) return
    commit({
      ...entries,
      [id]: { hours: Math.max(0, hours), timerStartedAt: null },
    })
  }

  function setEntry(key, next) {
    const id = String(key)
    commit({
      ...entries,
      [id]: {
        hours: Math.max(0, next?.hours || 0),
        timerStartedAt: next?.timerStartedAt || null,
      },
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
    setEntry,
  }
}
