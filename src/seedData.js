/** Build a 34-cell sheet row: [title, d1..d31, total, unused] */
function makeTaskRow(title, checkedDays = []) {
  const row = new Array(34).fill(null)
  row[0] = title
  for (let i = 1; i <= 31; i++) {
    row[i] = checkedDays.includes(i)
  }
  row[32] = checkedDays.length
  return row
}

function makeLeetcodeRow(counts = {}) {
  const row = new Array(34).fill(null)
  row[0] = 'LeetCode Count'
  let sum = 0
  for (let i = 1; i <= 31; i++) {
    const n = counts[i] ?? null
    row[i] = n
    if (typeof n === 'number') sum += n
  }
  row[32] = sum
  return row
}

function makeDailyTotalRow() {
  const row = new Array(34).fill(null)
  row[0] = 'Daily Total'
  for (let i = 1; i <= 31; i++) row[i] = 0
  row[32] = 0
  return row
}

const headerRow = (() => {
  const row = new Array(34).fill(null)
  row[0] = 'Task / Date'
  for (let i = 1; i <= 31; i++) row[i] = i
  row[32] = 'Total'
  return row
})()

const today = new Date()
const day = today.getDate()

/** Sample check-ins relative to today so rollover demos correctly */
function recentDays(offsetDone = []) {
  const days = []
  for (const off of offsetDone) {
    const d = day + off
    if (d >= 1 && d <= 31) days.push(d)
  }
  return days
}

/**
 * Default types for seed rows.
 * Habits = everyday check-ins. Tasks = open until done; miss → next day.
 */
export const SEED_META = {
  'Morning Workout': { itemType: 'habit', priority: 'Normal', createdDay: 1 },
  'Meditate 10 min': { itemType: 'habit', priority: 'Normal', createdDay: 1 },
  'Read 20 pages': {
    itemType: 'todo',
    priority: 'Medium',
    createdDay: Math.max(1, day - 1),
  },
  'Ship side project': {
    itemType: 'todo',
    priority: 'High',
    createdDay: Math.max(1, day - 2),
  },
}

/** Sample sheet-shaped dataset for the current (live) month */
export const SEED_DATA = [
  { index_: 0, row: headerRow },
  // Habits — daily; incomplete yesterday does not "miss-carry"
  { index_: 1, row: makeTaskRow('Morning Workout', recentDays([-3, -2, -1])) },
  { index_: 2, row: makeTaskRow('Meditate 10 min', recentDays([-4, -3, -2, -1])) },
  // Tasks — still open → show as missed since createdDay
  { index_: 3, row: makeTaskRow('Read 20 pages', []) },
  { index_: 4, row: makeTaskRow('Ship side project', []) },
  { index_: 5, row: makeDailyTotalRow() },
  {
    index_: 6,
    row: makeLeetcodeRow(
      Object.fromEntries(
        recentDays([-3, -2, -1]).map((d, i) => [d, i + 1]),
      ),
    ),
  },
]
