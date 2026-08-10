import React, { useCallback, useEffect, useState } from 'react'
import { Link2, Loader2, Mail, RefreshCw } from 'lucide-react'
import {
  disconnectGmail,
  getGmailStatus,
  startGmailOAuth,
  syncGmail,
} from '../../lib/gmail.js'
import { withGmailSyncing } from '../../lib/gmailSyncUi.js'

/**
 * Connect / sync Gmail. Sync auto-applies applications, rejections, interviews, needs-reply.
 */
export function GmailPanel({ userId, enabled, onSynced }) {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    if (!userId || !enabled) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const st = await getGmailStatus()
      setStatus(st)
    } catch (err) {
      console.error(err)
      setError(
        err?.message ||
          'Gmail functions unavailable. Deploy Edge Functions and set Google secrets.',
      )
      setStatus({ connected: false })
    } finally {
      setLoading(false)
    }
  }, [userId, enabled])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const gmail = params.get('gmail')
    if (!gmail) return
    if (gmail === 'connected') {
      setMessage('Google connected (Gmail + Calendar). Run Sync to import the last 7 days.')
      void reload()
    } else if (gmail === 'error') {
      setError(params.get('reason') || 'Google connect failed')
    }
    params.delete('gmail')
    params.delete('reason')
    const next = params.toString()
    window.history.replaceState(
      {},
      '',
      `${window.location.pathname}${next ? `?${next}` : ''}`,
    )
  }, [reload])

  const connect = async () => {
    setBusy(true)
    setError(null)
    try {
      const url = await startGmailOAuth()
      window.location.href = url
    } catch (err) {
      setError(err?.message || 'Could not start Google OAuth')
      setBusy(false)
    }
  }

  const disconnect = async () => {
    if (!window.confirm('Disconnect Google? Tokens are deleted.')) return
    setBusy(true)
    setError(null)
    try {
      await disconnectGmail()
      setMessage('Disconnected')
      await reload()
    } catch (err) {
      setError(err?.message || 'Disconnect failed')
    } finally {
      setBusy(false)
    }
  }

  const runSync = async () => {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const r = await withGmailSyncing(() => syncGmail())
      const parts = [
        `Last 7 days · scanned ${r.scanned}`,
        `apps ${r.applications}`,
        `rejected ${r.rejected}`,
        `offers ${r.offers ?? 0}`,
        `interviews ${r.interviews}`,
        `needs reply ${r.needs_reply}`,
        `skipped ${r.skipped}`,
      ]
      if (r.ai_enabled) {
        parts.push(
          `AI ${r.ai_hits ?? 0}/${r.ai_calls ?? 0} hits` +
            (r.ai_errors ? ` · ${r.ai_errors} AI errors (rules used)` : ''),
        )
      }
      if (r.dates_corrected) {
        parts.push(`dates fixed ${r.dates_corrected}`)
      }
      setMessage(parts.join(' · '))
      await reload()
      onSynced?.()
    } catch (err) {
      setError(err?.message || 'Sync failed')
    } finally {
      setBusy(false)
    }
  }

  if (!enabled) {
    return (
      <div className="p-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/50">
        <p className="text-sm font-semibold text-slate-700">Google sync</p>
        <p className="text-xs text-slate-500 mt-1">
          Enable Applications first, then connect Gmail + Calendar (readonly).
        </p>
      </div>
    )
  }

  return (
    <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-3">
      <div>
        <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
          <Mail className="w-4 h-4 text-indigo-600" /> Google sync
        </p>
        <p className="text-xs text-slate-500 mt-0.5">
          Sync last <strong>7 days</strong>: new apps, rejections, offers, calendar/interview
          invites, and “needs reply” apply automatically. With an AI key in Modules, ambiguous
          mail can be classified by your LLM (rules still run first). While logged in, sync also
          runs about <strong>every hour</strong>. Reconnect if you connected before Calendar was
          added.
        </p>
      </div>

      {loading ? (
        <p className="text-xs text-slate-500 flex items-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking connection…
        </p>
      ) : status?.connected ? (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
            Connected{status.email ? ` · ${status.email}` : ''}
          </span>
          {status.last_synced_at ? (
            <span className="text-slate-500">
              Last sync {new Date(status.last_synced_at).toLocaleString()}
            </span>
          ) : (
            <span className="text-slate-500">Never synced</span>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => void runSync()}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Sync now
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void disconnect()}
            className="px-3 py-1.5 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => void connect()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl"
        >
          <Link2 className="w-3.5 h-3.5" /> Connect Google (Gmail + Calendar)
        </button>
      )}

      {message ? (
        <p className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1.5">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-[11px] text-rose-800 bg-rose-50 border border-rose-100 rounded-lg px-2 py-1.5">
          {error}
        </p>
      ) : null}
    </div>
  )
}
