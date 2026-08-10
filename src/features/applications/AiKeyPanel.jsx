import React, { useCallback, useEffect, useState } from 'react'
import { KeyRound, Loader2, Sparkles } from 'lucide-react'
import { clearAiKey, getAiKeyStatus, saveAiKey } from '../../lib/aiKey.js'

/**
 * Modules card: bring-your-own LLM API key (used by gmail-sync when heuristics miss).
 */
export function AiKeyPanel({ enabled }) {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1')
  const [model, setModel] = useState('gpt-4o-mini')
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    if (!enabled) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const st = await getAiKeyStatus()
      setStatus(st)
      if (st.base_url) setBaseUrl(st.base_url)
      if (st.model) setModel(st.model)
    } catch (err) {
      console.error(err)
      setError(
        err?.message ||
          'AI key functions unavailable. Deploy ai-key-* and set AI_KEY_ENCRYPTION_SECRET.',
      )
      setStatus({ enabled: false })
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    void reload()
  }, [reload])

  const onSave = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const res = await saveAiKey({ apiKey, baseUrl, model })
      setApiKey('')
      setStatus(res)
      setMessage(
        'API key saved. Next Sync will use AI when rules miss a message (max 15 AI calls/sync).',
      )
      await reload()
    } catch (err) {
      setError(err?.message || 'Could not save key')
    } finally {
      setBusy(false)
    }
  }

  const onClear = async () => {
    if (!window.confirm('Remove your AI API key from the server?')) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      await clearAiKey()
      setStatus({ enabled: false, key_hint: null })
      setMessage('API key removed. Sync will keep using rule-based classification.')
    } catch (err) {
      setError(err?.message || 'Could not clear key')
    } finally {
      setBusy(false)
    }
  }

  if (!enabled) {
    return (
      <div className="p-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/50">
        <p className="text-sm font-semibold text-slate-700">AI email analysis</p>
        <p className="text-xs text-slate-500 mt-1">
          Enable Applications first, then add your own LLM API key (optional).
        </p>
      </div>
    )
  }

  return (
    <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-600" /> AI email analysis
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Optional. Paste your own OpenAI-compatible API key. Stored encrypted on the server —
            never in the browser. On Sync, rules run first; AI fills gaps (offers, odd wording).
            Invalid key or rate limits → sync continues with rules only.
          </p>
        </div>
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
        ) : status?.enabled ? (
          <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
            AI on{status.key_hint ? ` · ${status.key_hint}` : ''}
          </span>
        ) : (
          <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-bold">
            AI off
          </span>
        )}
      </div>

      <form onSubmit={onSave} className="space-y-2">
        <label className="block text-xs font-semibold text-slate-700">
          API key
          <div className="mt-1 flex items-center gap-2">
            <span className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-400">
              <KeyRound className="w-3.5 h-3.5" />
            </span>
            <input
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={
                status?.enabled
                  ? 'Paste a new key to replace…'
                  : 'sk-… or your provider key'
              }
              className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </label>

        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="text-[11px] font-semibold text-indigo-700 hover:underline"
        >
          {showAdvanced ? 'Hide advanced' : 'Advanced (base URL & model)'}
        </button>

        {showAdvanced ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="block text-xs font-semibold text-slate-700">
              Base URL
              <input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Model
              <input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
              />
            </label>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="submit"
            disabled={busy || !apiKey.trim()}
            className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl"
          >
            {busy ? 'Saving…' : 'Save key'}
          </button>
          {status?.enabled ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void onClear()}
              className="px-3 py-1.5 text-xs font-semibold border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50"
            >
              Clear key
            </button>
          ) : null}
        </div>
      </form>

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
