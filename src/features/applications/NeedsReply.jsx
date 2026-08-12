import React, { useCallback, useEffect, useState } from 'react'
import { Check, ChevronDown, ChevronUp, ExternalLink, Loader2, MailWarning } from 'lucide-react'
import { listNeedsReply, markNeedsReplyDone } from '../../lib/gmail.js'
import { gmailOpenUrl } from '../../lib/gmailLinks.js'

/** Inline notification + expandable list for the To-Do queue page. */
export function NeedsReplyNotice({ userId, count, open, onToggle, onChanged }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    if (!userId || !open) return
    setLoading(true)
    setError(null)
    try {
      setItems(await listNeedsReply(userId))
    } catch (err) {
      setError(err?.message || 'Could not load messages')
    } finally {
      setLoading(false)
    }
  }, [userId, open])

  useEffect(() => {
    void reload()
  }, [reload])

  if (!userId || !count) return null

  const markDone = async (id) => {
    try {
      await markNeedsReplyDone(userId, id)
      await reload()
      onChanged?.()
    } catch (err) {
      setError(err?.message || 'Update failed')
    }
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-amber-100/60 transition"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-amber-200/80 text-amber-900">
            <MailWarning className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 min-w-[1.1rem] h-[1.1rem] px-0.5 rounded-full bg-amber-600 text-white text-[9px] font-bold flex items-center justify-center">
              {count > 99 ? '99+' : count}
            </span>
          </span>
          <span>
            <span className="block text-sm font-bold text-amber-950">
              {count} waiting for your reply
            </span>
            <span className="block text-[11px] text-amber-800/80">
              {open ? 'Hide list' : 'Tap to review emails that need a response'}
            </span>
          </span>
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-amber-800 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-amber-800 shrink-0" />
        )}
      </button>

      {open ? (
        <div className="border-t border-amber-200 bg-white px-3 py-2 space-y-2">
          {loading ? (
            <p className="text-xs text-slate-500 flex items-center gap-1.5 py-3">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
            </p>
          ) : null}
          {error ? (
            <p className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-2 py-1.5">
              {error}
            </p>
          ) : null}
          {!loading && items.length === 0 ? (
            <p className="text-xs text-slate-500 py-3">No open items. You’re caught up.</p>
          ) : null}
          <ul className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
            {items.map((item) => (
              <li
                key={item.id}
                className="py-2.5 flex flex-wrap items-start justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {item.subject || '(no subject)'}
                  </p>
                  <p className="text-[11px] text-slate-500">{item.from_email}</p>
                  <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">{item.snippet}</p>
                  {gmailOpenUrl(item.gmail_message_id) ? (
                    <a
                      href={gmailOpenUrl(item.gmail_message_id)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 mt-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open in Gmail
                    </a>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => void markDone(item.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200"
                >
                  <Check className="w-3.5 h-3.5" /> Done
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

/** Compact header chip — jumps to To-Do and opens the notice. */
export function NeedsReplyBadge({ count, onOpen }) {
  if (!count) return null
  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative inline-flex items-center gap-1.5 px-3 py-2 font-semibold text-xs rounded-xl border border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 transition"
      title="Emails waiting for your reply"
    >
      <MailWarning className="w-4 h-4" />
      Reply
      <span className="min-w-[1.25rem] h-5 px-1 rounded-full bg-amber-600 text-white text-[10px] font-bold flex items-center justify-center">
        {count > 99 ? '99+' : count}
      </span>
    </button>
  )
}
