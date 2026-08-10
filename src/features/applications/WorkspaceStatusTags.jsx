import React, { useEffect, useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { subscribeGmailSyncing } from '../../lib/gmailSyncUi.js'
import { getAiKeyStatus } from '../../lib/aiKey.js'

/**
 * Header chips: sync in progress + prompt to add AI key when missing.
 */
export function WorkspaceStatusTags({
  applicationsEnabled,
  userId,
  onOpenModules,
}) {
  const [syncing, setSyncing] = useState(false)
  const [aiOn, setAiOn] = useState(null) // null = unknown / n/a

  useEffect(() => subscribeGmailSyncing(setSyncing), [])

  useEffect(() => {
    if (!applicationsEnabled || !userId) {
      setAiOn(null)
      return
    }
    let cancelled = false
    async function load() {
      try {
        const st = await getAiKeyStatus()
        if (!cancelled) setAiOn(Boolean(st?.enabled))
      } catch {
        if (!cancelled) setAiOn(false)
      }
    }
    void load()
    const onAi = () => void load()
    window.addEventListener('my-task:ai-key-changed', onAi)
    return () => {
      cancelled = true
      window.removeEventListener('my-task:ai-key-changed', onAi)
    }
  }, [applicationsEnabled, userId])

  if (!applicationsEnabled) return null

  return (
    <>
      {syncing ? (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-100 text-sky-900 border border-sky-200 inline-flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" /> Gmail sync running…
        </span>
      ) : null}

      {aiOn === false ? (
        <button
          type="button"
          onClick={() => onOpenModules?.()}
          className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-violet-50 text-violet-800 border border-violet-200 inline-flex items-center gap-1 hover:bg-violet-100 transition"
          title="Add your LLM API key in Modules"
        >
          <Sparkles className="w-3 h-3" /> Add AI intelligence
        </button>
      ) : null}
    </>
  )
}
