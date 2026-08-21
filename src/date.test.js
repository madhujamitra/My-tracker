import assert from 'node:assert/strict'
import {
  formatDuration,
  formatHoursShort,
  liveHours,
  localISODate,
} from './utils/date.js'

assert.match(localISODate(new Date(2026, 7, 10)), /^2026-08-10$/)
assert.equal(formatDuration(0), '0:00')
assert.equal(formatDuration(1 / 60), '1:00')
assert.equal(formatDuration(1.5), '1:30:00')
assert.equal(formatHoursShort(1.234), '1.23')

{
  const base = liveHours({ hours: 0.5, timerStartedAt: null })
  assert.equal(base, 0.5)
}

{
  const started = new Date(Date.now() - 3600_000).toISOString()
  const hrs = liveHours({ hours: 1, timerStartedAt: started }, 1)
  assert.ok(hrs >= 1.99 && hrs <= 2.02, `expected ~2h, got ${hrs}`)
}

{
  const started = new Date(1_000_000).toISOString()
  const hrs = liveHours({ hours: 0.5, timerStartedAt: started }, 0, 1_000_000 + 1_800_000)
  assert.ok(hrs >= 0.99 && hrs <= 1.01, `expected ~1h, got ${hrs}`)
}

console.log('date.test.js: ok')
