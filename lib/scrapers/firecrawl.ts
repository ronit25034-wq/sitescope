const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY || ''
const BASE = 'https://api.firecrawl.dev/v1'

interface FirecrawlScrapeResult {
  markdown?: string
  html?: string
  links?: string[]
  metadata?: {
    title?: string
    description?: string
    language?: string
    keywords?: string
    robots?: string
    ogTitle?: string
    ogDescription?: string
    ogImage?: string
    publishedTime?: string
    modifiedTime?: string
    author?: string
    statusCode?: number
  }
}

export async function firecrawlScrape(url: string): Promise<FirecrawlScrapeResult | null> {
  if (!FIRECRAWL_API_KEY) return null
  try {
    const res = await fetch(`${BASE}/scrape`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown', 'links'],
        onlyMainContent: false,
      }),
      signal: AbortSignal.timeout(25000),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('Firecrawl scrape error:', res.status, err)
      return null
    }
    const data = await res.json()
    return data.data || null
  } catch (e) {
    console.error('Firecrawl scrape exception:', e)
    return null
  }
}

export interface FirecrawlCrawlPage {
  url?: string
  markdown?: string
  metadata?: { title?: string }
}

export async function firecrawlCrawl(url: string, limit = 5): Promise<FirecrawlCrawlPage[]> {
  if (!FIRECRAWL_API_KEY) return []
  try {
    // Start crawl job
    const startRes = await fetch(`${BASE}/crawl`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        limit,
        scrapeOptions: { formats: ['markdown'], onlyMainContent: true },
        maxDepth: 2,
      }),
      signal: AbortSignal.timeout(15000),
    })
    if (!startRes.ok) return []
    const { id: jobId } = await startRes.json()
    if (!jobId) return []

    // Poll up to 60s
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 3000))
      const statusRes = await fetch(`${BASE}/crawl/${jobId}`, {
        headers: { 'Authorization': `Bearer ${FIRECRAWL_API_KEY}` },
        signal: AbortSignal.timeout(10000),
      })
      if (!statusRes.ok) break
      const status = await statusRes.json()
      if (status.status === 'completed') return status.data || []
      if (status.status === 'failed') break
    }
    return []
  } catch (e) {
    console.error('Firecrawl crawl exception:', e)
    return []
  }
}
