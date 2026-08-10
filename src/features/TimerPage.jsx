import { useMemo } from 'react'
import { Clock, Timer } from 'lucide-react'
import { TimeControl } from './TimeControl.jsx'
import { timerCopy } from './timer-copy.js'
import { formatDuration, formatHoursShort } from '../utils/date.js'

/**
 * Timer page — same start/stop + live hours model as todo-app Habits/Tasks.
 * Receives shared timer API from useDayTimers so the queue stays in sync.
 */
export function TimerPage({ items = [], getMeta, timers, onToggleTimer }) {
  const { getLiveHours, isRunning, tick } = timers

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
    () => rows.reduce((sum, r) => sum + r.hours, 0),
    [rows],
  )

  const runningRow = rows.find((r) => r.running) || null
  const handleToggle = onToggleTimer || timers.toggleTimer

  return (
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
  )
}
