import React from 'react'
import { ArrowDown, ArrowUp, LayoutList } from 'lucide-react'
import {
  DEFAULT_TAB_ORDER,
  DEFAULT_TAB_VISIBLE,
  TAB_CATALOG,
  moveTabInOrder,
  normalizeTabsPrefs,
} from '../../lib/dashboardTabs.js'
import { patchWorkspace, getWorkspace } from '../../lib/modules.js'

/**
 * Let the user show/hide and reorder dashboard tabs.
 */
export function TabArrangePanel({ taskMetaMap, setTaskMetaMap }) {
  const workspace = getWorkspace(taskMetaMap)
  const tabs = normalizeTabsPrefs(workspace.tabs)
  const appsOn = Boolean(workspace.modules.applications)

  const setTabs = (patch) => {
    patchWorkspace(setTaskMetaMap, {
      tabs: {
        order: patch.order ?? tabs.order,
        visible: patch.visible ?? tabs.visible,
      },
    })
  }

  const reset = () => {
    setTabs({
      order: [...DEFAULT_TAB_ORDER],
      visible: { ...DEFAULT_TAB_VISIBLE },
    })
  }

  return (
    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
            <LayoutList className="w-4 h-4 text-indigo-600" /> Dashboard tables
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Choose which tabs appear and their order. To-Do stays on. Job tabs need Applications
            enabled.
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="text-[11px] font-semibold text-indigo-700 hover:underline"
        >
          Reset defaults
        </button>
      </div>

      <ul className="space-y-1.5">
        {tabs.order.map((id, index) => {
          const meta = TAB_CATALOG.find((t) => t.id === id)
          if (!meta) return null
          const blocked = meta.requiresApplications && !appsOn
          const checked = Boolean(tabs.visible[id])
          return (
            <li
              key={id}
              className={`flex flex-wrap items-center gap-2 rounded-xl border px-2.5 py-2 bg-white ${
                blocked ? 'border-slate-100 opacity-60' : 'border-slate-200'
              }`}
            >
              <label className="flex items-center gap-2 flex-1 min-w-[10rem]">
                <input
                  type="checkbox"
                  disabled={meta.locked || blocked}
                  checked={meta.locked ? true : checked}
                  onChange={(e) =>
                    setTabs({
                      visible: { ...tabs.visible, [id]: e.target.checked },
                    })
                  }
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-semibold text-slate-800">
                  {meta.label}
                  {meta.locked ? (
                    <span className="ml-1 text-[10px] font-medium text-slate-400">always on</span>
                  ) : null}
                  {blocked ? (
                    <span className="ml-1 text-[10px] font-medium text-amber-700">
                      enable Applications
                    </span>
                  ) : null}
                </span>
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() =>
                    setTabs({ order: moveTabInOrder(tabs.order, id, 'up') })
                  }
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                  title="Move up"
                  aria-label={`Move ${meta.label} up`}
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={index === tabs.order.length - 1}
                  onClick={() =>
                    setTabs({ order: moveTabInOrder(tabs.order, id, 'down') })
                  }
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                  title="Move down"
                  aria-label={`Move ${meta.label} down`}
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
