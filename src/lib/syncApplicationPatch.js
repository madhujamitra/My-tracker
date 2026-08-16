/**
 * Pure sync patch rules for applications.
 * Keep in sync with supabase/functions/_shared/syncApplicationPatch.js
 */

import { earlierIsoDate } from './emailDate.js'
import { pickForwardStatus } from './pipelineStatus.js'

export function isClearApplicationReceipt(text) {
  return /\b(successfully submitted|application (has been )?submitted|you applied today|application to .{1,80} successfully submitted)\b/i.test(
    String(text || ''),
  )
}

export function isUserStatusLocked(app) {
  return String(app?.status_source || '') === 'user'
}

/**
 * Compute fields to patch on an existing application from a Gmail sync hit.
 * Returns null if nothing should change.
 *
 * @param {object} matched existing app row
 * @param {{ status?: string|null, notes?: string|null, appliedAt?: string|null, role?: string|null, now?: string }} incoming
 */
export function computeApplicationSyncPatch(matched, incoming = {}) {
  if (!matched) return null
  const now = incoming.now || new Date().toISOString()
  const roleTrim = incoming.role ? String(incoming.role).trim() : ''
  const notes = incoming.notes || null
  const status = incoming.status || null
  const locked = isUserStatusLocked(matched)

  const patch = {}

  if (!locked && status) {
    let nextStatus = pickForwardStatus(matched.status, status)
    if (
      status === 'applied' &&
      isClearApplicationReceipt(notes) &&
      matched.status === 'interviewing'
    ) {
      nextStatus = 'applied'
    }
    if (nextStatus && nextStatus !== matched.status) {
      patch.status = nextStatus
    }
  }

  const nextApplied = earlierIsoDate(matched.applied_at, incoming.appliedAt)
  if (nextApplied && nextApplied !== matched.applied_at) {
    patch.applied_at = nextApplied
  }

  if (roleTrim && !matched.role) {
    patch.role = roleTrim
  }

  if (notes) {
    if (!matched.notes) {
      patch.notes = notes
    } else if (
      /^From Gmail/i.test(matched.notes) &&
      !/mail\.google\.com/i.test(matched.notes)
    ) {
      patch.notes = notes
    }
  }

  if (Object.keys(patch).length === 0) return null

  patch.updated_at = now
  patch.last_activity_at = now
  return patch
}
