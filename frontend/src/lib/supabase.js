import { createClient } from '@supabase/supabase-js'

const CONFIG_KEY = 'quizrun_supabase_config'
export const DEFAULT_SUPABASE_URL = 'https://meuccdndevwgnkvexydp.supabase.co'
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_uAHzXgYknvXDmDnzVCBgHw_uMKBlsTZ'

/**
 * Supabase 설정 가져오기 (localStorage 또는 공유 설정 또는 내장 기본키)
 */
export function getSupabaseConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.url && (parsed.url.includes('dewv') || parsed.url.includes('ewv'))) {
        parsed.url = DEFAULT_SUPABASE_URL
        try {
          localStorage.setItem(CONFIG_KEY, JSON.stringify(parsed))
        } catch {}
      }
      if (parsed.url && parsed.anonKey) {
        return parsed
      }
    }

    // 다른 학원 앱(Academy 또는 Beaneng) 설정이 브라우저에 있으면 공유
    for (const key of ['hyeongseol_supabase_config', 'beaneng_supabase_config']) {
      const otherRaw = localStorage.getItem(key)
      if (otherRaw) {
        const parsed = JSON.parse(otherRaw)
        if (parsed.anonKey) {
          return { url: DEFAULT_SUPABASE_URL, anonKey: parsed.anonKey }
        }
      }
    }
  } catch (e) {
    console.error('Failed to parse Supabase config:', e)
  }

  // Vite 환경변수가 있으면 대체
  const envUrl = import.meta.env?.VITE_SUPABASE_URL || ''
  const envKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || ''
  if (envUrl && envKey) {
    return { url: envUrl, anonKey: envKey }
  }

  return { url: DEFAULT_SUPABASE_URL, anonKey: DEFAULT_SUPABASE_ANON_KEY }
}

export function cleanSupabaseUrl(rawUrl) {
  if (!rawUrl) return ''
  let u = rawUrl.trim()
  u = u.replace(/\/rest\/v1\/?$/i, '')
  u = u.replace(/\/+$/, '')
  return u
}

export function saveSupabaseConfig(url, anonKey) {
  const cleanUrl = cleanSupabaseUrl(url)
  const cleanKey = (anonKey || '').trim()
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ url: cleanUrl, anonKey: cleanKey }))
  } catch (e) {
    console.warn('Failed to save Supabase config to localStorage:', e)
  }
  resetSupabaseClient()
}

export function clearSupabaseConfig() {
  try {
    localStorage.removeItem(CONFIG_KEY)
  } catch {}
  resetSupabaseClient()
}

let cachedClient = null

export function getSupabaseClient() {
  if (cachedClient) return cachedClient

  const config = getSupabaseConfig()
  const cleanUrl = cleanSupabaseUrl(config.url)
  if (!cleanUrl || !config.anonKey) {
    return null
  }

  try {
    cachedClient = createClient(cleanUrl, config.anonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
    return cachedClient
  } catch (err) {
    console.error('Supabase client creation error:', err)
    return null
  }
}

export function resetSupabaseClient() {
  cachedClient = null
}
