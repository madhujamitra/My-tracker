import assert from 'node:assert/strict'
import {
  clearStudySession,
  readStudySession,
  STUDY_SESSION_STORAGE_KEY,
  writeStudySession,
} from './features/useStudySession.js'

function memoryStorage() {
  const data = new Map()
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => {
      data.set(k, String(v))
    },
    removeItem: (k) => {
      data.delete(k)
    },
  }
}

{
  const storage = memoryStorage()
  assert.equal(readStudySession(storage), null)
  writeStudySession(
    {
      durationMin: 60,
      endAt: 1_000_000,
      paused: true,
      pausedLeft: 90_000,
      done: false,
    },
    storage,
  )
  const saved = readStudySession(storage)
  assert.equal(saved.durationMin, 60)
  assert.equal(saved.paused, true)
  assert.equal(saved.pausedLeft, 90_000)
  assert.equal(storage.getItem(STUDY_SESSION_STORAGE_KEY) != null, true)
  clearStudySession(storage)
  assert.equal(readStudySession(storage), null)
}

console.log('studySession.test.js: ok')
