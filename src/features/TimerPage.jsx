import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Clock, Maximize2, Pause, Play, Timer } from 'lucide-react'
import { TimeControl } from './TimeControl.jsx'
import { StudyTimer } from './StudyTimer.jsx'
import { STUDY_DURATION_PRESETS, timerCopy } from './timer-copy.js'
import { useStudySession } from './useStudySession.js'
import { useWakeLock } from './useWakeLock.js'
import { STUDY_TIMER_KEY } from '../lib/timerProductivity.js'
import { formatDuration, formatHoursShort, liveHours } from '../utils/date.js'

/**
 * Timer page — pause/resume + live hours, shared with Habits/Tasks.
 * Receives shared timer API from useDayTimers so the queue stays in sync.
 */
export function TimerPage({ items = [], getMeta, timers, onToggleTimer }) {
  const { getLiveHours, isRunning, tick } = timers
  const [studyDurationMin, setStudyDurationMin] = useState(25)
  const [customMin, setCustomMin] = useState('')
  const [studyError, setStudyError] = useState('')
  const study = useStudySession()

  useWakeLock(study.active && !study.paused && !study.done && !study.overlay)

  useEffect(() => {
    if (typeof timers.setEntry !== 'function') return
    const running = study.active && !study.paused && !study.done
    const current = timers.getEntry(STUDY_TIMER_KEY)
    const alreadyRunning = Boolean(current.timerStartedAt)
    if (running && !alreadyRunning) {
      timers.setEntry(STUDY_TIMER_KEY, {
        hours: current.hours || 0,
        timerStartedAt: new Date().toISOString(),
      })
      return
    }
    if (!running && alreadyRunning) {
      timers.setEntry(STUDY_TIMER_KEY, {
        hours: liveHours(current, 0),
        timerStartedAt: null,
      })
    }
    // commit only on study run/pause/end — not every tick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [study.active, study.paused, study.done])

  const rows = useMemo(() => {
    return items.map((item) => {
      const title = String(item.row?.[0] || 'Untitled').trim()
      const meta = getMeta?.(item) || { itemType: 'todo', priority: 'Normal' }
      const key = String(item.index_)
      const hours = getLiveHours(key)
      const running = isRunning(key)
      return { item, title, meta, key, hours, running }
    })
  }, [items, getMeta, getLiveHours, isRunning, tick])

  const totalHours = useMemo(
    () =>
      rows.reduce((sum, r) => sum + r.hours, 0) + getLiveHours(STUDY_TIMER_KEY),
    [rows, getLiveHours, tick],
  )

  const runningRow = rows.find((r) => r.running) || null
  const pausedRow = runningRow
    ? null
    : rows.find((r) => r.hours > 0) || null
  const handleToggle = onToggleTimer || timers.toggleTimer

  function applyCustomDuration() {
    const n = Number(customMin)
    if (!Number.isFinite(n) || n < 1 || n > 240) {
      setStudyError(timerCopy.studyInvalidDuration)
      return
    }
    setStudyDurationMin(Math.floor(n))
    setStudyError('')
    setCustomMin('')
  }

  function startStudy() {
    const n = studyDurationMin
    if (!Number.isFinite(n) || n < 1 || n > 240) {
      setStudyError(timerCopy.studyInvalidDuration)
      return
    }
    setStudyError('')
    study.start(n)
  }

  const studyBusy = study.active

  return (
    <div className="space-y-4">
      <div
        className={`bg-white rounded-2xl border shadow-sm p-4 space-y-3 ${
          study.active && !study.paused && !study.done
            ? 'border-emerald-200'
            : study.paused && !study.done
              ? 'border-amber-200'
              : 'border-slate-200/80'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600 mt-0.5" />
            <div>
              <h2 className="text-base font-bold text-slate-900">{timerCopy.studyTitle}</h2>
              <p className="text-[11px] text-slate-500">{timerCopy.studySubtitle}</p>
            </div>
          </div>

          {!studyBusy ? (
            <button
              type="button"
              onClick={startStudy}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition shadow-sm shrink-0"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {timerCopy.studyStart}
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {!study.done ? (
                <button
                  type="button"
                  onClick={study.paused ? study.resume : study.pause}
                  className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 font-semibold text-xs rounded-xl transition shadow-sm ${
                    study.paused
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-200'
                  }`}
                >
                  {study.paused ? (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Pause className="w-3.5 h-3.5 fill-current" />
                  )}
                  {study.paused ? timerCopy.studyResume : timerCopy.studyPause}
                </button>
              ) : null}
              <button
                type="button"
                onClick={study.done ? study.end : study.openOverlay}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition"
              >
                {study.done ? (
                  timerCopy.studyDone
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5" />
                    {timerCopy.studyFullscreen}
                  </>
                )}
              </button>
              {!study.done ? (
                <button
                  type="button"
                  onClick={study.end}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-600 font-semibold text-xs rounded-xl border border-slate-200 transition"
                >
                  {timerCopy.studyEnd}
                </button>
              ) : null}
            </div>
          )}
        </div>

        {studyBusy ? (
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-1">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {study.done
                  ? timerCopy.studyEndedTitle
                  : study.paused
                    ? timerCopy.studyPausedLabel
                    : timerCopy.studyTimeLeft}
              </p>
              <p
                className={`text-4xl font-extrabold tabular-nums leading-none mt-1 ${
                  study.done
                    ? 'text-slate-400'
                    : study.paused
                      ? 'text-amber-700'
                      : 'text-slate-900'
                }`}
                aria-live="polite"
                aria-atomic="true"
              >
                {study.remainingLabel}
              </p>
            </div>
            <p className="text-[11px] text-slate-500">
              {timerCopy.studyMinutes(study.durationMin)} session · {formatDuration(getLiveHours(STUDY_TIMER_KEY))} logged
            </p>
          </div>
        ) : (
          <div>
            <p className="text-[11px] font-bold text-slate-600 mb-2">
              {timerCopy.studyDurationLabel}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {STUDY_DURATION_PRESETS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setStudyDurationMin(m)
                    setStudyError('')
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                    studyDurationMin === m
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {timerCopy.studyMinutes(m)}
                </button>
              ))}
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  max={240}
                  placeholder={timerCopy.studyCustomPlaceholder}
                  aria-label={timerCopy.studyCustomAria}
                  value={customMin}
                  onChange={(e) => setCustomMin(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      applyCustomDuration()
                    }
                  }}
                  className="w-20 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold text-slate-800"
                />
                <button
                  type="button"
                  onClick={applyCustomDuration}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200"
                >
                  {timerCopy.studyApplyCustom}
                </button>
              </div>
            </div>
            {studyError ? (
              <p className="mt-2 text-[11px] text-rose-600 font-medium" role="alert">
                {studyError}
              </p>
            ) : (
              <p className="mt-2 text-[11px] text-slate-500">
                Selected: {timerCopy.studyMinutes(studyDurationMin)}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-start gap-2">
            <Timer className="w-5 h-5 text-indigo-600 mt-0.5" />
            <div>
              <h2 className="text-base font-bold text-slate-900">{timerCopy.pageTitle}</h2>
              <p className="text-[11px] text-slate-500">{timerCopy.pageSubtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {runningRow ? (
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {timerCopy.running}: {runningRow.title}
              </span>
            ) : pausedRow ? (
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                {timerCopy.paused}: {pausedRow.title}
              </span>
            ) : study.active && !study.paused && !study.done ? (
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {timerCopy.running}: {timerCopy.studyTitle}
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                {timerCopy.idle}
              </span>
            )}
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-1.5 text-right">
              <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1 justify-end">
                <Clock className="w-3 h-3" /> {timerCopy.totalToday}
              </div>
              <div className="text-lg font-extrabold text-indigo-900 tabular-nums">
                {formatDuration(totalHours)}
              </div>
              <div className="text-[10px] text-indigo-600 font-medium">
                {formatHoursShort(totalHours)} h
              </div>
            </div>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-10">{timerCopy.empty}</p>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse text-xs min-w-[560px]">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <th className="p-2.5">Item</th>
                  <th className="p-2.5 w-24">Type</th>
                  <th className="p-2.5 w-40 text-center">Timer</th>
                  <th className="p-2.5 w-24 text-right">Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(({ item, title, meta, key, hours, running }) => (
                  <tr
                    key={item.index_}
                    className={`transition ${
                      running
                        ? 'bg-emerald-50/80 border-l-4 border-l-emerald-500'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="p-2.5 font-semibold text-slate-800 truncate max-w-xs">
                      {title}
                    </td>
                    <td className="p-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          meta.itemType === 'habit'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-indigo-50 text-indigo-700'
                        }`}
                      >
                        {meta.itemType === 'habit' ? 'Habit' : 'Task'}
                      </span>
                    </td>
                    <td className="p-2.5 text-center">
                      <div className="inline-flex justify-center">
                        <TimeControl
                          running={running}
                          hours={hours}
                          onToggleTimer={() => handleToggle(key)}
                        />
                      </div>
                    </td>
                    <td className="p-2.5 text-right font-bold tabular-nums text-slate-700">
                      {formatDuration(hours)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {study.overlay ? (
        <StudyTimer
          remainingLabel={study.remainingLabel}
          paused={study.paused}
          done={study.done}
          onPause={study.pause}
          onResume={study.resume}
          onLeave={study.closeOverlay}
          onEnd={study.end}
        />
      ) : null}
    </div>
  )
}
