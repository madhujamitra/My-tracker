/**
 * Tiny pub/sub so GmailPanel + hourly sync can show a top “Syncing…” tag.
 */

let syncing = false
const listeners = new Set()

export function getGmailSyncing() {
  return syncing
}

export function subscribeGmailSyncing(listener) {
  listeners.add(listener)
  listener(syncing)
  return () => listeners.delete(listener)
}

export function setGmailSyncing(next) {
  const v = Boolean(next)
  if (v === syncing) return
  syncing = v
  listeners.forEach((fn) => {
    try {
      fn(syncing)
    } catch {
      /* ignore */
    }
  })
}

/** Wrap any sync promise so the top tag stays accurate. */
export async function withGmailSyncing(fn) {
  setGmailSyncing(true)
  try {
    return await fn()
  } finally {
    setGmailSyncing(false)
  }
}
