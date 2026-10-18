import { getSupabaseClient, getSupabaseConfig } from '../lib/supabase'

export const TABLE_NAME = 'quizrun_store'
export const META_RECORD_ID = 'quizrun_meta'
export const LEGACY_RECORD_ID = 'quizrun_v1'
export const LOCAL_UPDATED_KEY = 'quizrun_local_updated_at'
export const CHUNK_SIZE = 1.5 * 1024 * 1024 // 1.5 MB 청크

let cachedLocalUpdatedAt = null

export function setLocalUpdatedAt(isoString = new Date().toISOString()) {
  cachedLocalUpdatedAt = isoString
  try {
    localStorage.setItem(LOCAL_UPDATED_KEY, isoString)
  } catch (e) {
    console.warn('[Quizrun] Failed to write timestamp to localStorage:', e)
  }
}

export function getLocalUpdatedAt() {
  if (cachedLocalUpdatedAt) return cachedLocalUpdatedAt
  try {
    return localStorage.getItem(LOCAL_UPDATED_KEY) || null
  } catch {
    return null
  }
}

export function formatTime(iso) {
  if (!iso) return '기록 없음'
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  } catch {
    return iso
  }
}

/**
 * 퀴즈런의 모든 로컬 및 퀴즈 데이터 전체 수집
 */
export async function collectAllQuizrunData() {
  const backup = {
    app: 'Quizrun',
    version: '2.0',
    exportedAt: new Date().toISOString(),
    localStorage: {},
    backendQuizzes: null,
    backendConfig: null
  }

  // 1. LocalStorage 전체 수집 (quizrun_, gamerun_, 게임 점수 등)
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && !key.startsWith('quizrun_supabase') && key !== LOCAL_UPDATED_KEY) {
        backup.localStorage[key] = localStorage.getItem(key)
      }
    }
  } catch (e) {
    console.warn('Error reading localStorage for backup:', e)
  }

  // 2. 백엔드 퀴즈 데이터가 있으면 함께 백업
  try {
    const res = await fetch('/api/quizzes', { signal: AbortSignal.timeout(2000) })
    if (res.ok) {
      backup.backendQuizzes = await res.json()
    }
  } catch {}

  return backup
}

/**
 * 퀴즈런의 모든 데이터 복원
 */
export async function restoreAllQuizrunData(backup) {
  if (!backup || typeof backup !== 'object') {
    throw new Error('유효한 퀴즈런 백업 데이터가 아닙니다.')
  }

  // 1. LocalStorage 복원
  if (backup.localStorage && typeof backup.localStorage === 'object') {
    for (const [key, val] of Object.entries(backup.localStorage)) {
      if (key && !key.startsWith('quizrun_supabase') && key !== LOCAL_UPDATED_KEY) {
        try {
          localStorage.setItem(key, val)
        } catch (e) {
          console.warn(`Failed to restore key ${key}:`, e)
        }
      }
    }
  }

  // 2. 백엔드 퀴즈 복원 (로컬 서버가 실행 중일 때)
  if (backup.backendQuizzes) {
    try {
      await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backup.backendQuizzes),
        signal: AbortSignal.timeout(3000)
      })
    } catch {}
  }

  return true
}

/**
 * 클라우드 메타데이터 조회 (0.05초 초고속 확인)
 */
export async function fetchCloudMeta() {
  const client = getSupabaseClient()
  if (!client) {
    return { success: false, error: 'Supabase URL 또는 API Key가 설정되지 않았습니다.' }
  }

  try {
    // 1. 최신 메타데이터 행 조회
    const { data, error } = await client
      .from(TABLE_NAME)
      .select('updated_at, data')
      .eq('id', META_RECORD_ID)
      .maybeSingle()

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
        return { success: false, tableMissing: true, error: 'Supabase에 quizrun_store 테이블이 없습니다.' }
      }
      return { success: false, error: error.message }
    }

    if (data) {
      return { 
        success: true, 
        hasData: true, 
        updatedAt: data.updated_at, 
        isChunked: true, 
        meta: data.data 
      }
    }

    // 2. 구버전 단일 행 조회 지원
    const { data: legData } = await client
      .from(TABLE_NAME)
      .select('updated_at, data')
      .eq('id', LEGACY_RECORD_ID)
      .maybeSingle()

    if (legData) {
      return { 
        success: true, 
        hasData: true, 
        updatedAt: legData.updated_at, 
        isChunked: false, 
        data: legData.data 
      }
    }

    return { success: true, hasData: false, updatedAt: null, data: null }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

/**
 * 로컬 데이터를 Supabase 클라우드로 업로드
 */
export async function uploadCurrentDataToCloud(onProgress) {
  const client = getSupabaseClient()
  if (!client) {
    throw new Error('Supabase가 연결되지 않았습니다. 먼저 URL과 Key를 설정해주세요.')
  }

  const fullData = await collectAllQuizrunData()
  const nowIso = new Date().toISOString()
  const jsonStr = JSON.stringify(fullData)
  const totalBytes = jsonStr.length

  // 데이터 분할 청크 생성
  const chunks = []
  for (let i = 0; i < totalBytes; i += CHUNK_SIZE) {
    chunks.push(jsonStr.slice(i, i + CHUNK_SIZE))
  }
  const totalChunks = chunks.length

  // 순차 청크 업로드
  for (let i = 0; i < totalChunks; i++) {
    const pct = Math.round(((i + 1) / totalChunks) * 100)
    if (onProgress) {
      onProgress(`클라우드 전송 중 (${i + 1}/${totalChunks} 블록 · ${pct}%)`)
    }

    const chunkId = `chunk_${String(i).padStart(4, '0')}`
    const chunkPayload = {
      id: chunkId,
      data: { index: i, total: totalChunks, content: chunks[i] },
      updated_at: nowIso
    }

    const { error } = await client.from(TABLE_NAME).upsert(chunkPayload, { onConflict: 'id' })
    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
        const e = new Error('quizrun_store 테이블이 없습니다. Supabase SQL Editor에서 테이블을 생성해주세요.')
        e.tableMissing = true
        throw e
      }
      throw error
    }
  }

  // 최종 메타데이터 등록
  if (onProgress) onProgress('메타데이터 동기화 완료 중...')

  const metaPayload = {
    id: META_RECORD_ID,
    data: {
      totalChunks,
      totalBytes,
      version: fullData.version || '2.0',
      stats: {
        keysCount: Object.keys(fullData.localStorage || {}).length,
        hasBackend: !!fullData.backendQuizzes
      }
    },
    updated_at: nowIso
  }

  const { error: metaErr } = await client.from(TABLE_NAME).upsert(metaPayload, { onConflict: 'id' })
  if (metaErr) throw metaErr

  setLocalUpdatedAt(nowIso)
  return { 
    success: true, 
    timestamp: nowIso, 
    totalChunks, 
    sizeMB: (totalBytes / 1024 / 1024).toFixed(2) 
  }
}

/**
 * Supabase 클라우드에서 최신 데이터를 가져와 반영
 */
export async function downloadDataFromCloud(onProgress) {
  const client = getSupabaseClient()
  if (!client) {
    throw new Error('Supabase가 연결되지 않았습니다. 먼저 URL과 Key를 설정해주세요.')
  }

  const meta = await fetchCloudMeta()
  if (!meta.success || !meta.hasData) {
    throw new Error('클라우드에 저장된 퀴즈런 데이터가 없습니다. 먼저 로컬 데이터를 업로드해주세요.')
  }

  let backupData = null
  if (!meta.isChunked) {
    backupData = meta.data
  } else {
    const totalChunks = meta.meta?.totalChunks || 0
    if (totalChunks <= 0) throw new Error('클라우드 메타데이터가 올바르지 않습니다.')

    const chunkTexts = new Array(totalChunks)
    const BATCH_SIZE = 5

    for (let i = 0; i < totalChunks; i += BATCH_SIZE) {
      const batchIds = []
      for (let j = i; j < Math.min(i + BATCH_SIZE, totalChunks); j++) {
        batchIds.push(`chunk_${String(j).padStart(4, '0')}`)
      }

      const pct = Math.round((Math.min(i + BATCH_SIZE, totalChunks) / totalChunks) * 100)
      if (onProgress) {
        onProgress(`클라우드 수신 중 (${Math.min(i + BATCH_SIZE, totalChunks)}/${totalChunks} 블록 · ${pct}%)`)
      }

      const { data: rows, error } = await client
        .from(TABLE_NAME)
        .select('id, data')
        .in('id', batchIds)

      if (error) throw error

      for (const row of (rows || [])) {
        const idx = row.data?.index ?? parseInt(row.id.replace('chunk_', ''), 10)
        if (idx >= 0 && idx < totalChunks) {
          chunkTexts[idx] = row.data?.content || ''
        }
      }
    }

    for (let i = 0; i < totalChunks; i++) {
      if (chunkTexts[i] === undefined || chunkTexts[i] === null) {
        throw new Error(`청크 #${i} 데이터가 누락되었습니다.`)
      }
    }

    if (onProgress) onProgress('데이터 블록 병합 및 복원 중...')
    const fullJsonStr = chunkTexts.join('')
    backupData = JSON.parse(fullJsonStr)
  }

  await restoreAllQuizrunData(backupData)
  if (meta.updatedAt) setLocalUpdatedAt(meta.updatedAt)

  return { success: true, updatedAt: meta.updatedAt }
}
