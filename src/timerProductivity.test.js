import assert from 'node:assert/strict'
import {
  hoursByDayInMonth,
  hoursByItemInMonth,
  sumDayHours,
  todayTimedHours,
  totalHoursInMonth,
} from './lib/timerProductivity.js'

const now = Date.UTC(2026, 7, 21, 12, 0, 0)

{
  assert.equal(sumDayHours(null, now), 0)
  assert.equal(sumDayHours({}, now), 0)
  assert.equal(
    sumDayHours(
      {
        1: { hours: 0.5, timerStartedAt: null },
        2: { hours: 1, timerStartedAt: null },
      },
      now,
    ),
    1.5,
  )
}

{
  const started = new Date(now - 1_800_000).toISOString()
  const hrs = sumDayHours(
    { 3: { hours: 1, timerStartedAt: started } },
    now,
  )
  assert.ok(hrs >= 1.49 && hrs <= 1.51, `expected ~1.5h, got ${hrs}`)
}

{
  const timers = {
    '2026-08-01': { 1: { hours: 2, timerStartedAt: null } },
    '2026-08-21': {
      1: { hours: 0.25, timerStartedAt: null },
      4: { hours: 1, timerStartedAt: null },
    },
    '2026-07-21': { 1: { hours: 9, timerStartedAt: null } },
  }
  const days = hoursByDayInMonth(timers, 2026, 7, 31, now)
  assert.equal(days.length, 31)
  assert.equal(days[0].hours, 2)
  assert.equal(days[20].hours, 1.25)
  assert.equal(days[1].hours, 0)
  assert.equal(totalHoursInMonth(timers, 2026, 7, 31, now), 3.25)

  const byItem = hoursByItemInMonth(timers, 2026, 7, 31, now)
  assert.equal(byItem['1'], 2.25)
  assert.equal(byItem['4'], 1)
}

{
  const timers = {
    '2026-08-21': { 1: { hours: 0.75, timerStartedAt: null } },
  }
  assert.equal(todayTimedHours(timers, now, '2026-08-21'), 0.75)
  assert.equal(todayTimedHours(timers, now, '2026-08-20'), 0)
}

{
  const timers = {
    '2026-08-21': {
      1: { hours: 0.25, timerStartedAt: null },
      study: { hours: 1, timerStartedAt: null },
    },
  }
  assert.equal(sumDayHours(timers['2026-08-21'], now), 1.25)
  const byItem = hoursByItemInMonth(timers, 2026, 7, 31, now)
  assert.equal(byItem.study, 1)
}
