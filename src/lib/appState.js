import { supabase } from './supabase.js'
import {
  createEmptySheet,
  EMPTY_META,
  EMPTY_TIMERS,
} from '../seedData.js'

/**
 * Load or create the signed-in user's workspace row.
 * @returns {{ sheetData: array, meta: object, timers: object }}
 */
export async function loadOrCreateAppState(userId) {
  if (!supabase) throw new Error('Supabase is not configured')
  if (!userId) throw new Error('Not signed in')

  const { data, error } = await supabase
    .from('app_state')
    .select('sheet_data, meta, timers')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error

  if (data) {
    return {
      sheetData: Array.isArray(data.sheet_data) ? data.sheet_data : createEmptySheet(),
      meta: data.meta && typeof data.meta === 'object' ? data.meta : { ...EMPTY_META },
      timers: data.timers && typeof data.timers === 'object' ? data.timers : { ...EMPTY_TIMERS },
    }
  }

  const sheetData = createEmptySheet()
  const meta = { ...EMPTY_META }
  const timers = { ...EMPTY_TIMERS }

  const { error: insertError } = await supabase.from('app_state').insert({
    user_id: userId,
    sheet_data: sheetData,
    meta,
    timers,
  })

  if (insertError) throw insertError

  return { sheetData, meta, timers }
}

export async function saveAppState(userId, { sheetData, meta, timers }) {
  if (!supabase) throw new Error('Supabase is not configured')
  if (!userId) throw new Error('Not signed in')

  const { error } = await supabase.from('app_state').upsert(
    {
      user_id: userId,
      sheet_data: sheetData,
      meta: meta ?? {},
      timers: timers ?? {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )

  if (error) throw error
}
