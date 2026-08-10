import { useEffect, useId, useRef, useState } from 'react'
import { formatDuration } from '../utils/date.js'
import {
  endAtFromNow,
  formatCountdown,
  isCountdownDone,
  remainingMs,
} from './focus-countdown.js'
import { focusCopy } from './focus-copy.js'
import {
  FOCUS_DURATION_PRESETS,
  clearFocusCountdownSession,
  readFocusCountdownSession,
  readFocusDurationMin,
  readFocusOnStart,
  writeFocusCountdownSession,
  writeFocusDurationMin,
  writeFocusOnStart,
} from './focus-prefs.js'

function initEndAt(taskId, durationMin) {
  const existing = readFocusCountdownSession()
  if (existing && existing.taskId === taskId && existing.endAt > Date.now()) {
    return existing.endAt
  }
  const next = endAtFromNow(durationMin)
  writeFocusCountdownSession({ taskId, endAt: next })
  return next
}

/**
 * Focus Mode overlay — simplified from todo-app FocusMode
 * (session clocks + stop/leave; no checklist/notes for this slice).
 */
export function FocusMode({
  taskId,
  taskTitle,
  itemType = 'todo',
  workedHours,
  onLeave,
  onStop,
}) {
  const titleId = useId()
  const panelRef = useRef(null)
  const signaledRef = useRef(false)
  const [durationMin, setDurationMin] = useState(readFocusDurationMin)
  const [endAt, setEndAt] = useState(() =>
    initEndAt(String(taskId), readFocusDurationMin()),
  )
  const [tick, setTick] = useState(0)
  const [flash, setFlash] = useState(false)
  const [customMin, setCustomMin] = useState('')
  const [durationOpen, setDurationOpen] = useState(false)
  const [openOnStart, setOpenOnStart] = useState(readFocusOnStart)
  const left = remainingMs(endAt)
  const countdownLabel = formatCountdown(left)
  const done = isCountdownDone(endAt)

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 250)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    void tick
    writeFocusCountdownSession({ taskId: String(taskId), endAt })
  }, [taskId, endAt, tick])

  useEffect(() => {
    if (!done || signaledRef.current) return
    signaledRef.current = true
    setFlash(true)
    const id = window.setTimeout(() => setFlash(false), 2000)
    return () => window.clearTimeout(id)
  }, [done, tick])

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        if (durationOpen) {
          e.preventDefault()
          setDurationOpen(false)
          return
        }
        e.preventDefault()
        onLeave()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onLeave, durationOpen])

  function applyDuration(minutes) {
    writeFocusDurationMin(minutes)
    setDurationMin(minutes)
    signaledRef.current = false
    setFlash(false)
    const next = endAtFromNow(minutes)
    setEndAt(next)
    writeFocusCountdownSession({ taskId: String(taskId), endAt: next })
    setDurationOpen(false)
    setCustomMin('')
  }

  function handleStop() {
    clearFocusCountdownSession()
    onStop()
  }

  return (
    <div
      className={`focus-mode${flash ? ' is-flash' : ''}${done ? ' is-ended' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      ref={panelRef}
    >
      <div className="focus-mode-inner">
        <section className="focus-mode-session" aria-label={focusCopy.dialogLabel}>
          <header className="focus-mode-top">
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  itemType === 'habit'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-indigo-50 text-indigo-700'
                }`}
              >
                {itemType === 'habit' ? 'Habit' : 'Task'}
              </span>
            </div>
            <h1 id={titleId} className="focus-mode-title">
              {taskTitle}
            </h1>

            <div className="focus-mode-status">
              <div className="focus-mode-worked">
                <span className="focus-mode-clock-label">{focusCopy.timeWorked}</span>
                <span className="focus-mode-worked-value">
                  {formatDuration(workedHours)}
                </span>
              </div>
              <div className="focus-mode-countdown">
                <span className="focus-mode-clock-label">{focusCopy.untilBreak}</span>
                <span
                  className="focus-mode-countdown-value"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {countdownLabel}
                </span>
              </div>
              <div className="focus-mode-duration">
                <button
                  type="button"
                  className={`focus-mode-duration-toggle${durationOpen ? ' is-open' : ''}`}
                  aria-expanded={durationOpen}
                  aria-controls="focus-duration-panel"
                  onClick={() => setDurationOpen((v) => !v)}
                >
                  {focusCopy.minutes(durationMin)}
                </button>
                {durationOpen ? (
                  <div
                    id="focus-duration-panel"
                    className="focus-mode-duration-panel"
                    role="group"
                    aria-label={focusCopy.durationLabel}
                  >
                    {FOCUS_DURATION_PRESETS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={`focus-mode-chip${durationMin === m ? ' is-active' : ''}`}
                        onClick={() => applyDuration(m)}
                      >
                        {focusCopy.minutes(m)}
                      </button>
                    ))}
                    <div className="focus-mode-custom">
                      <input
                        type="number"
                        min={1}
                        max={180}
                        placeholder={focusCopy.customPlaceholder}
                        aria-label={focusCopy.customMinutes}
                        value={customMin}
                        className="focus-mode-custom-input"
                        onChange={(e) => setCustomMin(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key !== 'Enter') return
                          const n = Number(customMin)
                          if (Number.isFinite(n) && n >= 1 && n <= 180) {
                            applyDuration(n)
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="focus-mode-chip"
                        onClick={() => {
                          const n = Number(customMin)
                          if (Number.isFinite(n) && n >= 1 && n <= 180) {
                            applyDuration(n)
                          }
                        }}
                      >
                        {focusCopy.applyCustom}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {done ? (
              <div className="focus-mode-ended-banner">
                <strong>{focusCopy.sessionEndedTitle}</strong>
                <p>{focusCopy.sessionEndedBody}</p>
              </div>
            ) : null}
          </header>

          <div className="focus-mode-spacer" />

          <footer className="focus-mode-bottom">
            <div className="focus-mode-actions">
              <button
                type="button"
                className="focus-mode-btn focus-mode-btn-stop"
                onClick={() => void handleStop()}
              >
                {focusCopy.stop}
              </button>
              <button
                type="button"
                className="focus-mode-btn focus-mode-btn-leave"
                onClick={onLeave}
              >
                {focusCopy.leave}
              </button>
            </div>
            <div className="focus-mode-footer">
              {openOnStart ? (
                <button
                  type="button"
                  className="focus-mode-link"
                  onClick={() => {
                    writeFocusOnStart(false)
                    setOpenOnStart(false)
                  }}
                >
                  {focusCopy.stayOnList}
                </button>
              ) : (
                <button
                  type="button"
                  className="focus-mode-link"
                  onClick={() => {
                    writeFocusOnStart(true)
                    setOpenOnStart(true)
                  }}
                >
                  {focusCopy.openOnStart}
                </button>
              )}
            </div>
            <p className="focus-mode-smile-hint">{focusCopy.smileHint}</p>
          </footer>
        </section>
      </div>
    </div>
  )
}
