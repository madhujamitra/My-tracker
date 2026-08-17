import { useEffect, useId, useRef, useState } from 'react'
import {
  endAtFromNow,
  formatStudyClock,
  isCountdownDone,
  remainingMs,
} from './focus-countdown.js'
import { useWakeLock } from './useWakeLock.js'
import { timerCopy } from './timer-copy.js'

/**
 * Full-viewport study countdown. Tick lives in refs; display state updates for paint.
 * Holds Screen Wake Lock while the session is open.
 */
export function StudyTimer({ durationMin, onClose }) {
  const titleId = useId()
  const rootRef = useRef(null)
  const endAtRef = useRef(endAtFromNow(durationMin))
  const intervalRef = useRef(null)
  const doneSignaledRef = useRef(false)

  const [remainingLabel, setRemainingLabel] = useState(() =>
    formatStudyClock(remainingMs(endAtRef.current)),
  )
  const [done, setDone] = useState(false)
  const [flash, setFlash] = useState(false)

  const { status: wakeStatus } = useWakeLock(true)

  useEffect(() => {
    endAtRef.current = endAtFromNow(durationMin)
    doneSignaledRef.current = false
    setDone(false)
    setFlash(false)
    setRemainingLabel(formatStudyClock(remainingMs(endAtRef.current)))

    intervalRef.current = window.setInterval(() => {
      const left = remainingMs(endAtRef.current)
      setRemainingLabel(formatStudyClock(left))
      if (isCountdownDone(endAtRef.current)) {
        setDone(true)
        if (intervalRef.current != null) {
          window.clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    }, 250)

    return () => {
      if (intervalRef.current != null) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [durationMin])

  useEffect(() => {
    if (!done || doneSignaledRef.current) return
    doneSignaledRef.current = true
    setFlash(true)
    const id = window.setTimeout(() => setFlash(false), 2000)
    return () => window.clearTimeout(id)
  }, [done])

  useEffect(() => {
    const el = rootRef.current
    if (!el) return undefined

    let entered = false
    async function enterFullscreen() {
      try {
        if (document.fullscreenElement) return
        await el.requestFullscreen?.()
        entered = true
      } catch {
        /* overlay still works without browser fullscreen */
      }
    }
    void enterFullscreen()

    return () => {
      if (entered && document.fullscreenElement === el) {
        void document.exitFullscreen?.().catch(() => {})
      }
    }
  }, [])

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const wakeHint =
    wakeStatus === 'active'
      ? timerCopy.studyWakeOn
      : wakeStatus === 'unsupported' || wakeStatus === 'denied'
        ? timerCopy.studyWakeOff
        : null

  return (
    <div
      ref={rootRef}
      className={`study-timer${flash ? ' is-flash' : ''}${done ? ' is-ended' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="study-timer-inner">
        <p id={titleId} className="study-timer-label">
          {done ? timerCopy.studyEndedTitle : timerCopy.studySessionLabel}
        </p>

        <p
          className="study-timer-clock"
          aria-live="polite"
          aria-atomic="true"
        >
          {remainingLabel}
        </p>

        {done ? (
          <p className="study-timer-ended">{timerCopy.studyEndedBody}</p>
        ) : null}

        {wakeHint ? (
          <p className="study-timer-wake" role="status">
            {wakeHint}
          </p>
        ) : null}

        <div className="study-timer-actions">
          <button
            type="button"
            className="study-timer-btn study-timer-btn-primary"
            onClick={onClose}
          >
            {done ? timerCopy.studyDone : timerCopy.studyEnd}
          </button>
        </div>

        <p className="study-timer-hint">{timerCopy.studyEscHint}</p>
      </div>
    </div>
  )
}
