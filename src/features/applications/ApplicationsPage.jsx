import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Briefcase,
  CalendarClock,
  Link2,
  Loader2,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import {
  APPLICATION_STATUSES,
  EVENT_TYPES,
  applyStaleRule,
  createApplication,
  createInterviewEvent,
  deleteApplication,
  deleteInterviewEvent,
  listApplications,
  listUpcomingEvents,
  updateApplication,
} from '../../lib/applications.js'
import { getWorkspace, patchWorkspace } from '../../lib/modules.js'
import { GmailPanel } from './GmailPanel.jsx'
import { TabArrangePanel } from './TabArrangePanel.jsx'
import { AiKeyPanel } from './AiKeyPanel.jsx'
import { extractGmailUrlFromNotes } from '../../lib/gmailLinks.js'

const STATUS_STYLES = {
  opportunity: 'bg-violet-50 text-violet-800 border-violet-200',
  applied: 'bg-sky-50 text-sky-800 border-sky-200',
  interviewing: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  offer: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-800 border-rose-200',
  not_selected: 'bg-slate-100 text-slate-600 border-slate-200',
  withdrawn: 'bg-amber-50 text-amber-800 border-amber-200',
}

function emptyAppForm() {
  return {
    company: '',
    role: '',
    status: 'applied',
    applied_at: new Date().toISOString().slice(0, 10),
    notes: '',
    contact_linkedin: '',
    contact_other: '',
  }
}

function emptyEventForm(applicationId = '') {
  const local = new Date()
  local.setMinutes(0, 0, 0)
  local.setHours(local.getHours() + 1)
  const pad = (n) => String(n).padStart(2, '0')
  const localValue = `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}T${pad(local.getHours())}:${pad(local.getMinutes())}`
  return {
    application_id: applicationId,
    title: '',
    event_type: 'interview',
    starts_at_local: localValue,
    link: '',
    notes: '',
  }
}

function statusLabel(value) {
  return APPLICATION_STATUSES.find((s) => s.value === value)?.label || value
}

const STATUS_SORT_RANK = Object.fromEntries(
  APPLICATION_STATUSES.map((s, i) => [s.value, i]),
)

function compareApps(a, b, key, dir) {
  const mul = dir === 'asc' ? 1 : -1
  let av
  let bv
  if (key === 'company') {
    av = `${a.company || ''}\0${a.role || ''}`.toLowerCase()
    bv = `${b.company || ''}\0${b.role || ''}`.toLowerCase()
  } else if (key === 'status') {
    av = STATUS_SORT_RANK[a.status] ?? 99
    bv = STATUS_SORT_RANK[b.status] ?? 99
  } else if (key === 'applied_at') {
    av = a.applied_at || ''
    bv = b.applied_at || ''
  } else {
    av = a[key] ?? ''
    bv = b[key] ?? ''
  }
  if (av < bv) return -1 * mul
  if (av > bv) return 1 * mul
  return (a.company || '').localeCompare(b.company || '')
}

/**
 * Applications board + upcoming interviews + modules prefs for this feature.
 */
export function ApplicationsPage({
  userId,
  taskMetaMap,
  setTaskMetaMap,
  showModulesOnly = false,
}) {
  const workspace = getWorkspace(taskMetaMap)
  const staleDays = workspace.applicationsStaleDays

  const [apps, setApps] = useState([])
  const [upcoming, setUpcoming] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [staleMoved, setStaleMoved] = useState(0)
  const [statusFilter, setStatusFilter] = useState('active')
  const [sortKey, setSortKey] = useState('status')
  const [sortDir, setSortDir] = useState('asc')

  const [appModal, setAppModal] = useState(null) // null | 'new' | app
  const [appForm, setAppForm] = useState(emptyAppForm())
  const [eventModal, setEventModal] = useState(false)
  const [eventForm, setEventForm] = useState(emptyEventForm())
  const [saving, setSaving] = useState(false)

  const reload = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    try {
      const moved = await applyStaleRule(userId, staleDays)
      setStaleMoved(moved)
      const [nextApps, nextUpcoming] = await Promise.all([
        listApplications(userId),
        listUpcomingEvents(userId),
      ])
      setApps(nextApps)
      setUpcoming(nextUpcoming)
    } catch (err) {
      console.error(err)
      setError(
        err?.message ||
          'Could not load applications. Re-run supabase/schema.sql (applications tables), then retry.',
      )
    } finally {
      setLoading(false)
    }
  }, [userId, staleDays])

  useEffect(() => {
    void reload()
  }, [reload])

  const filteredApps = useMemo(() => {
    let list
    if (statusFilter === 'all') list = apps
    else if (statusFilter === 'active') {
      list = apps.filter((a) =>
        ['opportunity', 'applied', 'interviewing'].includes(a.status),
      )
    } else list = apps.filter((a) => a.status === statusFilter)

    return [...list].sort((a, b) => compareApps(a, b, sortKey, sortDir))
  }, [apps, statusFilter, sortKey, sortDir])

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'applied_at' ? 'desc' : 'asc')
    }
  }

  const SortHeader = ({ columnKey, label, className = '' }) => {
    const active = sortKey === columnKey
    const Icon = !active ? ArrowUpDown : sortDir === 'asc' ? ArrowUp : ArrowDown
    return (
      <th className={`p-2.5 font-bold ${className}`}>
        <button
          type="button"
          onClick={() => toggleSort(columnKey)}
          className={`inline-flex items-center gap-1 uppercase tracking-wider hover:text-slate-800 ${
            active ? 'text-indigo-700' : 'text-slate-500'
          }`}
        >
          {label}
          <Icon className="w-3 h-3 shrink-0" aria-hidden />
        </button>
      </th>
    )
  }

  const openNewApp = () => {
    setAppForm(emptyAppForm())
    setAppModal('new')
  }

  const openEditApp = (app) => {
    setAppForm({
      company: app.company || '',
      role: app.role || '',
      status: app.status || 'applied',
      applied_at: app.applied_at || '',
      notes: app.notes || '',
      contact_linkedin: app.contact_linkedin || '',
      contact_other: app.contact_other || '',
    })
    setAppModal(app)
  }

  const saveApp = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (appModal === 'new') {
        await createApplication(userId, appForm)
      } else {
        await updateApplication(userId, appModal.id, appForm)
      }
      setAppModal(null)
      await reload()
    } catch (err) {
      setError(err?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const removeApp = async (id) => {
    if (!window.confirm('Delete this application and its interviews?')) return
    setSaving(true)
    try {
      await deleteApplication(userId, id)
      await reload()
    } catch (err) {
      setError(err?.message || 'Delete failed')
    } finally {
      setSaving(false)
    }
  }

  const openNewEvent = (applicationId = '') => {
    setEventForm(emptyEventForm(applicationId || apps[0]?.id || ''))
    setEventModal(true)
  }

  const saveEvent = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const starts_at = new Date(eventForm.starts_at_local).toISOString()
      await createInterviewEvent(userId, {
        ...eventForm,
        starts_at,
      })
      setEventModal(false)
      await reload()
    } catch (err) {
      setError(err?.message || 'Could not add event')
    } finally {
      setSaving(false)
    }
  }

  const removeEvent = async (id) => {
    if (!window.confirm('Delete this event?')) return
    try {
      await deleteInterviewEvent(userId, id)
      await reload()
    } catch (err) {
      setError(err?.message || 'Delete failed')
    }
  }

  const modulesPanel = (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 space-y-4">
      <div>
        <h2 className="text-base font-bold text-slate-900">Modules</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Turn features on and choose which dashboard tables show.
        </p>
      </div>

      <TabArrangePanel taskMetaMap={taskMetaMap} setTaskMetaMap={setTaskMetaMap} />

      <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/80">
        <input
          type="checkbox"
          className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          checked={Boolean(workspace.modules.applications)}
          onChange={(e) =>
            patchWorkspace(setTaskMetaMap, {
              modules: { applications: e.target.checked },
            })
          }
        />
        <span>
          <span className="block text-sm font-semibold text-slate-800">Applications</span>
          <span className="block text-xs text-slate-500 mt-0.5">
            Track job applications, interviews, calls, and LinkedIn contacts.
          </span>
        </span>
      </label>

      {workspace.modules.applications ? (
        <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-slate-200">
          <label className="text-xs font-semibold text-slate-700">
            Stale after (days)
            <input
              type="number"
              min={1}
              max={365}
              value={staleDays}
              onChange={(e) => {
                const n = Number(e.target.value)
                if (!Number.isFinite(n) || n < 1) return
                patchWorkspace(setTaskMetaMap, { applicationsStaleDays: Math.min(365, n) })
              }}
              className="ml-2 w-16 px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white"
            />
          </label>
          <p className="text-[11px] text-slate-500">
            Applied / Interviewing with no activity for this many days → Not selected.
          </p>
        </div>
      ) : null}

      <GmailPanel
        userId={userId}
        enabled={Boolean(workspace.modules.applications)}
        onSynced={() => void reload()}
      />

      <AiKeyPanel enabled={Boolean(workspace.modules.applications)} />
    </div>
  )

  if (showModulesOnly) {
    return modulesPanel
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-8 flex items-center justify-center gap-2 text-slate-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading applications…
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs px-3 py-2">
          {error}
          <button
            type="button"
            onClick={() => void reload()}
            className="ml-2 font-semibold underline"
          >
            Retry
          </button>
        </div>
      ) : null}

      {staleMoved > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs px-3 py-2">
          Moved {staleMoved} stale application{staleMoved === 1 ? '' : 's'} to Not selected
          (no activity for {staleDays}+ days). Edit status to undo.
        </div>
      ) : null}

      {/* Upcoming */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Upcoming interviews & contacts</h2>
          </div>
          <button
            type="button"
            disabled={apps.length === 0}
            onClick={() => openNewEvent()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-semibold rounded-xl"
          >
            <Plus className="w-3.5 h-3.5" /> Add event
          </button>
        </div>
        {upcoming.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center border border-dashed border-slate-200 rounded-xl">
            No upcoming events. Add an interview, call, or LinkedIn contact linked to an application.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {upcoming.map((ev) => (
              <li key={ev.id} className="py-2.5 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{ev.title}</p>
                  <p className="text-[11px] text-slate-500">
                    {new Date(ev.starts_at).toLocaleString()} ·{' '}
                    {EVENT_TYPES.find((t) => t.value === ev.event_type)?.label || ev.event_type}
                    {ev.applications?.company
                      ? ` · ${ev.applications.company}${ev.applications.role ? ` — ${ev.applications.role}` : ''}`
                      : ''}
                  </p>
                  {ev.link ? (
                    <a
                      href={ev.link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-indigo-600 font-medium mt-0.5"
                    >
                      <Link2 className="w-3 h-3" /> Link
                    </a>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => void removeEvent(ev.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Board */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">Applications</h2>
              <p className="text-[11px] text-slate-500">{apps.length} total</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50"
            >
              <option value="active">Active (opportunity + applied + interviewing)</option>
              <option value="all">All statuses</option>
              {APPLICATION_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={openNewApp}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl"
            >
              <Plus className="w-3.5 h-3.5" /> Add application
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] tracking-wider border-b border-slate-100">
                <SortHeader columnKey="company" label="Company / Role" />
                <SortHeader columnKey="status" label="Status" className="w-28" />
                <SortHeader columnKey="applied_at" label="Applied" className="w-28" />
                <th className="p-2.5 font-bold uppercase text-slate-500">Contacts</th>
                <th className="p-2.5 font-bold w-24" />
              </tr>
            </thead>
            <tbody>
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">
                    No applications in this filter. Add one to start tracking.
                  </td>
                </tr>
              ) : (
                filteredApps.map((app) => (
                  <tr
                    key={app.id}
                    className="border-b border-slate-50 hover:bg-slate-50/80 cursor-pointer"
                    onClick={() => openEditApp(app)}
                  >
                    <td className="p-2.5">
                      <p className="font-semibold text-slate-900">{app.company}</p>
                      <p className="text-slate-500">{app.role || '—'}</p>
                    </td>
                    <td className="p-2.5">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-md border text-[10px] font-bold ${STATUS_STYLES[app.status] || STATUS_STYLES.applied}`}
                      >
                        {statusLabel(app.status)}
                      </span>
                    </td>
                    <td className="p-2.5 text-slate-600">{app.applied_at || '—'}</td>
                    <td className="p-2.5 text-slate-600 max-w-[180px] truncate">
                      {app.contact_linkedin || app.contact_other || '—'}
                    </td>
                    <td className="p-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => openNewEvent(app.id)}
                        className="text-[10px] font-semibold text-indigo-600 mr-2"
                      >
                        + Event
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeApp(app.id)}
                        className="p-1 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* App modal */}
      {appModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <form
            onSubmit={saveApp}
            className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {appModal === 'new' ? 'Add application' : 'Edit application'}
              </h3>
              <button type="button" onClick={() => setAppModal(null)} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <label className="block text-xs font-semibold text-slate-700">
              Company *
              <input
                required
                value={appForm.company}
                onChange={(e) => setAppForm((f) => ({ ...f, company: e.target.value }))}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Role
              <input
                value={appForm.role}
                onChange={(e) => setAppForm((f) => ({ ...f, role: e.target.value }))}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs font-semibold text-slate-700">
                Status
                <select
                  value={appForm.status}
                  onChange={(e) => setAppForm((f) => ({ ...f, status: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                >
                  {APPLICATION_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                Applied on
                <input
                  type="date"
                  value={appForm.applied_at}
                  onChange={(e) => setAppForm((f) => ({ ...f, applied_at: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </label>
            </div>
            <label className="block text-xs font-semibold text-slate-700">
              LinkedIn / recruiter
              <input
                value={appForm.contact_linkedin}
                onChange={(e) =>
                  setAppForm((f) => ({ ...f, contact_linkedin: e.target.value }))
                }
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                placeholder="URL or name"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Other contact
              <input
                value={appForm.contact_other}
                onChange={(e) => setAppForm((f) => ({ ...f, contact_other: e.target.value }))}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Notes
              <textarea
                value={appForm.notes}
                onChange={(e) => setAppForm((f) => ({ ...f, notes: e.target.value }))}
                rows={4}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono text-[12px]"
              />
            </label>
            {extractGmailUrlFromNotes(appForm.notes) ? (
              <a
                href={extractGmailUrlFromNotes(appForm.notes)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900"
              >
                <Link2 className="w-3.5 h-3.5" />
                Open email in Gmail
              </a>
            ) : null}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setAppModal(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-xl disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Event modal */}
      {eventModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <form
            onSubmit={saveEvent}
            className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Add interview / contact</h3>
              <button type="button" onClick={() => setEventModal(false)} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <label className="block text-xs font-semibold text-slate-700">
              Application *
              <select
                required
                value={eventForm.application_id}
                onChange={(e) =>
                  setEventForm((f) => ({ ...f, application_id: e.target.value }))
                }
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
              >
                <option value="">Select…</option>
                {apps.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.company}
                    {a.role ? ` — ${a.role}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Title *
              <input
                required
                value={eventForm.title}
                onChange={(e) => setEventForm((f) => ({ ...f, title: e.target.value }))}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                placeholder="Phone screen, Onsite, LinkedIn ping…"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs font-semibold text-slate-700">
                Type
                <select
                  value={eventForm.event_type}
                  onChange={(e) =>
                    setEventForm((f) => ({ ...f, event_type: e.target.value }))
                  }
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                >
                  {EVENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                When *
                <input
                  type="datetime-local"
                  required
                  value={eventForm.starts_at_local}
                  onChange={(e) =>
                    setEventForm((f) => ({ ...f, starts_at_local: e.target.value }))
                  }
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </label>
            </div>
            <label className="block text-xs font-semibold text-slate-700">
              Meeting link
              <input
                value={eventForm.link}
                onChange={(e) => setEventForm((f) => ({ ...f, link: e.target.value }))}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Notes
              <textarea
                value={eventForm.notes}
                onChange={(e) => setEventForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
              />
            </label>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEventModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-xl disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
