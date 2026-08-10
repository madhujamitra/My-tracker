import { useEffect, useRef } from 'react'
import { getGmailStatus, syncGmail } from '../../lib/gmail.js'

const HOUR_MS = 60 * 60 * 1000

/**
 * While logged in with Applications on, sync Gmail about once per hour
 * (also when the tab becomes visible again if due).
 */
export function useGmailHourlySync({
  userId,
  enabled,
  onSynced,
}) {
  const onSyncedRef = useRef(onSynced)
  onSyncedRef.current = onSynced

  useEffect(() => {
    if (!userId || !enabled) return

    let cancelled = false
    let timer = null

    async function maybeSync() {
      if (cancelled || document.visibilityState === 'hidden') return
      try {
        const st = await getGmailStatus()
        if (cancelled || !st?.connected) return
        const last = st.last_synced_at ? new Date(st.last_synced_at).getTime() : 0
        if (last && Date.now() - last < HOUR_MS - 30_000) return
        await syncGmail()
        if (!cancelled) onSyncedRef.current?.()
      } catch (err) {
        console.warn('[gmail auto-sync]', err?.message || err)
      }
    }

    void maybeSync()
    timer = setInterval(() => void maybeSync(), HOUR_MS)

    const onVisible = () => {
      if (document.visibilityState === 'visible') void maybeSync()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [userId, enabled])
}
