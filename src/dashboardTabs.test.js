import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  getVisibleTabs,
  moveTabInOrder,
  normalizeTabsPrefs,
} from './lib/dashboardTabs.js'

describe('dashboardTabs', () => {
  it('keeps todo visible and fills missing order', () => {
    const tabs = normalizeTabsPrefs({
      order: ['analytics', 'todo'],
      visible: { analytics: false, todo: false },
    })
    assert.equal(tabs.visible.todo, true)
    assert.ok(tabs.order.includes('completed'))
    assert.equal(tabs.order[0], 'analytics')
  })

  it('hides application tabs when module off', () => {
    const list = getVisibleTabs({
      modules: { applications: false },
      tabs: normalizeTabsPrefs({}),
    })
    assert.ok(!list.some((t) => t.id === 'calendar'))
  })

  it('moves tabs in order', () => {
    assert.deepEqual(moveTabInOrder(['a', 'b', 'c'], 'b', 'up'), ['b', 'a', 'c'])
  })
})
