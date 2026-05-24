import * as cheerio from 'cheerio'
import type { SEOResult, Issue } from '../types'

const TIMEOUT = parseInt(process.env.FETCH_TIMEOUT || '15000')
const PAGESPEED_KEY = process.env.PAGESPEED_API_KEY || ''

async function safeFetch(url: string): Promise<Response | null> {
  try {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), TIMEOUT)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'SiteScope-Bot/1.0 (SEO Audit Tool)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })
    clearTimeout(id)
    return res
  } catch {
    return null
  }
}

async function getPageSpeed(url: string) {
  if (!PAGESPEED_KEY) return null
  try {
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&key=${PAGESPEED_KEY}&category=performance&category=accessibility&category=best-practices&category=seo`
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(20000) })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

function scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A'
  if (score >= 75) return 'B'
  if (score >= 60) return 'C'
  if (score >= 45) return 'D'
  return 'F'
}

export async function analyzeSEO(url: string, depth: 'basic' | 'deep'): Promise<SEOResult> {
  const issues: Issue[] = []
  const passes: string[] = []

  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`
  const urlObj = new URL(normalizedUrl)
  const baseUrl = `${urlObj.protocol}//${urlObj.host}`

  // Kick off PageSpeed in parallel immediately — it's the slowest call
  const pageSpeedPromise = getPageSpeed(normalizedUrl)

  const start = Date.now()
  const pageRes = await safeFetch(normalizedUrl)
  const loadTime = Date.now() - start

  let html = ''
  if (pageRes?.ok) {
    html = await pageRes.text()
  }

  const $ = cheerio.load(html)

  // --- SSL ---
  const ssl = normalizedUrl.startsWith('https://')
  if (!ssl) issues.push({ type: 'error', message: 'Site does not use HTTPS', impact: 'high', fix: 'Install an SSL certificate and redirect HTTP to HTTPS' })
  else passes.push('HTTPS (SSL) enabled')

  // --- Title ---
  const titleText = $('title').first().text().trim()
  const titleLen = titleText.length
  const titleOptimal = titleLen >= 10 && titleLen <= 60
  if (!titleText) issues.push({ type: 'error', message: 'Missing <title> tag', impact: 'high', fix: 'Add a descriptive title tag between 10-60 characters' })
  else if (!titleOptimal) issues.push({ type: 'warning', message: `Title length ${titleLen} chars (optimal: 10-60)`, impact: 'medium', fix: 'Adjust title length to 10-60 characters' })
  else passes.push('Title tag is optimal length')

  // --- Meta Description ---
  const descEl = $('meta[name="description"]')
  const descText = descEl.attr('content')?.trim() || ''
  const descLen = descText.length
  const descOptimal = descLen >= 50 && descLen <= 160
  if (!descText) issues.push({ type: 'error', message: 'Missing meta description', impact: 'high', fix: 'Add a meta description between 50-160 characters' })
  else if (!descOptimal) issues.push({ type: 'warning', message: `Meta description length ${descLen} chars (optimal: 50-160)`, impact: 'medium' })
  else passes.push('Meta description is optimal length')

  // --- H1 ---
  const h1Els = $('h1')
  const h1Count = h1Els.length
  const h1Value = h1Els.first().text().trim()
  if (h1Count === 0) issues.push({ type: 'error', message: 'Missing H1 heading', impact: 'high', fix: 'Add exactly one H1 tag that describes the page content' })
  else if (h1Count > 1) issues.push({ type: 'warning', message: `Multiple H1 tags found (${h1Count})`, impact: 'medium', fix: 'Use exactly one H1 per page' })
  else passes.push('Single H1 tag present')

  const headings = {
    h2: $('h2').length,
    h3: $('h3').length,
    h4: $('h4').length,
    h5: $('h5').length,
    h6: $('h6').length,
  }

  // --- Canonical ---
  const canonicalEl = $('link[rel="canonical"]')
  const canonicalValue = canonicalEl.attr('href') || ''
  if (!canonicalValue) issues.push({ type: 'warning', message: 'Missing canonical tag', impact: 'medium', fix: 'Add <link rel="canonical"> to prevent duplicate content issues' })
  else passes.push('Canonical tag present')

  // --- Meta Robots ---
  const robotsEl = $('meta[name="robots"]')
  const robotsContent = robotsEl.attr('content') || ''
  const noindex = robotsContent.toLowerCase().includes('noindex')
  const nofollow = robotsContent.toLowerCase().includes('nofollow')
  if (noindex) issues.push({ type: 'error', message: 'Page has noindex directive — will not be indexed by search engines', impact: 'high', fix: 'Remove noindex if you want this page indexed' })

  // --- OG Tags ---
  const ogTitle = !!$('meta[property="og:title"]').attr('content')
  const ogDesc = !!$('meta[property="og:description"]').attr('content')
  const ogImage = !!$('meta[property="og:image"]').attr('content')
  const ogUrl = !!$('meta[property="og:url"]').attr('content')
  const ogType = !!$('meta[property="og:type"]').attr('content')
  const ogCount = [ogTitle, ogDesc, ogImage, ogUrl, ogType].filter(Boolean).length
  if (ogCount < 3) issues.push({ type: 'warning', message: `Only ${ogCount}/5 Open Graph tags present`, impact: 'medium', fix: 'Add og:title, og:description, og:image, og:url, og:type' })
  else passes.push('Open Graph tags configured')

  // --- Twitter Card ---
  const twitterCardContent = $('meta[name="twitter:card"]').attr('content') || ''
  if (!twitterCardContent) issues.push({ type: 'info', message: 'Missing Twitter Card meta tags', impact: 'low', fix: 'Add twitter:card meta tags for better social sharing' })
  else passes.push('Twitter Card tags present')

  // --- Schema Markup ---
  const schemaScripts = $('script[type="application/ld+json"]')
  const schemaTypes: string[] = []
  schemaScripts.each((_, el) => {
    try {
      const parsed = JSON.parse($(el).html() || '{}')
      const types = Array.isArray(parsed) ? parsed.map((p: { '@type'?: string }) => p['@type']) : [parsed['@type']]
      types.forEach((t: string | undefined) => t && schemaTypes.push(t))
    } catch {}
  })
  const structuredData = schemaTypes.length > 0
  if (!structuredData) issues.push({ type: 'warning', message: 'No structured data (JSON-LD) found', impact: 'medium', fix: 'Add JSON-LD schema markup (Organization, WebSite, Article, etc.)' })
  else passes.push(`Structured data present: ${schemaTypes.join(', ')}`)

  // --- Images ---
  const allImages = $('img')
  let imagesWithAlt = 0
  let imagesWithoutAlt = 0
  allImages.each((_, el) => {
    const alt = $(el).attr('alt')
    if (alt !== undefined && alt.trim() !== '') imagesWithAlt++
    else imagesWithoutAlt++
  })
  if (imagesWithoutAlt > 0) issues.push({ type: 'warning', message: `${imagesWithoutAlt} image(s) missing alt text`, impact: 'medium', fix: 'Add descriptive alt text to all images' })
  else if (allImages.length > 0) passes.push('All images have alt text')

  // --- Links ---
  const allLinks = $('a[href]')
  let internalLinks = 0
  let externalLinks = 0
  allLinks.each((_, el) => {
    const href = $(el).attr('href') || ''
    if (href.startsWith('http') && !href.includes(urlObj.host)) externalLinks++
    else if (!href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('#')) internalLinks++
  })

  // --- Word count ---
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim()
  const wordCount = bodyText.split(' ').filter(w => w.length > 0).length
  if (wordCount < 300) issues.push({ type: 'warning', message: `Low word count: ${wordCount} words`, impact: 'medium', fix: 'Add more meaningful content (aim for 500+ words)' })
  else passes.push(`Content length: ${wordCount} words`)

  // --- Robots.txt ---
  const robotsRes = await safeFetch(`${baseUrl}/robots.txt`)
  const robotsTxtContent = robotsRes?.ok ? await robotsRes.text() : ''
  const robotsExists = !!robotsTxtContent && !robotsTxtContent.includes('<!DOCTYPE')
  const hasDisallowRules = robotsTxtContent.toLowerCase().includes('disallow:')
  const allowsAll = robotsTxtContent.toLowerCase().includes('disallow: ') && !hasDisallowRules
  if (!robotsExists) issues.push({ type: 'warning', message: 'robots.txt not found', impact: 'medium', fix: 'Create a robots.txt file at the root of your domain' })
  else passes.push('robots.txt present')

  // --- Sitemap ---
  let sitemapUrl = ''
  if (robotsExists) {
    const sitemapMatch = robotsTxtContent.match(/sitemap:\s*(\S+)/i)
    if (sitemapMatch) sitemapUrl = sitemapMatch[1]
  }
  if (!sitemapUrl) sitemapUrl = `${baseUrl}/sitemap.xml`
  const sitemapRes = await safeFetch(sitemapUrl)
  const sitemapContent = sitemapRes?.ok ? await sitemapRes.text() : ''
  const sitemapExists = !!sitemapContent && (sitemapContent.includes('<urlset') || sitemapContent.includes('<sitemapindex'))
  if (!sitemapExists) issues.push({ type: 'warning', message: 'XML sitemap not found', impact: 'medium', fix: 'Create an XML sitemap and submit it to Google Search Console' })
  else passes.push('XML sitemap found')

  // --- HTTP/2 & Compression ---
  const httpVersion = pageRes?.headers?.get('alt-svc')?.includes('h3') ? 'HTTP/3'
    : (pageRes as Response & { httpVersion?: string })?.httpVersion === '2.0' ? 'HTTP/2'
    : pageRes?.headers?.get('content-encoding') ? 'HTTP/1.1+gzip' : 'HTTP/1.1'
  const isCompressed = !!(pageRes?.headers?.get('content-encoding'))
  if (!isCompressed) issues.push({ type: 'warning', message: 'Page responses are not compressed (no gzip/brotli)', impact: 'medium', fix: 'Enable gzip or Brotli compression on your server for faster load times' })
  else passes.push(`Compression enabled (${pageRes?.headers?.get('content-encoding')})`)

  // --- Domain age via RDAP (free, no key needed) ---
  let domainAgeDays = -1
  let domainAgeLabel = 'Unknown'
  try {
    const rdap = await fetch(`https://rdap.org/domain/${urlObj.hostname.replace(/^www\./, '')}`, {
      signal: AbortSignal.timeout(6000),
      headers: { 'Accept': 'application/json' }
    })
    if (rdap.ok) {
      const rdapData = await rdap.json()
      const events: Array<{ eventAction: string; eventDate: string }> = rdapData.events || []
      const registration = events.find(e => e.eventAction === 'registration')
      if (registration?.eventDate) {
        const regDate = new Date(registration.eventDate)
        domainAgeDays = Math.floor((Date.now() - regDate.getTime()) / (1000 * 60 * 60 * 24))
        const years = Math.floor(domainAgeDays / 365)
        const months = Math.floor((domainAgeDays % 365) / 30)
        domainAgeLabel = years > 0 ? `${years}y ${months}m` : `${months} months`
        if (domainAgeDays < 180) issues.push({ type: 'warning', message: `Domain is very new (${domainAgeLabel}) — new domains rank slower`, impact: 'medium', fix: 'Build quality backlinks and publish consistent content to establish authority faster' })
        else passes.push(`Domain age: ${domainAgeLabel}`)
      }
    }
  } catch {}

  // --- PageSpeed (already running in parallel since function start) ---
  let performance = 0, accessibility = 0, bestPractices = 0, lighthouseSeo = 0
  const coreWebVitals = { lcp: 0, fcp: 0, cls: 0, tbt: 0, si: 0, ttfb: 0 }

  const psData = await pageSpeedPromise
  if (psData?.lighthouseResult) {
    const cats = psData.lighthouseResult.categories
    performance = Math.round((cats.performance?.score || 0) * 100)
    accessibility = Math.round((cats.accessibility?.score || 0) * 100)
    bestPractices = Math.round((cats['best-practices']?.score || 0) * 100)
    lighthouseSeo = Math.round((cats.seo?.score || 0) * 100)

    const audits = psData.lighthouseResult.audits
    coreWebVitals.lcp = audits['largest-contentful-paint']?.numericValue || 0
    coreWebVitals.fcp = audits['first-contentful-paint']?.numericValue || 0
    coreWebVitals.cls = audits['cumulative-layout-shift']?.numericValue || 0
    coreWebVitals.tbt = audits['total-blocking-time']?.numericValue || 0
    coreWebVitals.si = audits['speed-index']?.numericValue || 0
    coreWebVitals.ttfb = audits['server-response-time']?.numericValue || 0

    if (performance < 50) issues.push({ type: 'error', message: `Poor PageSpeed score: ${performance}/100`, impact: 'high', fix: 'Optimize images, reduce JavaScript, and enable caching' })
    else if (performance < 75) issues.push({ type: 'warning', message: `PageSpeed could be improved: ${performance}/100`, impact: 'medium' })
    else passes.push(`PageSpeed performance: ${performance}/100`)
  }

  // --- Score calculation ---
  let score = 100
  issues.forEach(issue => {
    if (issue.impact === 'high') score -= issue.type === 'error' ? 12 : 8
    else if (issue.impact === 'medium') score -= issue.type === 'warning' ? 5 : 3
    else score -= 2
  })
  if (performance > 0) score = Math.round(score * 0.7 + performance * 0.3)
  score = Math.max(0, Math.min(100, score))

  return {
    score,
    grade: scoreToGrade(score),
    title: { exists: !!titleText, value: titleText, length: titleLen, optimal: titleOptimal },
    description: { exists: !!descText, value: descText, length: descLen, optimal: descOptimal },
    h1: { exists: h1Count > 0, count: h1Count, value: h1Value },
    headings,
    ssl,
    canonical: { exists: !!canonicalValue, value: canonicalValue },
    metaRobots: { exists: !!robotsContent, noindex, nofollow },
    robotsTxt: { exists: robotsExists, allowsAll, hasDisallowRules },
    sitemap: { exists: sitemapExists, url: sitemapUrl },
    ogTags: { title: ogTitle, description: ogDesc, image: ogImage, url: ogUrl, type: ogType },
    twitterCard: { exists: !!twitterCardContent, type: twitterCardContent },
    schemaTypes,
    structuredData,
    wordCount,
    images: { total: allImages.length, withAlt: imagesWithAlt, withoutAlt: imagesWithoutAlt },
    links: { internal: internalLinks, external: externalLinks },
    domainAge: { days: domainAgeDays, label: domainAgeLabel },
    httpCompressed: isCompressed,
    performance,
    accessibility,
    bestPractices,
    lighthouseSeo,
    coreWebVitals,
    issues,
    passes,
  }
}
