import { useEffect, useId, useRef } from 'react'
import { useWakeLock } from './useWakeLock.js'
import { timerCopy } from './timer-copy.js'

/**
 * Full-viewport study countdown. Pause/resume is owned by useStudySession
 * so closing this overlay does not restart the session.
 */
export function StudyTimer({
  remainingLabel,
  paused,
  done,
  onPause,
  onResume,
  onLeave,
  onEnd,
}) {
  const titleId = useId()
  const rootRef = useRef(null)
  const { status: wakeStatus } = useWakeLock(!paused && !done)

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
        onLeave()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onLeave])

  const wakeHint =
    wakeStatus === 'active'
      ? timerCopy.studyWakeOn
      : wakeStatus === 'unsupported' || wakeStatus === 'denied'
        ? timerCopy.studyWakeOff
        : null

  const label = done
    ? timerCopy.studyEndedTitle
    : paused
      ? timerCopy.studyPausedLabel
      : timerCopy.studySessionLabel

  return (
    <div
      ref={rootRef}
      className={`study-timer${done ? ' is-ended' : ''}${paused ? ' is-paused' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="study-timer-inner">
        <p id={titleId} className="study-timer-label">
          {label}
        </p>

        <p className="study-timer-clock" aria-live="polite" aria-atomic="true">
          {remainingLabel}
        </p>

        {done ? (
          <p className="study-timer-ended">{timerCopy.studyEndedBody}</p>
        ) : null}

        {wakeHint && !paused ? (
          <p className="study-timer-wake" role="status">
            {wakeHint}
          </p>
        ) : null}

        <div className="study-timer-actions">
          {!done ? (
            <button
              type="button"
              className="study-timer-btn study-timer-btn-pause"
              onClick={paused ? onResume : onPause}
            >
              {paused ? timerCopy.studyResume : timerCopy.studyPause}
            </button>
          ) : null}
          <button
            type="button"
            className="study-timer-btn study-timer-btn-primary"
            onClick={done ? onEnd : onLeave}
          >
            {done ? timerCopy.studyDone : timerCopy.studyBack}
          </button>
          {!done ? (
            <button
              type="button"
              className="study-timer-btn study-timer-btn-pause"
              onClick={onEnd}
            >
              {timerCopy.studyEnd}
            </button>
          ) : null}
        </div>

        <p className="study-timer-hint">{timerCopy.studyEscHint}</p>
      </div>
    </div>
  )
}
