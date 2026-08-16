/** Keep in sync with src/lib/pipelineStatus.js */

const RANK = {
  opportunity: 1,
  applied: 2,
  screening: 3,
  assessment: 4,
  interviewing: 5,
  final_round: 6,
  offer: 7,
  accepted: 8,
}

const TERMINAL = new Set([
  'rejected',
  'withdrawn',
  'on_hold',
  'not_selected',
  'not_a_job',
])

export function collapseStatusForPhaseA(status) {
  if (!status) return status
  if (status === 'screening' || status === 'assessment' || status === 'final_round') {
    return 'interviewing'
  }
  if (status === 'accepted') return 'offer'
  if (status === 'on_hold') return 'not_selected'
  return status
}

export function canAdvanceStatus(current, next) {
  const n = collapseStatusForPhaseA(next)
  const c = collapseStatusForPhaseA(current)
  if (!n) return false
  if (!c) return true
  if (c === n) return false
  if (TERMINAL.has(n)) return true
  if (TERMINAL.has(c)) return false
  const rc = RANK[c] ?? 0
  const rn = RANK[n] ?? 0
  return rn > rc
}

export function pickForwardStatus(current, next) {
  const n = collapseStatusForPhaseA(next)
  if (!n) return current || null
  if (!current) return n
  return canAdvanceStatus(current, n) ? n : current
}
