import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { listGoogleCalendar } from '../../lib/gmail.js'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function eventDayKey(start) {
  if (!start) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(start)) return start
  const d = new Date(start)
  if (Number.isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatTime(start) {
  if (!start || /^\d{4}-\d{2}-\d{2}$/.test(start)) return 'All day'
  return new Date(start).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate()
}

/** Month grid calendar with Google events. */
export function CalendarPage() {
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listGoogleCalendar()
      setEvents(data.events || [])
    } catch (err) {
      setError(err?.message || 'Could not load calendar')
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const byDay = useMemo(() => {
    const map = {}
    for (const ev of events) {
      const key = eventDayKey(ev.start)
      if (!key) continue
      if (!map[key]) map[key] = []
      map[key].push(ev)
    }
    return map
  }, [events])

  const cells = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1)
    const startPad = first.getDay()
    const total = daysInMonth(viewYear, viewMonth)
    const out = []
    for (let i = 0; i < startPad; i++) out.push(null)
    for (let d = 1; d <= total; d++) out.push(d)
    while (out.length % 7 !== 0) out.push(null)
    return out
  }, [viewYear, viewMonth])

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleString(undefined, {
    month: 'long',
    year: 'numeric',
  })

  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else setViewMonth((m) => m - 1)
    setSelectedDay(null)
  }

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else setViewMonth((m) => m + 1)
    setSelectedDay(null)
  }

  const dayKey = (d) =>
    `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

  const selectedEvents =
    selectedDay != null ? byDay[dayKey(selectedDay)] || [] : []

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-indigo-600" />
          <div>
            <h2 className="text-base font-bold text-slate-900">Calendar</h2>
            <p className="text-[11px] text-slate-500">Google Calendar · primary</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 hover:bg-white rounded-lg text-slate-600"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-bold text-slate-800 min-w-[8rem] text-center">
              {monthLabel}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 hover:bg-white rounded-lg text-slate-600"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => void reload()}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-xl hover:bg-slate-50"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500 flex items-center gap-2 py-8 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading calendar…
        </p>
      ) : null}

      {error ? (
        <p className="text-xs text-rose-800 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
          {error}
        </p>
      ) : null}

      {!loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAYS.map((w) => (
                <div
                  key={w}
                  className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 py-1"
                >
                  {w}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((d, idx) => {
                if (d == null) {
                  return (
                    <div
                      key={`e-${idx}`}
                      className="min-h-[4.5rem] rounded-lg bg-slate-50/50"
                    />
                  )
                }
                const key = dayKey(d)
                const dayEvents = byDay[key] || []
                const isToday = key === todayKey
                const isSelected = selectedDay === d
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setSelectedDay(d)}
                    className={`min-h-[4.5rem] rounded-lg border p-1.5 text-left transition flex flex-col gap-0.5 ${
                      isSelected
                        ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-200'
                        : isToday
                          ? 'border-indigo-200 bg-indigo-50/40'
                          : 'border-slate-100 bg-white hover:border-slate-200'
                    }`}
                  >
                    <span
                      className={`text-[11px] font-bold ${
                        isToday ? 'text-indigo-700' : 'text-slate-700'
                      }`}
                    >
                      {d}
                    </span>
                    <div className="flex flex-col gap-0.5 overflow-hidden flex-1">
                      {dayEvents.slice(0, 2).map((ev) => (
                        <span
                          key={ev.id}
                          className="block truncate text-[9px] font-semibold px-1 py-0.5 rounded bg-indigo-100 text-indigo-800"
                          title={ev.summary}
                        >
                          {ev.summary}
                        </span>
                      ))}
                      {dayEvents.length > 2 ? (
                        <span className="text-[9px] text-slate-500 font-medium px-0.5">
                          +{dayEvents.length - 2} more
                        </span>
                      ) : null}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {selectedDay
                ? `${monthLabel.split(' ')[0]} ${selectedDay}`
                : 'Select a day'}
            </h3>
            {!selectedDay ? (
              <p className="text-xs text-slate-500">
                Tap a day on the calendar to see events.
              </p>
            ) : selectedEvents.length === 0 ? (
              <p className="text-xs text-slate-500">No events this day.</p>
            ) : (
              <ul className="space-y-2">
                {selectedEvents.map((ev) => (
                  <li
                    key={ev.id}
                    className="bg-white rounded-lg border border-slate-200 p-2.5"
                  >
                    <p className="text-sm font-semibold text-slate-900">{ev.summary}</p>
                    <p className="text-[11px] text-slate-500">{formatTime(ev.start)}</p>
                    {ev.location ? (
                      <p className="text-[11px] text-slate-500">{ev.location}</p>
                    ) : null}
                    {ev.htmlLink ? (
                      <a
                        href={ev.htmlLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 mt-1"
                      >
                        <ExternalLink className="w-3 h-3" /> Open in Google
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
