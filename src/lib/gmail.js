import { supabase } from './supabase.js'

async function invoke(name, options = {}) {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data, error } = await supabase.functions.invoke(name, options)
  if (error) {
    let detail = error.message
    try {
      if (error.context && typeof error.context.json === 'function') {
        const body = await error.context.json()
        if (body?.error) detail = body.error
      }
    } catch {
      /* ignore */
    }
    throw new Error(detail || `Function ${name} failed`)
  }
  if (data?.error) throw new Error(data.error)
  return data
}

export async function getGmailStatus() {
  return invoke('gmail-status')
}

export async function startGmailOAuth() {
  const data = await invoke('gmail-oauth-start')
  if (!data?.url) throw new Error('No OAuth URL returned')
  return data.url
}

export async function disconnectGmail() {
  return invoke('gmail-disconnect', { method: 'POST', body: {} })
}

/** Auto-applies last 7 days of job mail. Returns summary counts. */
export async function syncGmail() {
  return invoke('gmail-sync', { method: 'POST', body: {} })
}

export async function listGoogleCalendar() {
  return invoke('google-calendar-list')
}

export async function listNeedsReply(userId, { includeDone = false } = {}) {
  if (!supabase) throw new Error('Supabase is not configured')
  let q = supabase
    .from('mail_needs_reply')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (!includeDone) q = q.eq('status', 'open')
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function markNeedsReplyDone(userId, id) {
  if (!supabase) throw new Error('Supabase is not configured')
  const { error } = await supabase
    .from('mail_needs_reply')
    .update({ status: 'done' })
    .eq('user_id', userId)
    .eq('id', id)
  if (error) throw error
}

export async function countOpenNeedsReply(userId) {
  if (!supabase) throw new Error('Supabase is not configured')
  const { count, error } = await supabase
    .from('mail_needs_reply')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'open')
  if (error) throw error
  return count || 0
}

/**
 * Job KPIs for dashboard cards.
 */
export async function getJobDashboardStats(userId, staleDays = 20) {
  if (!supabase) throw new Error('Supabase is not configured')
  const today = new Date().toISOString().slice(0, 10)
  const [{ data: apps, error: appsErr }, conversations] = await Promise.all([
    supabase
      .from('applications')
      .select('id, status, applied_at, last_activity_at, created_at')
      .eq('user_id', userId),
    countOpenNeedsReply(userId),
  ])
  if (appsErr) throw appsErr
  const list = apps || []
  const appliedToday = list.filter((a) => {
    const d = (a.applied_at || a.created_at || '').slice(0, 10)
    return d === today
  }).length

  const cutoff = Date.now() - staleDays * 24 * 60 * 60 * 1000
  const noUpdate = list.filter((a) => {
    if (!['applied', 'interviewing'].includes(a.status)) return false
    const t = new Date(a.last_activity_at || a.created_at || 0).getTime()
    return t > 0 && t < cutoff
  }).length

  const byStatus = (status) => list.filter((a) => a.status === status).length

  return {
    appliedToday,
    noUpdate,
    conversations,
    interviewing: byStatus('interviewing'),
    rejected: byStatus('rejected'),
    offer: byStatus('offer'),
  }
}
