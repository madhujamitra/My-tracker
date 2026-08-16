import assert from 'node:assert/strict'
import { classifyItem, isCellDone, sortQueueItems } from './itemClassify.js'

function rowWith(...doneDays) {
  const row = new Array(34).fill(false)
  row[0] = 'Sample'
  for (const d of doneDays) row[d] = true
  return row
}

// --- habits: daily, never carry ---
{
  const r = classifyItem({
    row: rowWith(9),
    itemType: 'habit',
    createdDay: 1,
    refDay: 10,
  })
  assert.equal(r.isDoneToday, false)
  assert.equal(r.isRolledOver, false)
  assert.equal(r.missedDay, null)
  assert.equal(r.statusLabel, 'due_today')
  assert.equal(r.includeInQueue, true)
}

{
  const r = classifyItem({
    row: rowWith(10),
    itemType: 'habit',
    createdDay: 1,
    refDay: 10,
  })
  assert.equal(r.isDoneToday, true)
  assert.equal(r.isRolledOver, false)
  assert.equal(r.statusLabel, 'completed')
}

// --- tasks: miss today → show as missed tomorrow ---
{
  const r = classifyItem({
    row: rowWith(),
    itemType: 'todo',
    createdDay: 10,
    refDay: 10,
  })
  assert.equal(r.isRolledOver, false)
  assert.equal(r.statusLabel, 'due_today')
  assert.equal(r.includeInQueue, true)
}

{
  const r = classifyItem({
    row: rowWith(),
    itemType: 'todo',
    createdDay: 9,
    refDay: 10,
  })
  assert.equal(r.isRolledOver, true)
  assert.equal(r.missedDay, 9)
  assert.equal(r.statusLabel, 'missed')
  assert.equal(r.includeInQueue, true)
}

{
  // Completed yesterday → closed, not on today's queue
  const r = classifyItem({
    row: rowWith(9),
    itemType: 'todo',
    createdDay: 8,
    refDay: 10,
  })
  assert.equal(r.isClosed, true)
  assert.equal(r.completedOn, 9)
  assert.equal(r.includeInQueue, false)
  assert.equal(r.statusLabel, 'completed')
}

{
  // Completed today → still visible, marked done
  const r = classifyItem({
    row: rowWith(10),
    itemType: 'todo',
    createdDay: 8,
    refDay: 10,
  })
  assert.equal(r.isClosed, true)
  assert.equal(r.isDoneToday, true)
  assert.equal(r.includeInQueue, true)
}

// --- scheduled (advance date): hidden until due day ---
{
  const r = classifyItem({
    row: rowWith(),
    itemType: 'todo',
    createdDay: 20,
    refDay: 15,
    recurrence: 'scheduled',
  })
  assert.equal(r.includeInQueue, false)
  assert.equal(r.statusLabel, 'scheduled')
}

{
  const r = classifyItem({
    row: rowWith(),
    itemType: 'todo',
    createdDay: 20,
    refDay: 20,
    recurrence: 'scheduled',
  })
  assert.equal(r.includeInQueue, true)
  assert.equal(r.statusLabel, 'due_today')
}

{
  const r = classifyItem({
    row: rowWith(),
    itemType: 'todo',
    createdDay: 20,
    refDay: 22,
    recurrence: 'scheduled',
  })
  assert.equal(r.isRolledOver, true)
  assert.equal(r.missedDay, 20)
  assert.equal(r.includeInQueue, true)
}

// --- weekly: due every 7 days from anchor ---
{
  const r = classifyItem({
    row: rowWith(),
    itemType: 'todo',
    createdDay: 10,
    refDay: 10,
    recurrence: 'weekly',
  })
  assert.equal(r.includeInQueue, true)
  assert.equal(r.periodStart, 10)
  assert.equal(r.statusLabel, 'due_today')
}

{
  const r = classifyItem({
    row: rowWith(),
    itemType: 'todo',
    createdDay: 10,
    refDay: 12,
    recurrence: 'weekly',
  })
  assert.equal(r.isRolledOver, true)
  assert.equal(r.missedDay, 10)
  assert.equal(r.includeInQueue, true)
}

{
  const r = classifyItem({
    row: rowWith(11),
    itemType: 'todo',
    createdDay: 10,
    refDay: 12,
    recurrence: 'weekly',
  })
  assert.equal(r.isClosed, true)
  assert.equal(r.includeInQueue, false)
}

{
  const r = classifyItem({
    row: rowWith(11),
    itemType: 'todo',
    createdDay: 10,
    refDay: 17,
    recurrence: 'weekly',
  })
  assert.equal(r.isClosed, false)
  assert.equal(r.periodStart, 17)
  assert.equal(r.includeInQueue, true)
  assert.equal(r.statusLabel, 'due_today')
}

// --- biweekly ---
{
  const r = classifyItem({
    row: rowWith(),
    itemType: 'todo',
    createdDay: 1,
    refDay: 14,
    recurrence: 'biweekly',
  })
  assert.equal(r.periodStart, 1)
  assert.equal(r.isRolledOver, true)
  assert.equal(r.includeInQueue, true)
}

{
  const r = classifyItem({
    row: rowWith(3),
    itemType: 'todo',
    createdDay: 1,
    refDay: 15,
    recurrence: 'biweekly',
  })
  assert.equal(r.periodStart, 15)
  assert.equal(r.isClosed, false)
  assert.equal(r.includeInQueue, true)
}

assert.equal(isCellDone([null, true], 1), true)
assert.equal(isCellDone([null, false], 1), false)

{
  const items = [
    { isRolledOver: false, isDoneToday: true, isClosed: true },
    { isRolledOver: true, isDoneToday: false, isClosed: false },
    { isRolledOver: false, isDoneToday: false, isClosed: false },
  ]
  const sorted = [...items].sort(sortQueueItems)
  assert.equal(sorted[0].isRolledOver, true)
  assert.equal(sorted[1].isDoneToday, false)
  assert.equal(sorted[2].isClosed, true)
}

console.log('itemClassify.test.js: ok')
