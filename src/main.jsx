import {
  StrictMode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { createEmptySheet } from './seedData.js'
import { AuthProvider } from './auth/AuthContext.jsx'
import { AuthGate } from './auth/AuthGate.jsx'
import { useAuth } from './auth/AuthContext.jsx'
import { loadOrCreateAppState, saveAppState } from './lib/appState.js'
import { localISODate } from './utils/date.js'

const SAVE_DEBOUNCE_MS = 500

/**
 * Loads/saves per-user workspace from Supabase (sheet + meta + timers).
 */
function WorkspaceHost() {
  const { user } = useAuth()
  const [data, setData] = useState([])
  const [meta, setMeta] = useState({})
  const [timersByDate, setTimersByDate] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saveError, setSaveError] = useState(null)
  const readyRef = useRef(false)
  const saveTimerRef = useRef(null)

  const today = localISODate()
  const todayTimers = timersByDate[today] || {}

  const reload = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    setError(null)
    readyRef.current = false
    try {
      const state = await loadOrCreateAppState(user.id)
      setData(state.sheetData)
      setMeta(state.meta)
      setTimersByDate(state.timers)
      setSaveError(null)
      readyRef.current = true
    } catch (err) {
      console.error(err)
      setError(
        err?.message ||
          'Could not load workspace. Run supabase/schema.sql in the Supabase SQL Editor, then retry.',
      )
      setData(createEmptySheet())
      setMeta({})
      setTimersByDate({})
      readyRef.current = false
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    if (!user?.id || !readyRef.current || loading) return

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      void saveAppState(user.id, {
        sheetData: data,
        meta,
        timers: timersByDate,
      })
        .then(() => setSaveError(null))
        .catch((err) => {
          console.error(err)
          setSaveError(err?.message || 'Could not save workspace')
        })
    }, SAVE_DEBOUNCE_MS)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [user?.id, data, meta, timersByDate, loading])

  const updateItem = useCallback((index_, newRow) => {
    setData((prev) =>
      prev.map((item) =>
        item.index_ === index_ ? { ...item, row: newRow } : item,
      ),
    )
  }, [])

  const deleteItem = useCallback((index_) => {
    setData((prev) => {
      const next = prev.filter((item) => item.index_ !== index_)
      return next.map((item, i) => ({ ...item, index_: i }))
    })
  }, [])

  const insertItem = useCallback((_afterIndex, newRow) => {
    setData((prev) => {
      const footerIdx = prev.findIndex((item) => {
        const title = String(item.row?.[0] || '').toLowerCase()
        return title === 'daily total' || title.includes('leetcode count')
      })
      const insertAt = footerIdx === -1 ? prev.length : footerIdx
      const next = [...prev]
      next.splice(insertAt, 0, { index_: insertAt, row: newRow })
      return next.map((item, i) => ({ ...item, index_: i }))
    })
  }, [])

  const moveItem = useCallback((fromIndex, toIndex) => {
    setData((prev) => {
      if (toIndex < 0 || toIndex >= prev.length) return prev
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next.map((item, i) => ({ ...item, index_: i }))
    })
  }, [])

  const setTodayTimers = useCallback(
    (nextEntries) => {
      setTimersByDate((prev) => ({
        ...prev,
        [today]: nextEntries,
      }))
    },
    [today],
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-500 font-sans">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center max-w-sm">
          <h2 className="text-base font-bold text-slate-800 mb-1">Loading workspace…</h2>
          <p className="text-xs text-slate-500">Syncing your data from Supabase.</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="bg-white p-8 rounded-2xl border border-rose-200 shadow-sm text-center max-w-md space-y-3">
          <h2 className="text-base font-bold text-slate-800">Couldn’t load workspace</h2>
          <p className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-xl p-3 text-left">
            {error}
          </p>
          <p className="text-xs text-slate-500 text-left">
            Open Supabase → SQL Editor → paste and run{' '}
            <code className="text-indigo-700">supabase/schema.sql</code>, then retry.
          </p>
          <button
            type="button"
            onClick={() => void reload()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {saveError ? (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] max-w-md w-[calc(100%-1.5rem)] px-3 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold shadow-lg">
          Save failed: {saveError}
        </div>
      ) : null}
      <App
        data={data}
        updateItem={updateItem}
        deleteItem={deleteItem}
        insertItem={insertItem}
        moveItem={moveItem}
        taskMetaMap={meta}
        setTaskMetaMap={setMeta}
        timerEntries={todayTimers}
        onTimerEntriesChange={setTodayTimers}
      />
    </>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <AuthGate>
        <WorkspaceHost />
      </AuthGate>
    </AuthProvider>
  </StrictMode>,
)
