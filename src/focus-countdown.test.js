import assert from 'node:assert/strict'
import {
  endAtFromNow,
  formatCountdown,
  isCountdownDone,
  remainingMs,
} from './features/focus-countdown.js'

const end = endAtFromNow(25, 1_000_000)
assert.equal(end, 1_000_000 + 25 * 60_000)
assert.equal(remainingMs(end, 1_000_000), 25 * 60_000)
assert.equal(formatCountdown(65_000), '1:05')
assert.equal(isCountdownDone(end, end), true)
assert.equal(isCountdownDone(end, end - 1), false)

console.log('focus-countdown.test.js: ok')
