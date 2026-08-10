import { Play, Square } from 'lucide-react'
import { formatDuration } from '../utils/date.js'
import { timerCopy } from './timer-copy.js'

/**
 * Single pill: play/stop + live clock duration.
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

  return (
    <div
      className={[
        'time-control',
        running ? 'is-running' : '',
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
          aria-label={running ? timerCopy.stop : timerCopy.start}
          title={running ? timerCopy.stop : timerCopy.start}
          onClick={onToggleTimer}
        >
          {running ? (
            <Square className="w-3 h-3 fill-current" aria-hidden />
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
