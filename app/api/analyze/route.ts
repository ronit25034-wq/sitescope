import { NextRequest, NextResponse } from 'next/server'
import { analyzeSEO } from '@/lib/analyzers/seo'
import { analyzeGEO } from '@/lib/analyzers/geo'
import { analyzeContent } from '@/lib/analyzers/content'
import { analyzeAuthority } from '@/lib/analyzers/authority'
import { getRankTracking } from '@/lib/analyzers/rank-tracking'
import type { AuditResult, CompareResult, BulkResult, AnalyzeRequest } from '@/lib/types'

const TIMEOUT = parseInt(process.env.FETCH_TIMEOUT || '15000')

async function fetchPage(url: string): Promise<{ html: string; robotsTxt: string }> {
  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`
  const urlObj = new URL(normalizedUrl)
  const baseUrl = `${urlObj.protocol}//${urlObj.host}`

  const [pageRes, robotsRes] = await Promise.allSettled([
    fetch(normalizedUrl, {
      signal: AbortSignal.timeout(TIMEOUT),
      headers: { 'User-Agent': 'SiteScope-Bot/1.0 (SEO/GEO Audit Tool)' },
    }),
    fetch(`${baseUrl}/robots.txt`, { signal: AbortSignal.timeout(5000) }),
  ])

  let html = ''
  let robotsTxt = ''

  if (pageRes.status === 'fulfilled' && pageRes.value.ok) {
    html = await pageRes.value.text()
  }
  if (robotsRes.status === 'fulfilled' && robotsRes.value.ok) {
    const text = await robotsRes.value.text()
    if (!text.includes('<!DOCTYPE')) robotsTxt = text
  }

  return { html, robotsTxt }
}

async function runAudit(url: string, depth: 'basic' | 'deep'): Promise<AuditResult> {
  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`
  const urlObj = new URL(normalizedUrl)
  const start = Date.now()

  try {
    const { html, robotsTxt } = await fetchPage(normalizedUrl)
    const [seo, geo, content] = await Promise.all([
      analyzeSEO(normalizedUrl, depth),
      analyzeGEO(normalizedUrl, html, robotsTxt),
      analyzeContent(normalizedUrl, html, depth),
    ])

    // Extract brand name from domain (e.g. "scaler.com" → "Scaler")
    const brandName = urlObj.hostname.replace(/^www\./, '').split('.')[0]
    const brandDisplay = brandName.charAt(0).toUpperCase() + brandName.slice(1)
    const primaryKeyword = content?.primaryKeyword || brandDisplay

    // Authority + rank tracking run in parallel, never block the audit
    const [authority, rankTracking] = await Promise.all([
      analyzeAuthority(normalizedUrl, urlObj.hostname, brandDisplay, primaryKeyword).catch(() => undefined),
      getRankTracking(urlObj.hostname).catch(() => undefined),
    ])

    const overallScore = Math.round(seo.score * 0.4 + geo.score * 0.35 + content.contentQualityScore * 0.25)

    return {
      url: normalizedUrl,
      domain: urlObj.hostname,
      auditedAt: new Date().toISOString(),
      depth,
      loadTime: Date.now() - start,
      overallScore,
      seo,
      geo,
      content,
      authority,
      rankTracking,
    }
  } catch (err) {
    return {
      url: normalizedUrl,
      domain: urlObj.hostname,
      auditedAt: new Date().toISOString(),
      depth,
      loadTime: Date.now() - start,
      overallScore: 0,
      seo: {} as AuditResult['seo'],
      geo: {} as AuditResult['geo'],
      error: err instanceof Error ? err.message : 'Failed to analyze URL',
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: AnalyzeRequest = await req.json()
    const { url, competitorUrl, urls, mode, depth } = body

    if (!url && mode !== 'bulk') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    if (mode === 'compare' && competitorUrl) {
      const [siteA, siteB] = await Promise.all([
        runAudit(url, depth),
        runAudit(competitorUrl, depth),
      ])

      const seoWinner = siteA.seo.score > siteB.seo.score ? 'A' : siteA.seo.score < siteB.seo.score ? 'B' : 'tie'
      const geoWinner = siteA.geo.score > siteB.geo.score ? 'A' : siteA.geo.score < siteB.geo.score ? 'B' : 'tie'
      const overallWinner = siteA.overallScore > siteB.overallScore ? 'A' : siteA.overallScore < siteB.overallScore ? 'B' : 'tie'

      const result: CompareResult = { siteA, siteB, winner: overallWinner, seoWinner, geoWinner }
      return NextResponse.json({ mode: 'compare', result })
    }

    if (mode === 'bulk' && urls && urls.length > 0) {
      const bulkResults: BulkResult[] = await Promise.all(
        urls.slice(0, 10).map(async (u) => {
          const r = await runAudit(u, 'basic')
          return {
            url: r.url,
            domain: r.domain,
            seoScore: r.seo?.score || 0,
            geoScore: r.geo?.score || 0,
            overallScore: r.overallScore,
            grade: r.seo?.grade || 'F',
            topIssue: r.seo?.issues?.[0]?.message || r.geo?.issues?.[0]?.message || 'No issues found',
            error: r.error,
          }
        })
      )
      return NextResponse.json({ mode: 'bulk', results: bulkResults })
    }

    // Single audit
    const result = await runAudit(url, depth)
    return NextResponse.json({ mode: 'audit', result })
  } catch (err) {
    console.error('Analyze error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
