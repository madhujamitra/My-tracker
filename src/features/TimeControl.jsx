import { Pause, Play } from 'lucide-react'
import { formatDuration } from '../utils/date.js'
import { timerCopy } from './timer-copy.js'

/**
 * Single pill: play/pause + live clock duration.
 * Pause keeps logged hours; play resumes from the same total (never restarts).
 * Always shows m:ss / h:mm:ss (never rounds short sessions to "0 h").
 */
export function TimeControl({
  running,
  hours,
  busy,
  readOnly,
  compact,
  onToggleTimer,
}) {
  const showToggle = !readOnly && onToggleTimer
  const paused = !running && hours > 0
  const toggleLabel = running
    ? timerCopy.pause
    : paused
      ? timerCopy.resume
      : timerCopy.start

  return (
    <div
      className={[
        'time-control',
        running ? 'is-running' : '',
        paused ? 'is-paused' : '',
        compact ? 'is-compact' : '',
        readOnly ? 'is-readonly' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {showToggle ? (
        <button
          type="button"
          className="time-control-toggle"
          disabled={busy}
          aria-label={toggleLabel}
          title={toggleLabel}
          onClick={onToggleTimer}
        >
          {running ? (
            <Pause className="w-3 h-3 fill-current" aria-hidden />
          ) : (
            <Play className="w-3 h-3 fill-current" aria-hidden />
          )}
        </button>
      ) : null}
      <div className="time-control-value">
        <span
          className="time-control-live"
          aria-live={running ? 'polite' : undefined}
          title={`${Number(hours.toFixed(2))} hours`}
        >
          {formatDuration(hours)}
        </span>
      </div>
    </div>
  )
}
