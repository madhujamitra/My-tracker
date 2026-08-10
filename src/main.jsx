import { StrictMode, useCallback, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { SEED_DATA } from './seedData.js'
import { AuthProvider } from './auth/AuthContext.jsx'
import { AuthGate } from './auth/AuthGate.jsx'

/**
 * Local data host that supplies sheet-style props expected by App:
 * data, updateItem, deleteItem, insertItem, moveItem
 */
function Root() {
  const [data, setData] = useState(SEED_DATA)

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
      // Insert before Daily Total / LeetCode footer rows when present
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

  return (
    <App
      data={data}
      updateItem={updateItem}
      deleteItem={deleteItem}
      insertItem={insertItem}
      moveItem={moveItem}
    />
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <AuthGate>
        <Root />
      </AuthGate>
    </AuthProvider>
  </StrictMode>,
)
