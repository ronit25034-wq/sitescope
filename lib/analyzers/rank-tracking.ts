/**
 * Rank Tracking via Google Search Console API
 *
 * Flow:
 *  1. User connects GSC via OAuth (/api/auth/gsc)
 *  2. Refresh token stored in Supabase app_settings
 *  3. Every audit: fetch top 25 keywords + positions from GSC → save to Supabase
 *  4. Return current ranks + history for display
 */

import { getSetting, saveRankHistory, getLatestRanks, getPreviousRanks, type RankRow } from '../supabase'

const GSC_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GSC_API_BASE  = 'https://www.googleapis.com/webmasters/v3'

// ── Token management ──────────────────────────────────────────────────────────
interface TokenData {
  refresh_token: string
  access_token?: string
  expiry?: number          // ms timestamp
}

async function getAccessToken(): Promise<string | null> {
  const stored = await getSetting<TokenData>('gsc_token')
  if (!stored?.refresh_token) return null

  const clientId     = process.env.GSC_CLIENT_ID
  const clientSecret = process.env.GSC_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  // Reuse cached access token if still valid (5 min buffer)
  if (stored.access_token && stored.expiry && Date.now() < stored.expiry - 300_000) {
    return stored.access_token
  }

  // Exchange refresh token for a fresh access token
  try {
    const res = await fetch(GSC_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     clientId,
        client_secret: clientSecret,
        refresh_token: stored.refresh_token,
        grant_type:    'refresh_token',
      }),
    })
    if (!res.ok) return null
    const json = await res.json() as { access_token: string; expires_in: number }

    // Update cached token in Supabase
    const { saveSetting } = await import('../supabase')
    await saveSetting('gsc_token', {
      ...stored,
      access_token: json.access_token,
      expiry: Date.now() + json.expires_in * 1000,
    })
    return json.access_token
  } catch {
    return null
  }
}

// ── GSC Search Analytics ──────────────────────────────────────────────────────
export interface GSCKeyword {
  keyword: string
  position: number
  clicks: number
  impressions: number
  ctr: number
}

export async function fetchGSCKeywords(siteUrl: string): Promise<GSCKeyword[]> {
  const token = await getAccessToken()
  if (!token) return []

  const endDate   = new Date()
  const startDate = new Date(endDate)
  startDate.setDate(startDate.getDate() - 28)  // last 28 days

  const fmt = (d: Date) => d.toISOString().slice(0, 10)

  try {
    const res = await fetch(
      `${GSC_API_BASE}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: fmt(startDate),
          endDate: fmt(endDate),
          dimensions: ['query'],
          rowLimit: 25,
          orderBy: [{ fieldName: 'impressions', sortOrder: 'descending' }],
          dataState: 'final',
        }),
      }
    )
    if (!res.ok) return []

    const data = await res.json() as {
      rows?: Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }>
    }

    return (data.rows ?? []).map(r => ({
      keyword:     r.keys[0],
      position:    Math.round(r.position * 10) / 10,
      clicks:      r.clicks,
      impressions: r.impressions,
      ctr:         Math.round(r.ctr * 1000) / 10,   // percentage
    }))
  } catch {
    return []
  }
}

// ── GSC Site List (for property discovery) ────────────────────────────────────
export async function listGSCSites(): Promise<Array<{ siteUrl: string; permissionLevel: string }>> {
  const token = await getAccessToken()
  if (!token) return []

  try {
    const res = await fetch(`${GSC_API_BASE}/sites`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return []
    const data = await res.json() as { siteEntry?: Array<{ siteUrl: string; permissionLevel: string }> }
    return data.siteEntry ?? []
  } catch {
    return []
  }
}

// ── Main: fetch + persist + return results ────────────────────────────────────
export interface RankTrackingResult {
  available: boolean           // GSC connected + data returned
  connected: boolean           // OAuth token present
  keywords: RankRow[]          // current snapshot
  previous: RankRow[]          // previous snapshot for delta calculation
  siteUrl: string | null
}

export async function getRankTracking(domain: string): Promise<RankTrackingResult> {
  const empty = { available: false, connected: false, keywords: [], previous: [], siteUrl: null }

  // Check if we have a GSC token at all
  const stored = await getSetting<{ refresh_token?: string }>('gsc_token')
  if (!stored?.refresh_token) return empty

  const connected = true

  // Determine siteUrl — try sc-domain: format first (domain property), then https://
  const storedSiteUrl = await getSetting<string>('gsc_site_url')
  const siteUrl = storedSiteUrl || `sc-domain:${domain.replace(/^www\./, '')}` || `https://${domain}`

  // Fetch from GSC
  const gscRows = await fetchGSCKeywords(siteUrl)

  if (gscRows.length > 0) {
    const now = new Date().toISOString()
    const toSave: Omit<RankRow, 'id'>[] = gscRows.map(r => ({
      domain,
      keyword:     r.keyword,
      position:    r.position,
      impressions: r.impressions,
      clicks:      r.clicks,
      ctr:         r.ctr,
      audited_at:  now,
    }))
    await saveRankHistory(toSave)
  }

  // Pull current + previous snapshots from Supabase for display
  const [keywords, previous] = await Promise.all([
    getLatestRanks(domain),
    getPreviousRanks(domain),
  ])

  return {
    available: keywords.length > 0,
    connected,
    keywords,
    previous,
    siteUrl,
  }
}
