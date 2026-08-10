/** Workspace prefs stored under app_state.meta.__workspace */

import { normalizeTabsPrefs } from './dashboardTabs.js'

export const WORKSPACE_KEY = '__workspace'

export const DEFAULT_WORKSPACE = {
  modules: {
    applications: false,
  },
  applicationsStaleDays: 20,
  tabs: normalizeTabsPrefs({}),
}

export function getWorkspace(meta = {}) {
  const raw = meta?.[WORKSPACE_KEY]
  if (!raw || typeof raw !== 'object') {
    return {
      ...DEFAULT_WORKSPACE,
      modules: { ...DEFAULT_WORKSPACE.modules },
      tabs: normalizeTabsPrefs({}),
    }
  }
  return {
    modules: {
      ...DEFAULT_WORKSPACE.modules,
      ...(raw.modules && typeof raw.modules === 'object' ? raw.modules : {}),
    },
    applicationsStaleDays:
      typeof raw.applicationsStaleDays === 'number' && raw.applicationsStaleDays > 0
        ? raw.applicationsStaleDays
        : DEFAULT_WORKSPACE.applicationsStaleDays,
    tabs: normalizeTabsPrefs(raw.tabs),
  }
}

export function isModuleEnabled(meta, moduleId) {
  return Boolean(getWorkspace(meta).modules[moduleId])
}

/**
 * @param {function} setMeta - React setState for meta
 * @param {object} patch - partial workspace fields
 */
export function patchWorkspace(setMeta, patch) {
  setMeta?.((prev) => {
    const current = getWorkspace(prev)
    const next = {
      modules: {
        ...current.modules,
        ...(patch.modules || {}),
      },
      applicationsStaleDays:
        patch.applicationsStaleDays !== undefined
          ? patch.applicationsStaleDays
          : current.applicationsStaleDays,
      tabs:
        patch.tabs !== undefined
          ? normalizeTabsPrefs({
              ...current.tabs,
              ...patch.tabs,
              visible: {
                ...current.tabs.visible,
                ...(patch.tabs.visible || {}),
              },
              order: patch.tabs.order || current.tabs.order,
            })
          : current.tabs,
    }
    return {
      ...prev,
      [WORKSPACE_KEY]: next,
    }
  })
}
