import { supabase } from './supabase.js'
import { findStaleApplicationIds } from './staleApplications.js'

export const APPLICATION_STATUSES = [
  { value: 'opportunity', label: 'Opportunity' },
  { value: 'applied', label: 'Applied' },
  { value: 'interviewing', label: 'Interviewing' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'not_selected', label: 'Not selected' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'not_a_job', label: 'Not a job' },
]

export const EVENT_TYPES = [
  { value: 'interview', label: 'Interview' },
  { value: 'call', label: 'Call' },
  { value: 'linkedin', label: 'LinkedIn contact' },
  { value: 'other', label: 'Other' },
]

function requireClient(userId) {
  if (!supabase) throw new Error('Supabase is not configured')
  if (!userId) throw new Error('Not signed in')
}

export async function listApplications(userId) {
  requireClient(userId)
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createApplication(userId, fields) {
  requireClient(userId)
  const now = new Date().toISOString()
  const row = {
    user_id: userId,
    company: String(fields.company || '').trim(),
    role: fields.role?.trim() || null,
    status: fields.status || 'applied',
    status_source: 'user',
    status_locked_at: now,
    applied_at: fields.applied_at || now.slice(0, 10),
    last_activity_at: now,
    notes: fields.notes?.trim() || null,
    contact_linkedin: fields.contact_linkedin?.trim() || null,
    contact_other: fields.contact_other?.trim() || null,
    updated_at: now,
  }
  if (!row.company) throw new Error('Company is required')
  const { data, error } = await supabase
    .from('applications')
    .insert(row)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateApplication(userId, id, fields) {
  requireClient(userId)
  const now = new Date().toISOString()
  const patch = {
    updated_at: now,
    last_activity_at: now,
  }
  for (const key of [
    'company',
    'role',
    'status',
    'applied_at',
    'notes',
    'contact_linkedin',
    'contact_other',
  ]) {
    if (fields[key] !== undefined) {
      patch[key] =
        typeof fields[key] === 'string' ? fields[key].trim() || null : fields[key]
    }
  }
  if (fields.status !== undefined) {
    patch.status_source = 'user'
    patch.status_locked_at = now
  }
  if (patch.company === null || patch.company === '') {
    throw new Error('Company is required')
  }
  const { data, error } = await supabase
    .from('applications')
    .update(patch)
    .eq('user_id', userId)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteApplication(userId, id) {
  requireClient(userId)
  const { error } = await supabase
    .from('applications')
    .delete()
    .eq('user_id', userId)
    .eq('id', id)
  if (error) throw error
}

export async function listUpcomingEvents(userId, { from = new Date(), limit = 50 } = {}) {
  requireClient(userId)
  const { data, error } = await supabase
    .from('interview_events')
    .select('*, applications(company, role)')
    .eq('user_id', userId)
    .gte('starts_at', from.toISOString())
    .order('starts_at', { ascending: true })
    .limit(limit)
  if (error) throw error
  return data || []
}

export async function listEventsForApplication(userId, applicationId) {
  requireClient(userId)
  const { data, error } = await supabase
    .from('interview_events')
    .select('*')
    .eq('user_id', userId)
    .eq('application_id', applicationId)
    .order('starts_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createInterviewEvent(userId, fields) {
  requireClient(userId)
  const row = {
    user_id: userId,
    application_id: fields.application_id,
    title: String(fields.title || '').trim(),
    event_type: fields.event_type || 'interview',
    starts_at: fields.starts_at,
    link: fields.link?.trim() || null,
    notes: fields.notes?.trim() || null,
  }
  if (!row.application_id) throw new Error('Application is required')
  if (!row.title) throw new Error('Title is required')
  if (!row.starts_at) throw new Error('Start time is required')

  const { data, error } = await supabase
    .from('interview_events')
    .insert(row)
    .select()
    .single()
  if (error) throw error

  // Bump activity + move to interviewing if still applied
  const now = new Date().toISOString()
  await supabase
    .from('applications')
    .update({
      last_activity_at: now,
      updated_at: now,
      status: 'interviewing',
    })
    .eq('user_id', userId)
    .eq('id', fields.application_id)
    .in('status', ['opportunity', 'applied', 'interviewing'])

  return data
}

export async function deleteInterviewEvent(userId, id) {
  requireClient(userId)
  const { error } = await supabase
    .from('interview_events')
    .delete()
    .eq('user_id', userId)
    .eq('id', id)
  if (error) throw error
}

/** Mark stale active apps as not_selected. Returns count updated. */
export async function applyStaleRule(userId, staleDays) {
  requireClient(userId)
  const apps = await listApplications(userId)
  const ids = findStaleApplicationIds(apps, staleDays)
  if (ids.length === 0) return 0
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('applications')
    .update({
      status: 'not_selected',
      updated_at: now,
      // keep last_activity_at so user sees when it went quiet
    })
    .eq('user_id', userId)
    .in('id', ids)
  if (error) throw error
  return ids.length
}
