/** Pure helpers for stale application detection. */

export const ACTIVE_STATUSES = new Set(['applied', 'interviewing'])

/**
 * @param {string|Date} lastActivityAt
 * @param {number} staleDays
 * @param {Date} [now]
 */
export function isStaleApplication(lastActivityAt, staleDays, now = new Date()) {
  if (!lastActivityAt || !(staleDays > 0)) return false
  const last = new Date(lastActivityAt)
  if (Number.isNaN(last.getTime())) return false
  const ms = staleDays * 24 * 60 * 60 * 1000
  return now.getTime() - last.getTime() >= ms
}

/**
 * @param {Array<{ id: string, status: string, last_activity_at: string }>} apps
 * @param {number} staleDays
 * @param {Date} [now]
 * @returns {string[]} ids that should move to not_selected
 */
export function findStaleApplicationIds(apps, staleDays, now = new Date()) {
  if (!Array.isArray(apps)) return []
  return apps
    .filter(
      (a) =>
        ACTIVE_STATUSES.has(a.status) &&
        isStaleApplication(a.last_activity_at, staleDays, now),
    )
    .map((a) => a.id)
}
