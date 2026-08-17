import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Keep the screen awake while `active` (Screen Wake Lock API).
 * Best-effort: unsupported / denied → status message, timer still runs.
 */
export function useWakeLock(active) {
  const lockRef = useRef(null)
  const [status, setStatus] = useState('idle') // idle | active | unsupported | denied

  const release = useCallback(async () => {
    const lock = lockRef.current
    lockRef.current = null
    if (!lock) return
    try {
      await lock.release()
    } catch {
      /* already released */
    }
  }, [])

  const request = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.wakeLock?.request) {
      setStatus('unsupported')
      return
    }
    try {
      const lock = await navigator.wakeLock.request('screen')
      lockRef.current = lock
      setStatus('active')
      lock.addEventListener('release', () => {
        if (lockRef.current === lock) {
          lockRef.current = null
          setStatus((s) => (s === 'active' ? 'idle' : s))
        }
      })
    } catch {
      setStatus('denied')
    }
  }, [])

  useEffect(() => {
    if (!active) {
      void release()
      setStatus('idle')
      return undefined
    }

    void request()

    function onVisibility() {
      if (document.visibilityState === 'visible' && !lockRef.current) {
        void request()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      void release()
    }
  }, [active, request, release])

  return { status }
}
