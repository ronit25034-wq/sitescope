import * as cheerio from 'cheerio'
import type { GEOResult, Issue, CrawlerStatus } from '../types'

const TIMEOUT = parseInt(process.env.FETCH_TIMEOUT || '15000')

async function safeFetch(url: string): Promise<Response | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT),
      headers: { 'User-Agent': 'SiteScope-GEO-Bot/1.0' },
    })
    return res
  } catch {
    return null
  }
}

function parseCrawlerStatus(robotsTxt: string, botName: string): CrawlerStatus {
  if (!robotsTxt) return 'unknown'
  const lines = robotsTxt.toLowerCase().split('\n')
  let currentAgent = ''
  let globalDisallows: string[] = []
  let botDisallows: string[] = []
  let botAllows: string[] = []
  let isGlobal = false
  let isBot = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('user-agent:')) {
      const agent = trimmed.replace('user-agent:', '').trim()
      isGlobal = agent === '*'
      isBot = agent.includes(botName.toLowerCase())
      currentAgent = agent
    } else if (trimmed.startsWith('disallow:')) {
      const path = trimmed.replace('disallow:', '').trim()
      if (isGlobal) globalDisallows.push(path)
      if (isBot) botDisallows.push(path)
    } else if (trimmed.startsWith('allow:')) {
      const path = trimmed.replace('allow:', '').trim()
      if (isBot) botAllows.push(path)
    }
  }

  // Bot-specific rules take precedence
  if (isBot || currentAgent.includes(botName.toLowerCase())) {
    if (botDisallows.includes('/')) return 'blocked'
    if (botAllows.length > 0 || botDisallows.length === 0) return 'allowed'
  }

  // Fall back to global rules
  if (globalDisallows.includes('/')) return 'blocked'
  return 'allowed'
}

function scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A'
  if (score >= 75) return 'B'
  if (score >= 60) return 'C'
  if (score >= 45) return 'D'
  return 'F'
}

export async function analyzeGEO(url: string, html: string, robotsTxt: string): Promise<GEOResult> {
  const issues: Issue[] = []
  const passes: string[] = []

  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`
  const urlObj = new URL(normalizedUrl)
  const baseUrl = `${urlObj.protocol}//${urlObj.host}`
  const $ = cheerio.load(html)

  // --- AI Crawler Access ---
  const crawlers: Record<string, string> = {
    gptBot: 'gptbot',
    claudeBot: 'claudebot',
    perplexityBot: 'perplexitybot',
    bingBot: 'bingbot',
    ccBot: 'ccbot',
    anthropicAI: 'anthropic-ai',
  }

  const crawlerAccess: GEOResult['crawlerAccess'] = {
    gptBot: parseCrawlerStatus(robotsTxt, 'gptbot'),
    claudeBot: parseCrawlerStatus(robotsTxt, 'claudebot'),
    perplexityBot: parseCrawlerStatus(robotsTxt, 'perplexitybot'),
    bingBot: parseCrawlerStatus(robotsTxt, 'bingbot'),
    ccBot: parseCrawlerStatus(robotsTxt, 'ccbot'),
    anthropicAI: parseCrawlerStatus(robotsTxt, 'anthropic-ai'),
  }

  const blockedBots = Object.entries(crawlerAccess).filter(([, v]) => v === 'blocked').map(([k]) => k)
  if (blockedBots.length > 0) {
    issues.push({
      type: 'error',
      message: `${blockedBots.length} AI crawler(s) blocked: ${blockedBots.join(', ')}`,
      impact: 'high',
      fix: 'Update robots.txt to allow AI crawlers (GPTBot, ClaudeBot, PerplexityBot)',
    })
  } else {
    passes.push('All major AI crawlers have access')
  }

  // --- llms.txt ---
  const llmsTxtRes = await safeFetch(`${baseUrl}/llms.txt`)
  const llmsTxtContent = llmsTxtRes?.ok ? await llmsTxtRes.text() : ''
  const llmsTxtExists = !!llmsTxtContent && !llmsTxtContent.includes('<!DOCTYPE')
  const llmsWellFormatted = llmsTxtExists && (llmsTxtContent.includes('#') || llmsTxtContent.includes('---'))

  if (!llmsTxtExists) {
    issues.push({
      type: 'error',
      message: 'llms.txt file not found',
      impact: 'high',
      fix: 'Create /llms.txt to help AI models understand your site content and policies',
    })
  } else {
    passes.push('llms.txt file present')
    if (!llmsWellFormatted) {
      issues.push({ type: 'warning', message: 'llms.txt exists but may not be well-formatted', impact: 'low', fix: 'Follow llmstxt.org spec for maximum AI compatibility' })
    } else {
      passes.push('llms.txt is well-formatted')
    }
  }

  // --- Schema Markup for AI ---
  const schemaScripts = $('script[type="application/ld+json"]')
  const allSchemaTypes: string[] = []
  const allSchemaData: Record<string, unknown>[] = []

  schemaScripts.each((_, el) => {
    try {
      const parsed = JSON.parse($(el).html() || '{}')
      const items = Array.isArray(parsed) ? parsed : [parsed]
      items.forEach((item: Record<string, unknown>) => {
        if (item['@type']) {
          const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']]
          types.forEach((t: unknown) => typeof t === 'string' && allSchemaTypes.push(t))
          allSchemaData.push(item)
        }
      })
    } catch {}
  })

  const schemaTypesLower = allSchemaTypes.map(t => t.toLowerCase())
  const aiSchema: GEOResult['aiSchema'] = {
    organization: schemaTypesLower.some(t => t === 'organization'),
    website: schemaTypesLower.some(t => t === 'website'),
    article: schemaTypesLower.some(t => t.includes('article') || t.includes('blogposting') || t.includes('newsarticle')),
    faq: schemaTypesLower.some(t => t === 'faqpage'),
    person: schemaTypesLower.some(t => t === 'person'),
    breadcrumb: schemaTypesLower.some(t => t === 'breadcrumblist'),
    speakable: allSchemaData.some(d => d['speakable']),
    sameAs: allSchemaData.some(d => d['sameAs']),
    howTo: schemaTypesLower.some(t => t === 'howto'),
    event: schemaTypesLower.some(t => t === 'event'),
    video: schemaTypesLower.some(t => t === 'videoobject' || t === 'video'),
    review: schemaTypesLower.some(t => t === 'aggregaterating' || t === 'review' || t === 'itemlist'),
    product: schemaTypesLower.some(t => t === 'product' || t === 'offer' || t === 'softwareapplication'),
    localBusiness: schemaTypesLower.some(t => t === 'localbusiness' || t.includes('store') || t.includes('restaurant') || t.includes('hotel')),
  }

  const aiSchemaCount = Object.values(aiSchema).filter(Boolean).length
  if (!aiSchema.organization) issues.push({ type: 'error', message: 'Missing Organization schema — critical for AI brand recognition', impact: 'high', fix: 'Add Organization JSON-LD with name, url, logo, and sameAs' })
  else passes.push('Organization schema present')

  if (!aiSchema.website) issues.push({ type: 'warning', message: 'Missing WebSite schema with SearchAction', impact: 'medium', fix: 'Add WebSite schema with sitelinks search box' })

  if (!aiSchema.faq) issues.push({ type: 'info', message: 'No FAQ schema found — great for AI answer boxes', impact: 'low', fix: 'Add FAQPage schema for Q&A content' })
  else passes.push('FAQ schema present')

  if (!aiSchema.speakable) issues.push({ type: 'warning', message: 'No speakable property found', impact: 'medium', fix: 'Add speakable property to mark content suitable for voice/AI responses' })

  if (!aiSchema.sameAs) issues.push({ type: 'warning', message: 'No sameAs links found — reduces brand entity recognition', impact: 'medium', fix: 'Add sameAs links to Wikipedia, Wikidata, social profiles' })
  else passes.push('sameAs entity links present')

  // --- E-E-A-T Signals ---
  const pageText = $('body').text().toLowerCase()
  const allLinks: string[] = []
  $('a[href]').each((_, el) => { allLinks.push($(el).attr('href') || '') })

  const checkPageExists = async (paths: string[]) => {
    for (const p of paths) {
      const res = await safeFetch(`${baseUrl}${p}`)
      if (res?.ok) return true
    }
    return false
  }

  const [hasAbout, hasContact, hasPrivacy, hasTerms] = await Promise.all([
    checkPageExists(['/about', '/about-us', '/our-story', '/company']),
    checkPageExists(['/contact', '/contact-us', '/get-in-touch']),
    checkPageExists(['/privacy', '/privacy-policy', '/privacy-notice']),
    checkPageExists(['/terms', '/terms-of-service', '/tos', '/legal']),
  ])

  const hasAuthorInfo = !!$('[rel="author"]').length || !!$('.author').length || pageText.includes('written by') || pageText.includes('by ')
  const hasLinkedIn = allLinks.some(l => l.includes('linkedin.com')) || allLinks.some(l => l.includes('twitter.com')) || allLinks.some(l => l.includes('x.com'))
  const externalLinks = allLinks.filter(l => l.startsWith('http') && !l.includes(urlObj.host))

  // Fresh content: datePublished/Modified in schema within last year, or <time> elements, or meta tags
  const hasFreshContent = (() => {
    const freshFromSchema = allSchemaData.some(d => {
      const dp = (d['datePublished'] as string) || (d['dateModified'] as string)
      if (!dp) return false
      try {
        const days = (Date.now() - new Date(dp).getTime()) / (1000 * 60 * 60 * 24)
        return days < 365
      } catch { return false }
    })
    return freshFromSchema
      || $('meta[property="article:published_time"]').length > 0
      || $('meta[property="article:modified_time"]').length > 0
      || $('time[datetime]').length > 0
  })()

  // Question headings: H2/H3 phrased as questions — great for AI featured snippets
  const hasQuestionHeadings = $('h2, h3').toArray().some(el => $(el).text().trim().endsWith('?'))

  const eeat: GEOResult['eeat'] = {
    hasAboutPage: hasAbout,
    hasContactPage: hasContact,
    hasPrivacyPolicy: hasPrivacy,
    hasTerms,
    hasAuthorInfo,
    hasLinkedInOrSocial: hasLinkedIn,
    hasExternalLinks: externalLinks.length > 0,
    hasFreshContent,
    hasQuestionHeadings,
  }

  if (!hasAbout) issues.push({ type: 'warning', message: 'No About page found — reduces E-E-A-T trust signals', impact: 'medium', fix: 'Create an /about page describing your organization, team, and expertise' })
  else passes.push('About page found')

  if (!hasContact) issues.push({ type: 'warning', message: 'No Contact page found', impact: 'medium', fix: 'Add a contact page with contact information' })
  else passes.push('Contact page found')

  if (!hasPrivacy) issues.push({ type: 'error', message: 'No Privacy Policy found', impact: 'high', fix: 'Add a privacy policy page (required by GDPR and builds trust)' })
  else passes.push('Privacy policy found')

  if (!hasLinkedIn) issues.push({ type: 'info', message: 'No social media profile links found', impact: 'low', fix: 'Link to your LinkedIn/Twitter/social profiles to boost entity authority' })
  else passes.push('Social profile links found')

  if (!hasFreshContent) issues.push({ type: 'warning', message: 'No content freshness signals detected', impact: 'medium', fix: 'Add datePublished/dateModified to Article schema or use <time datetime="..."> elements. AI models weight recent content heavily.' })
  else passes.push('Fresh content signals detected')

  if (!hasQuestionHeadings) issues.push({ type: 'info', message: 'No question-phrased headings (H2/H3 ending in "?")', impact: 'low', fix: 'Add H2/H3 headings phrased as questions (e.g. "How does X work?"). AI tools extract these for direct answers.' })
  else passes.push('Question headings found — great for AI featured answers')

  // --- Platform scores ---
  const crawlerBlocked = blockedBots.length
  const schemaScore = Math.min(100, aiSchemaCount * 10)
  const eeatCount = Object.values(eeat).filter(Boolean).length
  const eeatScore = Math.round((eeatCount / 7) * 100)

  const chatgptScore = Math.min(100, Math.round(
    (crawlerAccess.gptBot === 'allowed' ? 35 : 0) +
    (aiSchema.organization ? 15 : 0) +
    (llmsTxtExists ? 20 : 0) +
    (aiSchema.faq ? 15 : 0) +
    (eeat.hasQuestionHeadings ? 10 : 0) +
    (eeat.hasFreshContent ? 5 : 0)
  ))

  const perplexityScore = Math.min(100, Math.round(
    (crawlerAccess.perplexityBot === 'allowed' ? 35 : 0) +
    (aiSchema.article ? 20 : 0) +
    (eeat.hasExternalLinks ? 15 : 0) +
    (aiSchema.sameAs ? 20 : 0) +
    (eeat.hasFreshContent ? 10 : 0)
  ))

  const geminiScore = Math.min(100, Math.round(
    (aiSchema.organization ? 25 : 0) +
    (aiSchema.speakable ? 20 : 0) +
    (aiSchema.sameAs ? 20 : 0) +
    (eeat.hasAboutPage ? 15 : 0) +
    (eeat.hasFreshContent ? 10 : 0) +
    (aiSchema.faq ? 10 : 0)
  ))

  const bingScore = Math.min(100, Math.round(
    (crawlerAccess.bingBot === 'allowed' ? 30 : 0) +
    (aiSchema.organization ? 20 : 0) +
    (aiSchema.faq ? 15 : 0) +
    (eeat.hasContactPage ? 15 : 0) +
    (eeat.hasQuestionHeadings ? 10 : 0) +
    (eeat.hasFreshContent ? 10 : 0)
  ))

  const googleAIScore = Math.min(100, Math.round(
    (aiSchema.organization ? 20 : 0) +
    (aiSchema.speakable ? 15 : 0) +
    (aiSchema.faq ? 20 : 0) +
    (eeat.hasAboutPage ? 10 : 0) +
    (aiSchema.sameAs ? 15 : 0) +
    (eeat.hasFreshContent ? 10 : 0) +
    (eeat.hasQuestionHeadings ? 10 : 0)
  ))

  // --- Citability ---
  const wordCount = $('body').text().replace(/\s+/g, ' ').split(' ').length
  const contentDepth: 'shallow' | 'medium' | 'deep' = wordCount < 500 ? 'shallow' : wordCount < 1500 ? 'medium' : 'deep'
  const hasLists = $('ul, ol').length > 2
  const hasStructuredContent = hasLists || $('table').length > 0 || headingsCount($) > 3

  const citability = {
    score: Math.round(
      (eeat.hasExternalLinks ? 30 : 0) +
      (contentDepth === 'deep' ? 30 : contentDepth === 'medium' ? 15 : 0) +
      (hasStructuredContent ? 20 : 0) +
      (aiSchema.article ? 20 : 0)
    ),
    hasOutboundLinks: eeat.hasExternalLinks,
    externalLinkCount: externalLinks.length,
    contentDepth,
    hasStructuredContent,
  }

  // --- Final score ---
  let score = 100
  issues.forEach(issue => {
    if (issue.impact === 'high') score -= issue.type === 'error' ? 15 : 10
    else if (issue.impact === 'medium') score -= issue.type === 'warning' ? 6 : 4
    else score -= 2
  })
  score = Math.max(0, Math.min(100, score))

  return {
    score,
    grade: scoreToGrade(score),
    crawlerAccess,
    llmsTxt: { exists: llmsTxtExists, content: llmsTxtContent.slice(0, 500), wellFormatted: llmsWellFormatted },
    aiSchema,
    eeat,
    platforms: {
      googleAI: googleAIScore,
      chatgpt: chatgptScore,
      perplexity: perplexityScore,
      gemini: geminiScore,
      bingCopilot: bingScore,
    },
    citability,
    issues,
    passes,
  }
}

function headingsCount($: cheerio.CheerioAPI): number {
  return $('h1, h2, h3, h4, h5, h6').length
}
