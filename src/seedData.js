/** Minimal empty workspace — no demo habits/tasks. */
function makeHeaderRow() {
  const row = new Array(34).fill(null)
  row[0] = 'Task / Date'
  for (let i = 1; i <= 31; i++) row[i] = i
  row[32] = 'Total'
  return row
}

function makeDailyTotalRow() {
  const row = new Array(34).fill(null)
  row[0] = 'Daily Total'
  for (let i = 1; i <= 31; i++) row[i] = 0
  row[32] = 0
  return row
}

function makeLeetcodeRow() {
  const row = new Array(34).fill(null)
  row[0] = 'LeetCode Count'
  for (let i = 1; i <= 31; i++) row[i] = null
  row[32] = 0
  return row
}

/** Fresh sheet for a new user (header + footer rows only). */
export function createEmptySheet() {
  return [
    { index_: 0, row: makeHeaderRow() },
    { index_: 1, row: makeDailyTotalRow() },
    { index_: 2, row: makeLeetcodeRow() },
  ]
}

export const EMPTY_META = {}
export const EMPTY_TIMERS = {}
