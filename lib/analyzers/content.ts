import * as cheerio from 'cheerio'
import type { Issue } from '../types'
import { firecrawlScrape, firecrawlCrawl } from '../scrapers/firecrawl'
import { scrapegraphAnalyzeContent, scrapegraphExtractKeywords } from '../scrapers/scrapegraph'

// ── Readability (Flesch-Kincaid) ────────────────────────────────────────────
function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '')
  if (word.length <= 3) return 1
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '')
  const m = word.match(/[aeiouy]{1,2}/g)
  return m ? m.length : 1
}

function calcReadability(text: string): { fleschScore: number; grade: string; avgSentenceLen: number; avgSyllables: number } {
  // Strip markdown syntax for cleaner analysis
  const cleanText = text
    .replace(/^#{1,6}\s+/gm, '')   // headings
    .replace(/\*\*?([^*]+)\*\*?/g, '$1') // bold/italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/`[^`]+`/g, '')       // inline code
    .replace(/```[\s\S]*?```/g, '') // code blocks
    .replace(/^\s*[-*+]\s+/gm, '')  // list bullets

  // Split on sentence boundaries: periods/!/? OR newlines (for markdown paragraphs)
  const sentences = cleanText.split(/(?:[.!?]\s+|\n{2,})/).filter(s => s.trim().split(/\s+/).length > 4)
  const words = cleanText.split(/\s+/).filter(w => w.replace(/[^a-z]/gi, '').length > 1)
  if (sentences.length === 0 || words.length === 0) return { fleschScore: 50, grade: 'Standard', avgSentenceLen: 0, avgSyllables: 0 }


  const syllables = words.reduce((s, w) => s + countSyllables(w), 0)
  const asl = words.length / sentences.length
  const asw = syllables / words.length
  const rawScore = Math.round(206.835 - 1.015 * asl - 84.6 * asw)
  // Clamp to 5 minimum so technical content doesn't show a misleading red "0"
  const score = Math.max(5, Math.min(100, rawScore))

  let grade = 'Standard'
  if (score >= 80) grade = 'Very Easy'
  else if (score >= 70) grade = 'Easy'
  else if (score >= 60) grade = 'Standard'
  else if (score >= 50) grade = 'Fairly Difficult'
  else if (score >= 30) grade = 'Difficult'
  else if (score >= 15) grade = 'Very Difficult'
  else grade = 'Very Technical'

  return { fleschScore: score, grade, avgSentenceLen: Math.round(asl), avgSyllables: parseFloat(asw.toFixed(2)) }
}

// ── Keyword extraction ───────────────────────────────────────────────────────
const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with','by','from','as','is',
  'was','are','were','be','been','being','have','has','had','do','does','did','will','would',
  'could','should','may','might','must','shall','can','that','this','these','those','it','its',
  'we','our','you','your','he','she','they','their','what','which','who','when','where','why',
  'how','all','both','each','more','most','other','some','such','no','not','only','same','so',
  'than','too','very','just','also','then','now','here','there','about','into','after','before',
  'up','out','if','over','their','them','been','its','new','get','use','one','two','first','like',
])

function extractKeywordsLocal(text: string) {
  const clean = text
    .toLowerCase()
    // Strip markdown images: ![alt](url)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    // Strip markdown links: [text](url) — keep text, drop url
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    // Strip raw URLs
    .replace(/https?:\/\/[^\s]+/g, ' ')
    // Strip HTML tags
    .replace(/<[^>]*>/g, ' ')
    // Strip file extensions and technical suffixes
    .replace(/\.(webp|png|jpg|jpeg|svg|gif|avif|ico|css|js|html|php|xml)\b/g, ' ')
    // Strip remaining non-alpha chars
    .replace(/[^a-z\s]/g, ' ')

  // Extended stopwords — add technical/HTML noise words
  const techStopWords = new Set([
    ...Array.from(STOP_WORDS),
    'https','http','www','com','org','net','html','webp','jpeg','png','svg','gif',
    'width','height','size','type','null','true','false','undefined','class','style',
    'data','aria','role','href','src','alt','title','content','name','value','item',
    'span','divs','section','header','footer','main','aside','button','input','form',
    'framerusercontent','framer','usercontent','images','image','icon','icons','logo',
    'pixel','pixels','viewport','mobile','desktop','tablet','screen','display',
    'color','background','border','margin','padding','font','text','block','flex',
  ])

  const words = clean.split(/\s+/).filter(w => w.length > 3 && !techStopWords.has(w))
  const totalWords = words.length

  const freq: Record<string, number> = {}
  words.forEach(w => { freq[w] = (freq[w] || 0) + 1 })

  // Bigrams
  for (let i = 0; i < words.length - 1; i++) {
    const bg = `${words[i]} ${words[i + 1]}`
    if (!techStopWords.has(words[i]) && !techStopWords.has(words[i + 1])) {
      freq[bg] = (freq[bg] || 0) + 1
    }
  }

  return Object.entries(freq)
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([keyword, count]) => ({
      keyword,
      count,
      density: parseFloat(((count / Math.max(totalWords, 1)) * 100).toFixed(2)),
    }))
}

// ── Search Intent detection ──────────────────────────────────────────────────
function detectSearchIntent(title: string, h1: string, url: string, bodyText: string) {
  const text = `${title} ${h1} ${url} ${bodyText}`.toLowerCase()

  // Use weighted scoring: title/h1/url carry more weight than body
  const titleH1 = `${title} ${h1} ${url}`.toLowerCase()
  const bodyOnly = bodyText.toLowerCase()

  function countWeighted(words: string[], primary: string, secondary: string) {
    const pHits = words.filter(w => primary.includes(w)).length
    const sHits = words.filter(w => secondary.includes(w)).length
    return pHits * 3 + sHits // title/h1/url hits count 3x
  }

  const scores = {
    transactional: countWeighted(
      ['buy','purchase','order','shop','cart','checkout','pricing','cost','deal','discount','sale','free trial','get started','sign up','subscribe','book','reserve','hire','enroll','enrol','register','payment'],
      titleH1, bodyOnly
    ),
    commercial: countWeighted(
      ['best','top','review','reviews','compare','comparison','vs ','versus','alternative','alternatives','recommend','rating','ranked','pros and cons','worth it','rankings'],
      titleH1, bodyOnly
    ),
    informational: countWeighted(
      ['how to','what is','why ','when ','guide','tutorial','learn','tips','steps','explain','definition','meaning','examples','understand','overview','introduction','beginners'],
      titleH1, bodyOnly
    ),
    navigational: countWeighted(
      ['login','sign in','account','dashboard','portal','official','contact us','homepage','download','careers','about us'],
      titleH1, bodyOnly
    ),
  }

  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1])
  const [intent, topScore] = entries[0]
  const secondScore = entries[1][1]

  // Confidence: how dominant is the winner over runner-up?
  const gap = topScore - secondScore
  const dominance = topScore > 0 ? gap / topScore : 0
  // Scale: 50% base + up to 35% from dominance + small boost from raw hits, max 88%
  const confidence = topScore > 0
    ? Math.min(88, Math.round(50 + dominance * 35 + Math.min(topScore, 5) * 0.6))
    : 30

  return { intent: intent as 'informational' | 'transactional' | 'navigational' | 'commercial', confidence }
}

// ── Content freshness ─────────────────────────────────────────────────────────
async function checkFreshness(url: string, html: string, robotsTxt?: string): Promise<{ lastModified: string | null; ageInDays: number; freshnessScore: number; source: string }> {
  let lastModified: string | null = null
  let source = 'unknown'

  // 1. Try HTTP HEAD request for Last-Modified
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
    const lm = res.headers.get('last-modified')
    if (lm) { lastModified = lm; source = 'HTTP header' }
  } catch {}

  // 2. Check JSON-LD dateModified / datePublished
  if (!lastModified) {
    const $ = cheerio.load(html)
    $('script[type="application/ld+json"]').each((_, el) => {
      if (lastModified) return
      try {
        const json = JSON.parse($(el).html() || '{}')
        const items = Array.isArray(json) ? json : [json]
        for (const item of items) {
          if (item.dateModified) { lastModified = item.dateModified; source = 'JSON-LD'; break }
          if (item.datePublished) { lastModified = item.datePublished; source = 'JSON-LD'; break }
        }
      } catch {}
    })
  }

  // 3. Check <meta> tags
  if (!lastModified) {
    const $ = cheerio.load(html)
    const metas = [
      $('meta[property="article:modified_time"]').attr('content'),
      $('meta[property="article:published_time"]').attr('content'),
      $('meta[name="last-modified"]').attr('content'),
      $('meta[itemprop="dateModified"]').attr('content'),
    ]
    const found = metas.find(m => !!m)
    if (found) { lastModified = found; source = 'meta tag' }
  }

  let ageInDays = -1
  let freshnessScore = 50 // neutral if unknown

  if (lastModified) {
    try {
      const modDate = new Date(lastModified)
      const now = new Date()
      ageInDays = Math.floor((now.getTime() - modDate.getTime()) / (1000 * 60 * 60 * 24))

      if (ageInDays < 30) freshnessScore = 100
      else if (ageInDays < 90) freshnessScore = 85
      else if (ageInDays < 180) freshnessScore = 70
      else if (ageInDays < 365) freshnessScore = 55
      else if (ageInDays < 730) freshnessScore = 35
      else freshnessScore = 15
    } catch {}
  }

  return { lastModified, ageInDays, freshnessScore, source }
}

// ── Backlinks via OpenLinkProfiler (free, no key) ───────────────────────────
async function getBacklinks(domain: string): Promise<{ total: number; referringDomains: number; available: boolean }> {
  try {
    const res = await fetch(
      `https://api.openlinkprofiler.org/lps?url=${encodeURIComponent(domain)}&limit=25&offset=0&filter=all`,
      { signal: AbortSignal.timeout(10000) }
    )
    if (!res.ok) return { total: 0, referringDomains: 0, available: false }
    const data = await res.json()

    const total = data.linksTotal || data.total || 0
    const domains = new Set<string>()
    if (Array.isArray(data.links)) {
      data.links.forEach((l: { src_domain?: string; source_domain?: string }) => {
        const d = l.src_domain || l.source_domain
        if (d) domains.add(d)
      })
    }

    return { total, referringDomains: domains.size || Math.floor(total * 0.6), available: true }
  } catch {
    return { total: 0, referringDomains: 0, available: false }
  }
}

// ── Topical authority from crawled pages ─────────────────────────────────────
function calcTopicalAuthority(pages: Array<{ markdown?: string; metadata?: { title?: string } }>): {
  score: number; topicsFound: string[]; pageCount: number; avgWordsPerPage: number
} {
  if (!pages || pages.length === 0) return { score: 0, topicsFound: [], pageCount: 0, avgWordsPerPage: 0 }

  const allTopics = new Set<string>()
  let totalWords = 0

  pages.forEach(page => {
    const text = page.markdown || ''
    totalWords += text.split(/\s+/).length
    // Extract headings as topics
    const headings = text.match(/^#{1,3}\s+(.+)$/gm) || []
    headings.forEach(h => allTopics.add(h.replace(/^#+\s+/, '').toLowerCase().trim()))
  })

  const topicsFound = Array.from(allTopics).slice(0, 10)
  const avgWordsPerPage = Math.round(totalWords / pages.length)
  const score = Math.min(100, Math.round(
    (pages.length / 5) * 30 +
    (topicsFound.length / 10) * 40 +
    (avgWordsPerPage > 800 ? 30 : avgWordsPerPage > 400 ? 20 : 10)
  ))

  return { score, topicsFound, pageCount: pages.length, avgWordsPerPage }
}

// ── Main content analyzer ────────────────────────────────────────────────────
export interface ContentResult {
  // Quality
  contentQualityScore: number
  contentQualityFeedback: string
  contentType: string
  targetAudience: string
  readingLevel: string
  missingElements: string[]

  // Readability
  readabilityScore: number
  readabilityGrade: string
  avgSentenceLength: number
  avgSyllablesPerWord: number

  // Keywords (AI-powered if ScrapGraph available)
  primaryKeyword: string
  secondaryKeywords: string[]
  keywordDensity: Record<string, number>
  lsiKeywords: string[]
  missingKeywords: string[]
  topKeywordsLocal: Array<{ keyword: string; count: number; density: number }>
  keywordInTitle: boolean
  keywordInH1: boolean
  keywordInUrl: boolean
  keywordInMetaDesc: boolean

  // Search Intent
  searchIntent: 'informational' | 'transactional' | 'navigational' | 'commercial'
  intentConfidence: number

  // Freshness
  lastModified: string | null
  ageInDays: number
  freshnessScore: number
  freshnessSource: string

  // Topical Authority
  topicalAuthorityScore: number
  topicsFound: string[]
  pagesAnalyzed: number
  avgWordsPerPage: number

  // Backlinks
  backlinksTotal: number
  referringDomains: number
  backlinksAvailable: boolean

  // Powered-by flags (for UI)
  poweredByFirecrawl: boolean
  poweredByScrapegraph: boolean

  issues: Issue[]
  passes: string[]
}

export async function analyzeContent(url: string, html: string, depth: 'basic' | 'deep'): Promise<ContentResult> {
  const issues: Issue[] = []
  const passes: string[] = []

  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`
  const urlObj = new URL(normalizedUrl)
  const $ = cheerio.load(html)

  const titleText = $('title').first().text().trim()
  const h1Text = $('h1').first().text().trim()
  const metaDesc = $('meta[name="description"]').attr('content') || ''

  // Remove script/style/noscript tags before extracting text to avoid JS code skewing readability
  $('script, style, noscript, svg, [aria-hidden="true"]').remove()
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim()

  // Run all analyses in parallel
  const [firecrawlData, sgContent, sgKeywords, freshness, backlinks, crawlPages] = await Promise.allSettled([
    firecrawlScrape(normalizedUrl),
    depth === 'deep' ? scrapegraphAnalyzeContent(normalizedUrl) : Promise.resolve(null),
    depth === 'deep' ? scrapegraphExtractKeywords(normalizedUrl) : Promise.resolve(null),
    checkFreshness(normalizedUrl, html),
    getBacklinks(urlObj.hostname),
    depth === 'deep' ? firecrawlCrawl(normalizedUrl, 5) : Promise.resolve([]),
  ])

  const fcData = firecrawlData.status === 'fulfilled' ? firecrawlData.value : null
  const sgContentData = sgContent.status === 'fulfilled' ? sgContent.value : null
  const sgKeywordsData = sgKeywords.status === 'fulfilled' ? sgKeywords.value : null
  const freshnessData = freshness.status === 'fulfilled' ? freshness.value : { lastModified: null, ageInDays: -1, freshnessScore: 50, source: 'unknown' }
  const backlinksData = backlinks.status === 'fulfilled' ? backlinks.value : { total: 0, referringDomains: 0, available: false }
  const crawledPages = crawlPages.status === 'fulfilled' ? (crawlPages.value || []) : []

  // Use firecrawl markdown for better text analysis if available
  const analysisText = fcData?.markdown || bodyText

  // Readability
  const readability = calcReadability(analysisText)

  // Keywords (local extraction)
  const topKeywordsLocal = extractKeywordsLocal(analysisText)
  const topKw = topKeywordsLocal[0]?.keyword || ''

  // Search Intent — prefer ScrapGraph AI result, fallback to local
  const localIntent = detectSearchIntent(titleText, h1Text, normalizedUrl, analysisText)
  const searchIntent = (sgContentData?.searchIntent as ContentResult['searchIntent']) || localIntent.intent
  const intentConfidence = sgContentData?.intentConfidence || localIntent.confidence

  // Keyword in key places
  const primaryKeyword = sgKeywordsData?.primaryKeyword || topKw
  const kwLower = primaryKeyword.toLowerCase()
  const keywordInTitle = titleText.toLowerCase().includes(kwLower)
  const keywordInH1 = h1Text.toLowerCase().includes(kwLower)
  const keywordInUrl = normalizedUrl.toLowerCase().includes(kwLower.replace(/\s+/g, '-').replace(/\s+/g, ''))
  const keywordInMetaDesc = metaDesc.toLowerCase().includes(kwLower)

  // Topical authority
  const topical = calcTopicalAuthority(crawledPages)

  // ── Local content type & audience detection ────────────────────────────
  const textLower = analysisText.toLowerCase()
  let localContentType = 'webpage'
  if (textLower.includes('buy') || textLower.includes('add to cart') || textLower.includes('price')) localContentType = 'product page'
  else if (textLower.includes('tutorial') || textLower.includes('how to') || textLower.includes('step')) localContentType = 'article'
  else if (urlObj.pathname.includes('/blog') || urlObj.pathname.includes('/post')) localContentType = 'blog post'
  else if (urlObj.pathname === '/' || urlObj.pathname === '') localContentType = 'homepage'
  else if (textLower.includes('documentation') || textLower.includes('api reference')) localContentType = 'documentation'

  let localAudience = 'General audience'
  if (textLower.includes('developer') || textLower.includes('api') || textLower.includes('code')) localAudience = 'Developers & technical users'
  else if (textLower.includes('marketer') || textLower.includes('marketing') || textLower.includes('campaign')) localAudience = 'Marketers'
  else if (textLower.includes('business') || textLower.includes('enterprise') || textLower.includes('b2b')) localAudience = 'Business professionals'
  else if (textLower.includes('beginner') || textLower.includes('getting started') || textLower.includes('introduction')) localAudience = 'Beginners / newcomers'

  // ── Content quality score ────────────────────────────────────────────────
  let contentQualityScore = sgContentData?.qualityScore || 0
  if (!contentQualityScore) {
    const wordCount = analysisText.split(/\s+/).length
    const hasImages = $('img').length > 2
    const hasHeadings = $('h2,h3').length > 2
    const hasLists = $('ul,ol').length > 0
    const hasLinks = $('a[href]').length > 3
    const hasSchema = $('script[type="application/ld+json"]').length > 0
    contentQualityScore = Math.min(100, Math.round(
      (wordCount > 2000 ? 25 : wordCount > 1000 ? 18 : wordCount > 500 ? 12 : 5) +
      (readability.fleschScore > 60 ? 15 : readability.fleschScore > 40 ? 10 : 5) +
      (keywordInTitle ? 12 : 0) +
      (keywordInH1 ? 12 : 0) +
      (hasHeadings ? 10 : 0) +
      (hasLists ? 8 : 0) +
      (hasImages ? 8 : 0) +
      (hasLinks ? 5 : 0) +
      (hasSchema ? 5 : 0)
    ))
  }

  // Issues
  if (readability.fleschScore < 40) issues.push({ type: 'warning', message: `Content is difficult to read (Flesch score: ${readability.fleschScore})`, impact: 'medium', fix: 'Shorten sentences and use simpler words for better readability' })
  else passes.push(`Readability score: ${readability.fleschScore} (${readability.grade})`)

  if (!keywordInTitle) issues.push({ type: 'warning', message: 'Primary keyword not found in title tag', impact: 'high', fix: `Include "${primaryKeyword}" in your title tag` })
  else passes.push('Primary keyword in title tag')

  if (!keywordInH1) issues.push({ type: 'warning', message: 'Primary keyword not found in H1 heading', impact: 'high', fix: `Include "${primaryKeyword}" in your H1 heading` })
  else passes.push('Primary keyword in H1 heading')

  if (!keywordInMetaDesc) issues.push({ type: 'info', message: 'Primary keyword not in meta description', impact: 'medium', fix: 'Include the primary keyword naturally in your meta description' })

  if (freshnessData.ageInDays > 365) issues.push({ type: 'warning', message: `Content is ${Math.round(freshnessData.ageInDays / 30)} months old — consider refreshing`, impact: 'medium', fix: 'Update content with fresh information, statistics, and examples' })
  else if (freshnessData.ageInDays > 0) passes.push(`Content is recently updated (${freshnessData.ageInDays} days ago)`)
  else issues.push({ type: 'info', message: 'Content freshness date not detectable', impact: 'low', fix: 'Add dateModified to your JSON-LD schema markup' })

  if (sgKeywordsData?.missingKeywords?.length) {
    issues.push({ type: 'info', message: `Missing keyword opportunities: ${sgKeywordsData.missingKeywords.slice(0, 2).join(', ')}`, impact: 'medium', fix: 'Consider adding these keywords naturally to your content' })
  }

  if (sgContentData?.missingElements?.length) {
    sgContentData.missingElements.slice(0, 2).forEach(el => {
      issues.push({ type: 'info', message: `Content gap: ${el}`, impact: 'low' })
    })
  }

  if (contentQualityScore >= 70) passes.push(`High content quality score: ${contentQualityScore}/100`)
  else if (contentQualityScore < 50) issues.push({ type: 'warning', message: `Content quality score is low: ${contentQualityScore}/100`, impact: 'high', fix: 'Improve content depth, add examples, statistics, and expert insights' })

  // Build local quality feedback from signals
  const totalWordCount = analysisText.split(/\s+/).filter(w => w.length > 0).length
  const localFeedback = [
    totalWordCount > 1500 ? `Good content length (${totalWordCount} words).` : totalWordCount > 600 ? `Moderate content length (${totalWordCount} words) — aim for 1500+.` : `Thin content detected (${totalWordCount} words) — expand significantly.`,
    readability.fleschScore > 60 ? `Readability is good (score: ${readability.fleschScore}).` : `Readability needs improvement (score: ${readability.fleschScore}).`,
    keywordInTitle && keywordInH1 ? `Primary keyword "${primaryKeyword}" is well-placed in title and H1.` : `Improve keyword placement for "${primaryKeyword}".`,
    `Detected as ${localContentType} targeting ${localAudience.toLowerCase()}.`,
  ].join(' ')

  return {
    contentQualityScore,
    contentQualityFeedback: sgContentData?.uniqueInsights || localFeedback,
    contentType: sgContentData?.contentType || localContentType,
    targetAudience: sgContentData?.targetAudience || localAudience,
    readingLevel: sgContentData?.readingLevel || readability.grade,
    missingElements: sgContentData?.missingElements || [],

    readabilityScore: readability.fleschScore,
    readabilityGrade: readability.grade,
    avgSentenceLength: readability.avgSentenceLen,
    avgSyllablesPerWord: readability.avgSyllables,

    primaryKeyword,
    secondaryKeywords: sgKeywordsData?.secondaryKeywords || topKeywordsLocal.slice(1, 5).map(k => k.keyword),
    keywordDensity: sgKeywordsData?.keywordDensity || Object.fromEntries(topKeywordsLocal.slice(0, 5).map(k => [k.keyword, k.density])),
    lsiKeywords: sgKeywordsData?.lsiKeywords || [],
    missingKeywords: sgKeywordsData?.missingKeywords || [],
    topKeywordsLocal,
    keywordInTitle,
    keywordInH1,
    keywordInUrl,
    keywordInMetaDesc,

    searchIntent,
    intentConfidence,

    lastModified: freshnessData.lastModified,
    ageInDays: freshnessData.ageInDays,
    freshnessScore: freshnessData.freshnessScore,
    freshnessSource: freshnessData.source,

    topicalAuthorityScore: topical.score,
    topicsFound: topical.topicsFound,
    pagesAnalyzed: topical.pageCount,
    avgWordsPerPage: topical.avgWordsPerPage,

    backlinksTotal: backlinksData.total,
    referringDomains: backlinksData.referringDomains,
    backlinksAvailable: backlinksData.available,

    poweredByFirecrawl: !!fcData,
    poweredByScrapegraph: !!(sgContentData || sgKeywordsData),

    issues,
    passes,
  }
}
