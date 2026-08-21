import assert from 'node:assert/strict'
import {
  endAtFromNow,
  formatCountdown,
  formatStudyClock,
  freezeCountdown,
  isCountdownDone,
  remainingMs,
  resumeCountdown,
} from './features/focus-countdown.js'

const end = endAtFromNow(25, 1_000_000)
assert.equal(end, 1_000_000 + 25 * 60_000)
assert.equal(remainingMs(end, 1_000_000), 25 * 60_000)
assert.equal(formatCountdown(65_000), '1:05')
assert.equal(isCountdownDone(end, end), true)
assert.equal(isCountdownDone(end, end - 1), false)

assert.equal(formatStudyClock(65_000), '1:05')
assert.equal(formatStudyClock(3_665_000), '1:01:05')
assert.equal(formatStudyClock(0), '0:00')

{
  const frozen = freezeCountdown(1_000_000 + 90_000, 1_000_000)
  assert.equal(frozen, 90_000)
  assert.equal(resumeCountdown(frozen, 2_000_000), 2_090_000)
  assert.equal(resumeCountdown(-5, 1_000_000), 1_000_000)
}

console.log('focus-countdown.test.js: ok')
