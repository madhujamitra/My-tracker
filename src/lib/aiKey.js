import { supabase } from './supabase.js'

async function invoke(name, options = {}) {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data, error } = await supabase.functions.invoke(name, options)
  if (error) {
    let detail = error.message
    try {
      if (error.context && typeof error.context.json === 'function') {
        const body = await error.context.json()
        if (body?.error) detail = body.error
      }
    } catch {
      /* ignore */
    }
    throw new Error(detail || `Function ${name} failed`)
  }
  if (data?.error) throw new Error(data.error)
  return data
}

export async function getAiKeyStatus() {
  return invoke('ai-key-status')
}

export async function saveAiKey({ apiKey, baseUrl, model }) {
  return invoke('ai-key-save', {
    method: 'POST',
    body: { apiKey, baseUrl, model },
  })
}

export async function clearAiKey() {
  return invoke('ai-key-clear', { method: 'POST', body: {} })
}
