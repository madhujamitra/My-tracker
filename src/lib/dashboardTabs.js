/** Dashboard tab catalog + user order/visibility prefs */

export const TAB_CATALOG = [
  {
    id: 'todo',
    label: 'To-Do & Rollover Queue',
    shortLabel: 'To-Do',
    locked: true,
    requiresApplications: false,
  },
  {
    id: 'completed',
    label: 'Completed Tasks',
    shortLabel: 'Completed',
    locked: false,
    requiresApplications: false,
  },
  {
    id: 'grid',
    label: 'Fixed Habit Matrix',
    shortLabel: 'Habits',
    locked: false,
    requiresApplications: false,
  },
  {
    id: 'timer',
    label: 'Timer',
    shortLabel: 'Timer',
    locked: false,
    requiresApplications: false,
  },
  {
    id: 'analytics',
    label: 'Analytics Trends',
    shortLabel: 'Analytics',
    locked: false,
    requiresApplications: false,
  },
  {
    id: 'applications',
    label: 'Applications',
    shortLabel: 'Apps',
    locked: false,
    requiresApplications: true,
  },
  {
    id: 'calendar',
    label: 'Calendar',
    shortLabel: 'Calendar',
    locked: false,
    requiresApplications: true,
  },
]

export const DEFAULT_TAB_ORDER = TAB_CATALOG.map((t) => t.id)

export const DEFAULT_TAB_VISIBLE = Object.fromEntries(
  TAB_CATALOG.map((t) => [t.id, true]),
)

export function normalizeTabsPrefs(raw = {}) {
  const orderIn = Array.isArray(raw.order) ? raw.order.filter(Boolean) : []
  const seen = new Set()
  const order = []
  for (const id of [...orderIn, ...DEFAULT_TAB_ORDER]) {
    if (TAB_CATALOG.some((t) => t.id === id) && !seen.has(id)) {
      seen.add(id)
      order.push(id)
    }
  }
  const visible = { ...DEFAULT_TAB_VISIBLE }
  if (raw.visible && typeof raw.visible === 'object') {
    for (const t of TAB_CATALOG) {
      if (typeof raw.visible[t.id] === 'boolean') {
        visible[t.id] = t.locked ? true : raw.visible[t.id]
      }
    }
  }
  visible.todo = true
  return { order, visible }
}

/**
 * Tabs to render in the nav, filtered by visibility + applications module.
 */
export function getVisibleTabs(workspace) {
  const tabs = normalizeTabsPrefs(workspace?.tabs)
  const appsOn = Boolean(workspace?.modules?.applications)
  return tabs.order
    .map((id) => TAB_CATALOG.find((t) => t.id === id))
    .filter(Boolean)
    .filter((t) => tabs.visible[t.id])
    .filter((t) => !t.requiresApplications || appsOn)
}

export function moveTabInOrder(order, id, direction) {
  const next = [...order]
  const i = next.indexOf(id)
  if (i < 0) return order
  const j = direction === 'up' ? i - 1 : i + 1
  if (j < 0 || j >= next.length) return order
  ;[next[i], next[j]] = [next[j], next[i]]
  return next
}
