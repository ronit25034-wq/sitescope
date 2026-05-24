import { createClient } from '@supabase/supabase-js'

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL
const key  = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = url && key ? createClient(url, key) : null

// ── types ──────────────────────────────────────────────────────────────────────
export interface RankRow {
  id?: string
  domain: string
  keyword: string
  position: number
  impressions: number
  clicks: number
  ctr: number
  audited_at: string
}

export interface AppSetting {
  key: string
  value: unknown
  updated_at?: string
}

// ── helpers ───────────────────────────────────────────────────────────────────
export async function saveSetting(key: string, value: unknown) {
  if (!supabase) return
  await supabase.from('app_settings').upsert({ key, value, updated_at: new Date().toISOString() })
}

export async function getSetting<T>(key: string): Promise<T | null> {
  if (!supabase) return null
  const { data } = await supabase.from('app_settings').select('value').eq('key', key).single()
  return data?.value as T ?? null
}

export async function saveRankHistory(rows: Omit<RankRow, 'id'>[]) {
  if (!supabase || rows.length === 0) return
  await supabase.from('rank_history').insert(rows)
}

export async function getRankHistory(domain: string, keyword: string, limit = 30): Promise<RankRow[]> {
  if (!supabase) return []
  const { data } = await supabase
    .from('rank_history')
    .select('*')
    .eq('domain', domain)
    .eq('keyword', keyword)
    .order('audited_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as RankRow[]
}

export async function getLatestRanks(domain: string): Promise<RankRow[]> {
  if (!supabase) return []
  // Get the most recent audit snapshot for this domain
  const { data: latest } = await supabase
    .from('rank_history')
    .select('audited_at')
    .eq('domain', domain)
    .order('audited_at', { ascending: false })
    .limit(1)
    .single()
  if (!latest) return []

  const { data } = await supabase
    .from('rank_history')
    .select('*')
    .eq('domain', domain)
    .eq('audited_at', latest.audited_at)
    .order('position', { ascending: true })
  return (data ?? []) as RankRow[]
}

export async function getPreviousRanks(domain: string): Promise<RankRow[]> {
  if (!supabase) return []
  // Get the second most recent audit
  const { data: snapshots } = await supabase
    .from('rank_history')
    .select('audited_at')
    .eq('domain', domain)
    .order('audited_at', { ascending: false })
    .limit(2)
  if (!snapshots || snapshots.length < 2) return []

  const { data } = await supabase
    .from('rank_history')
    .select('*')
    .eq('domain', domain)
    .eq('audited_at', snapshots[1].audited_at)
  return (data ?? []) as RankRow[]
}
