export type AuditMode = 'audit' | 'compare' | 'bulk'
export type AuditDepth = 'basic' | 'deep'
export type Grade = 'A' | 'B' | 'C' | 'D' | 'F'
export type Severity = 'error' | 'warning' | 'info'
export type Impact = 'high' | 'medium' | 'low'
export type CrawlerStatus = 'allowed' | 'blocked' | 'unknown'

export interface Issue {
  type: Severity
  message: string
  impact: Impact
  fix?: string
}

export interface SEOResult {
  score: number
  grade: Grade

  title: { exists: boolean; value: string; length: number; optimal: boolean }
  description: { exists: boolean; value: string; length: number; optimal: boolean }

  h1: { exists: boolean; count: number; value: string }
  headings: { h2: number; h3: number; h4: number; h5: number; h6: number }

  ssl: boolean
  canonical: { exists: boolean; value: string }
  metaRobots: { exists: boolean; noindex: boolean; nofollow: boolean }
  robotsTxt: { exists: boolean; allowsAll: boolean; hasDisallowRules: boolean }
  sitemap: { exists: boolean; url: string }

  ogTags: { title: boolean; description: boolean; image: boolean; url: boolean; type: boolean }
  twitterCard: { exists: boolean; type: string }

  schemaTypes: string[]
  structuredData: boolean

  wordCount: number
  images: { total: number; withAlt: number; withoutAlt: number }
  links: { internal: number; external: number }

  domainAge?: { days: number; label: string }
  httpCompressed?: boolean

  performance: number
  accessibility: number
  bestPractices: number
  lighthouseSeo: number
  coreWebVitals: {
    lcp: number
    fcp: number
    cls: number
    tbt: number
    si: number
    ttfb: number
  }

  issues: Issue[]
  passes: string[]
}

export interface GEOResult {
  score: number
  grade: Grade

  crawlerAccess: {
    gptBot: CrawlerStatus
    claudeBot: CrawlerStatus
    perplexityBot: CrawlerStatus
    bingBot: CrawlerStatus
    ccBot: CrawlerStatus
    anthropicAI: CrawlerStatus
  }

  llmsTxt: { exists: boolean; content: string; wellFormatted: boolean }

  aiSchema: {
    organization: boolean
    website: boolean
    article: boolean
    faq: boolean
    person: boolean
    breadcrumb: boolean
    speakable: boolean
    sameAs: boolean
    howTo: boolean
    event: boolean
    video: boolean
    review: boolean
    product: boolean
    localBusiness: boolean
  }

  eeat: {
    hasAboutPage: boolean
    hasContactPage: boolean
    hasPrivacyPolicy: boolean
    hasTerms: boolean
    hasAuthorInfo: boolean
    hasLinkedInOrSocial: boolean
    hasExternalLinks: boolean
    hasFreshContent: boolean
    hasQuestionHeadings: boolean
  }

  platforms: {
    googleAI: number
    chatgpt: number
    perplexity: number
    gemini: number
    bingCopilot: number
  }

  citability: {
    score: number
    hasOutboundLinks: boolean
    externalLinkCount: number
    contentDepth: 'shallow' | 'medium' | 'deep'
    hasStructuredContent: boolean
  }

  issues: Issue[]
  passes: string[]
}

export type { ContentResult } from './analyzers/content'
export type { AuthorityResult } from './analyzers/authority'
export type { RankTrackingResult } from './analyzers/rank-tracking'

export interface AuditResult {
  url: string
  domain: string
  auditedAt: string
  depth: AuditDepth
  loadTime: number
  overallScore: number
  seo: SEOResult
  geo: GEOResult
  content?: import('./analyzers/content').ContentResult
  authority?: import('./analyzers/authority').AuthorityResult
  rankTracking?: import('./analyzers/rank-tracking').RankTrackingResult
  error?: string
}

export interface CompareResult {
  siteA: AuditResult
  siteB: AuditResult
  winner: 'A' | 'B' | 'tie'
  seoWinner: 'A' | 'B' | 'tie'
  geoWinner: 'A' | 'B' | 'tie'
}

export interface BulkResult {
  url: string
  domain: string
  seoScore: number
  geoScore: number
  overallScore: number
  grade: Grade
  topIssue: string
  error?: string
}

export interface AnalyzeRequest {
  url: string
  competitorUrl?: string
  urls?: string[]
  mode: AuditMode
  depth: AuditDepth
}
