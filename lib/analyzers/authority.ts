/**
 * Authority Analyzer — free data sources only
 *
 * Open PageRank  → domain authority score (openpagerank.com — free key)
 * Common Crawl   → backlink + indexed page estimate (no key)
 * Wikipedia API  → brand entity / Wikipedia presence (no key)
 * Google KG API  → Knowledge Graph entity check (reuses PAGESPEED_API_KEY)
 * DataMuse API   → keyword ideas + LSI semantics (no key)
 */

const TIMEOUT = 8000

async function fetchJson<T>(url: string, opts?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, {
      ...opts,
      signal: AbortSignal.timeout(TIMEOUT),
      headers: { 'Accept': 'application/json', ...(opts?.headers || {}) },
    })
    if (!res.ok) return null
    return await res.json() as T
  } catch {
    return null
  }
}

// ── Open PageRank ──────────────────────────────────────────────────────────────
export interface OpenPageRankResult {
  score: number        // 0–10 scale (like Moz DA / Ahrefs DR)
  rank: number         // global rank estimate
  available: boolean
}

export async function getDomainAuthority(domain: string): Promise<OpenPageRankResult> {
  const key = process.env.OPEN_PAGERANK_KEY
  const clean = domain.replace(/^www\./, '')

  if (key) {
    const data = await fetchJson<{ response: Array<{ page_rank_decimal: number; rank: string }> }>(
      `https://openpagerank.com/api/v1.0/getPageRank?domains[0]=${clean}`,
      { headers: { 'API-OPR': key } }
    )
    const item = data?.response?.[0]
    if (item) {
      return {
        score: Math.round((item.page_rank_decimal || 0) * 10) / 10,
        rank: parseInt(item.rank) || 0,
        available: true,
      }
    }
  }

  // Keyless fallback — estimate DA from Majestic's free endpoint
  // If that fails, compute a composite score from Tranco-style signals
  try {
    const majestic = await fetchJson<{ DataTables: { Results: { Data: Array<{ ExtBackLinks: number; RefDomains: number; TrustFlow: number; CitationFlow: number }> } } }>(
      `https://api.majestic.com/api/json?app_api_key=&cmd=GetIndexItemInfo&items=1&item0=${clean}&datasource=fresh`
    )
    const row = majestic?.DataTables?.Results?.Data?.[0]
    if (row && row.TrustFlow > 0) {
      // Majestic TrustFlow is 0-100, normalise to 0-10
      return { score: Math.round(row.TrustFlow / 10 * 10) / 10, rank: 0, available: true }
    }
  } catch { /* ignore */ }

  return { score: 0, rank: 0, available: false }
}

// ── Common Crawl Index — backlink + page count estimate ───────────────────────
export interface BacklinkEstimate {
  crawledPages: number      // pages Common Crawl has seen on this domain
  estimatedBacklinks: number // rough estimate from CC coverage
  available: boolean
}

// Latest CC indices — try newest first, fall back to older ones
const CC_INDICES = [
  'CC-MAIN-2025-13',
  'CC-MAIN-2025-08',
  'CC-MAIN-2024-51',
  'CC-MAIN-2024-46',
]

export async function getBacklinkEstimate(domain: string): Promise<BacklinkEstimate> {
  const clean = domain.replace(/^www\./, '')
  try {
    // Try each CC index until we get results
    for (const index of CC_INDICES) {
      const domainUrl = `https://index.commoncrawl.org/${index}-index?url=${clean}/*&output=json&limit=1000&matchType=domain`
      let res: Response
      try {
        res = await fetch(domainUrl, {
          signal: AbortSignal.timeout(TIMEOUT),
          headers: { 'Accept': 'application/x-ndjson, text/plain' },
        })
      } catch {
        continue
      }

      if (!res.ok) continue

      const text = await res.text()
      const lines = text.trim().split('\n').filter(Boolean)
      if (lines.length === 0) continue   // no data in this index, try next

      // Parse unique URLs to deduplicate crawl snapshots
      const uniqueUrls = new Set(lines.map(l => {
        try { return JSON.parse(l).url as string } catch { return l }
      }))
      const uniquePageCount = uniqueUrls.size

      if (uniquePageCount === 0) continue

      // Rough estimate: each indexed page could have ~12 referring links
      const estimatedBacklinks = uniquePageCount * 12

      return {
        crawledPages: uniquePageCount,
        estimatedBacklinks,
        available: true,
      }
    }

    return { crawledPages: 0, estimatedBacklinks: 0, available: false }
  } catch {
    return { crawledPages: 0, estimatedBacklinks: 0, available: false }
  }
}

// ── Wikipedia Entity Check ─────────────────────────────────────────────────────
export interface WikipediaEntity {
  exists: boolean
  title: string
  extract: string   // first sentence of Wikipedia article
  url: string
  thumbnail?: string
}

export async function getWikipediaPresence(brandName: string): Promise<WikipediaEntity> {
  const query = encodeURIComponent(brandName)
  const data = await fetchJson<{
    title: string
    extract: string
    content_urls: { desktop: { page: string } }
    thumbnail?: { source: string }
  }>(`https://en.wikipedia.org/api/rest_v1/page/summary/${query}`)

  if (!data || (data as any).type === 'https://mediawiki.org/wiki/HyperSwitch/errors/not_found') {
    // Try a search instead
    const search = await fetchJson<{ query: { search: Array<{ title: string }> } }>(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${query}&srlimit=1&format=json&origin=*`
    )
    const firstResult = search?.query?.search?.[0]
    if (!firstResult) return { exists: false, title: '', extract: '', url: '' }

    const page = await fetchJson<{
      title: string
      extract: string
      content_urls: { desktop: { page: string } }
    }>(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(firstResult.title)}`)

    if (!page) return { exists: false, title: '', extract: '', url: '' }
    return {
      exists: true,
      title: page.title,
      extract: page.extract?.slice(0, 200) || '',
      url: page.content_urls?.desktop?.page || '',
    }
  }

  return {
    exists: true,
    title: data.title,
    extract: data.extract?.slice(0, 200) || '',
    url: data.content_urls?.desktop?.page || '',
    thumbnail: data.thumbnail?.source,
  }
}

// ── Google Knowledge Graph ────────────────────────────────────────────────────
export interface KnowledgeGraphEntity {
  exists: boolean
  name: string
  types: string[]       // e.g. ["Organization", "Corporation", "Thing"]
  description: string
  detailedDescription: string
  url: string
  score: number         // KG confidence score
}

export async function getKnowledgeGraph(brandName: string, domain: string): Promise<KnowledgeGraphEntity> {
  const apiKey = process.env.PAGESPEED_API_KEY
  if (!apiKey) return { exists: false, name: '', types: [], description: '', detailedDescription: '', url: '', score: 0 }

  const query = encodeURIComponent(brandName)
  const data = await fetchJson<{
    itemListElement: Array<{
      result: {
        name: string
        '@type': string | string[]
        description?: string
        detailedDescription?: { articleBody: string }
        url?: string
      }
      resultScore: number
    }>
  }>(`https://kgsearch.googleapis.com/v1/entities:search?query=${query}&key=${apiKey}&limit=1&indent=True`)

  const item = data?.itemListElement?.[0]
  if (!item) return { exists: false, name: '', types: [], description: '', detailedDescription: '', url: '', score: 0 }

  const result = item.result
  const types = Array.isArray(result['@type']) ? result['@type'] : [result['@type']].filter(Boolean)

  return {
    exists: true,
    name: result.name,
    types: types.filter(t => t !== 'Thing'),
    description: result.description || '',
    detailedDescription: result.detailedDescription?.articleBody?.slice(0, 300) || '',
    url: result.url || `https://${domain}`,
    score: Math.round(item.resultScore),
  }
}

// ── DataMuse — Keyword Ideas + LSI Semantics ──────────────────────────────────
export interface KeywordIdea {
  word: string
  score: number
  type: 'related' | 'semantic' | 'trigger' | 'broader'
}

export interface KeywordResearch {
  primaryKeyword: string
  suggestions: KeywordIdea[]
  lsiKeywords: string[]       // Latent Semantic Indexing / semantically related
  questions: string[]         // "People also ask" style questions
  available: boolean
}

export async function getKeywordIdeas(keyword: string): Promise<KeywordResearch> {
  if (!keyword) return { primaryKeyword: keyword, suggestions: [], lsiKeywords: [], questions: [], available: false }

  const kw = encodeURIComponent(keyword)

  // Run 3 DataMuse queries in parallel
  const [related, triggers, broader] = await Promise.all([
    // Words with similar meaning (LSI)
    fetchJson<Array<{ word: string; score: number }>>(
      `https://api.datamuse.com/words?ml=${kw}&max=15`
    ),
    // Words triggered by / associated with keyword
    fetchJson<Array<{ word: string; score: number }>>(
      `https://api.datamuse.com/words?rel_trg=${kw}&max=10`
    ),
    // Words that are "broader" (hypernym-like)
    fetchJson<Array<{ word: string; score: number }>>(
      `https://api.datamuse.com/words?rel_bga=${kw}&max=10`
    ),
  ])

  const suggestions: KeywordIdea[] = [
    ...(related || []).map(w => ({ word: w.word, score: w.score, type: 'semantic' as const })),
    ...(triggers || []).map(w => ({ word: w.word, score: w.score, type: 'trigger' as const })),
    ...(broader || []).map(w => ({ word: w.word, score: w.score, type: 'broader' as const })),
  ]
    .filter(w => w.word.split(' ').length >= 1 && w.word.length > 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)

  // LSI = top semantic words that are multi-word phrases
  const lsiKeywords = (related || [])
    .filter(w => w.word.includes(' ') || w.score > 500)
    .slice(0, 8)
    .map(w => w.word)

  // Generate "People also ask" style questions from keyword
  const questions = [
    `What is ${keyword}?`,
    `How does ${keyword} work?`,
    `Why use ${keyword}?`,
    `Best ${keyword} alternatives`,
    `${keyword} benefits and features`,
  ]

  return {
    primaryKeyword: keyword,
    suggestions,
    lsiKeywords,
    questions,
    available: suggestions.length > 0,
  }
}

// ── Main export: run all authority checks ─────────────────────────────────────
export interface AuthorityResult {
  domainAuthority: OpenPageRankResult
  backlinks: BacklinkEstimate
  wikipedia: WikipediaEntity
  knowledgeGraph: KnowledgeGraphEntity
  keywordResearch: KeywordResearch
}

export async function analyzeAuthority(
  url: string,
  domain: string,
  brandName: string,
  primaryKeyword: string
): Promise<AuthorityResult> {
  const [domainAuthority, backlinks, wikipedia, knowledgeGraph, keywordResearch] = await Promise.allSettled([
    getDomainAuthority(domain),
    getBacklinkEstimate(domain),
    getWikipediaPresence(brandName),
    getKnowledgeGraph(brandName, domain),
    getKeywordIdeas(primaryKeyword),
  ])

  return {
    domainAuthority: domainAuthority.status === 'fulfilled' ? domainAuthority.value : { score: 0, rank: 0, available: false },
    backlinks: backlinks.status === 'fulfilled' ? backlinks.value : { crawledPages: 0, estimatedBacklinks: 0, available: false },
    wikipedia: wikipedia.status === 'fulfilled' ? wikipedia.value : { exists: false, title: '', extract: '', url: '' },
    knowledgeGraph: knowledgeGraph.status === 'fulfilled' ? knowledgeGraph.value : { exists: false, name: '', types: [], description: '', detailedDescription: '', url: '', score: 0 },
    keywordResearch: keywordResearch.status === 'fulfilled' ? keywordResearch.value : { primaryKeyword, suggestions: [], lsiKeywords: [], questions: [], available: false },
  }
}
