/**
 * Programmatic PDF export — no html2canvas, no DOM cloning.
 * Uses jsPDF directly so it always works regardless of CSS/themes.
 */
import type { AuditResult } from './types'

// ── palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:      [7,  10, 18]  as [number,number,number],
  surface: [13, 17, 28]  as [number,number,number],
  card:    [18, 24, 38]  as [number,number,number],
  border:  [40, 50, 70]  as [number,number,number],
  heading: [226,232,240] as [number,number,number],
  body:    [155,168,192] as [number,number,number],
  muted:   [90, 100,130] as [number,number,number],
  cyan:    [0, 212, 255] as [number,number,number],
  green:   [0, 255, 138] as [number,number,number],
  yellow:  [255,183,64]  as [number,number,number],
  red:     [255,107,107] as [number,number,number],
  lime:    [170,255, 62] as [number,number,number],
  purple:  [155,143,255] as [number,number,number],
}

type RGB = [number,number,number]

/** jsPDF built-in fonts (Helvetica) only support Latin-1.
 *  Strip/replace any characters outside that range so they don't render as %² garbage. */
function safe(txt: string): string {
  return txt
    .replace(/✓/g, '+')
    .replace(/✗/g, '-')
    .replace(/▲/g, '^')
    .replace(/🏆/g, '')
    .replace(/⚠/g, '!')
    .replace(/…/g, '...')
    .replace(/·/g, '-')
    .replace(/🌐/g, '')
    // strip anything outside Latin-1 printable range
    .replace(/[^\x20-\xFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function scoreColor(score: number): RGB {
  if (score >= 80) return C.green
  if (score >= 60) return C.yellow
  if (score >= 40) return C.cyan
  return C.red
}

function gradeColor(grade: string): RGB {
  if (grade === 'A') return C.green
  if (grade === 'B') return C.lime
  if (grade === 'C') return C.yellow
  return C.red
}

export async function exportAuditPDF(result: AuditResult): Promise<void> {
  const { default: jsPDF } = await import('jspdf')

  const W = 210, H = 297
  const ML = 14, MR = 14, MT = 14
  const CW = W - ML - MR   // content width

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

  // ── helpers ──────────────────────────────────────────────────────────────
  let curY = MT

  function fillPage() {
    doc.setFillColor(...C.bg)
    doc.rect(0, 0, W, H, 'F')
  }

  function newPage() {
    doc.addPage()
    fillPage()
    curY = MT
    // subtle top strip
    doc.setFillColor(...C.surface)
    doc.rect(0, 0, W, 8, 'F')
    doc.setFontSize(6)
    doc.setTextColor(...C.muted)
    doc.text(`SITESCOPE AUDIT  ·  ${result.domain}`, ML, 5.5)
    doc.text(new Date(result.auditedAt).toLocaleDateString(), W - MR, 5.5, { align: 'right' })
    curY = 14
  }

  function ensureSpace(needed: number) {
    if (curY + needed > H - 14) newPage()
  }

  function sectionTitle(title: string, color: RGB = C.cyan) {
    ensureSpace(14)
    doc.setFillColor(...color)
    doc.rect(ML, curY, 2, 6, 'F')
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...C.heading)
    doc.text(safe(title).toUpperCase(), ML + 5, curY + 4.5)
    curY += 10
  }

  function subLabel(txt: string) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...C.muted)
    doc.text(safe(txt).toUpperCase(), ML, curY)
    curY += 5
  }

  function card(x: number, y: number, w: number, h: number) {
    doc.setFillColor(...C.card)
    doc.roundedRect(x, y, w, h, 2, 2, 'F')
    doc.setDrawColor(...C.border)
    doc.setLineWidth(0.2)
    doc.roundedRect(x, y, w, h, 2, 2, 'S')
  }

  function bigScore(x: number, y: number, value: number | string, label: string, color: RGB) {
    doc.setFillColor(...color)
    const r = 10
    doc.circle(x + r, y + r, r, 'F')
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(7, 10, 18)
    const txt = String(value)
    doc.text(txt, x + r, y + r + 3.5, { align: 'center' })
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...C.muted)
    doc.text(label, x + r, y + r * 2 + 4, { align: 'center' })
  }

  function scoreBar(x: number, y: number, w: number, value: number, max: number, color: RGB) {
    const h = 2
    doc.setFillColor(...C.border)
    doc.roundedRect(x, y, w, h, 1, 1, 'F')
    if (value > 0) {
      doc.setFillColor(...color)
      doc.roundedRect(x, y, Math.max(1, (value / max) * w), h, 1, 1, 'F')
    }
  }

  function row(label: string, value: string, ok?: boolean, y?: number): number {
    const ry = y !== undefined ? y : curY
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...C.body)
    doc.text(safe(label), ML + 2, ry)
    doc.setFont('helvetica', 'bold')
    if (ok === true) doc.setTextColor(...C.green)
    else if (ok === false) doc.setTextColor(...C.red)
    else doc.setTextColor(...C.heading)
    doc.text(safe(value), W - MR - 2, ry, { align: 'right' })
    return ry + 6
  }

  function issueRow(msg: string, impact: string, type: string) {
    ensureSpace(9)
    const col: RGB = type === 'error' ? C.red : type === 'warning' ? C.yellow : C.cyan
    doc.setFillColor(...col)
    doc.circle(ML + 2, curY - 1, 1.2, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...C.body)
    const maxW = CW - 22
    const lines = doc.splitTextToSize(safe(msg), maxW)
    doc.text(lines[0], ML + 6, curY)
    doc.setTextColor(...col)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text(safe(impact).toUpperCase(), W - MR, curY, { align: 'right' })
    curY += lines.length > 1 ? 9 : 6.5
  }

  function twoCol<T>(items: T[], render: (item: T, x: number, y: number, w: number) => number) {
    const colW2 = (CW - 4) / 2
    let left = 0, leftY = curY, rightY = curY
    items.forEach((item, i) => {
      const isLeft = i % 2 === 0
      const x = isLeft ? ML : ML + colW2 + 4
      const startY = isLeft ? leftY : rightY
      const endY = render(item, x, startY, colW2)
      if (isLeft) leftY = endY
      else rightY = endY
      left = i
    })
    curY = Math.max(leftY, rightY)
  }

  function divider() {
    curY += 2
    doc.setDrawColor(...C.border)
    doc.setLineWidth(0.2)
    doc.line(ML, curY, W - MR, curY)
    curY += 4
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PAGE 1 — COVER / OVERVIEW
  // ═══════════════════════════════════════════════════════════════════════
  fillPage()

  // Top gradient bar
  doc.setFillColor(...C.cyan)
  doc.rect(0, 0, W, 1.5, 'F')

  // Logo area
  doc.setFillColor(...C.surface)
  doc.rect(0, 0, W, 28, 'F')

  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...C.cyan)
  doc.text('SITESCOPE', ML, 13)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...C.muted)
  doc.text('SEO + GEO Audit Report', ML, 19)
  doc.text(new Date(result.auditedAt).toLocaleString(), W - MR, 19, { align: 'right' })

  // Domain badge
  doc.setFillColor(...C.card)
  doc.roundedRect(ML, 22, CW, 8, 2, 2, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...C.heading)
  doc.text(safe(result.url), ML + 4, 27.5)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...C.muted)
  doc.text(`Depth: DEEP  ·  Load time: ${(result.loadTime / 1000).toFixed(1)}s`, W - MR, 27.5, { align: 'right' })

  curY = 38

  // Score circles row
  const scores = [
    { label: 'OVERALL', value: result.overallScore, color: scoreColor(result.overallScore) },
    { label: 'SEO', value: result.seo?.score || 0, color: scoreColor(result.seo?.score || 0) },
    { label: 'GEO', value: result.geo?.score || 0, color: scoreColor(result.geo?.score || 0) },
    { label: 'GRADE', value: result.seo?.grade || '—', color: gradeColor(result.seo?.grade || 'F') },
  ]

  const bsW = CW / 4
  scores.forEach((s, i) => {
    const bx = ML + i * bsW + (bsW - 20) / 2
    card(ML + i * bsW, curY, bsW - 3, 30)
    bigScore(bx, curY + 4, s.value, s.label, s.color)
  })
  curY += 35

  // AI Platform readiness
  sectionTitle('AI Platform Readiness', C.lime)
  const platforms = [
    { name: 'Google AI', score: result.geo?.platforms?.googleAI || 0 },
    { name: 'ChatGPT',   score: result.geo?.platforms?.chatgpt   || 0 },
    { name: 'Perplexity',score: result.geo?.platforms?.perplexity|| 0 },
    { name: 'Gemini',    score: result.geo?.platforms?.gemini    || 0 },
    { name: 'Bing Copilot', score: result.geo?.platforms?.bingCopilot || 0 },
  ]
  platforms.forEach(p => {
    const col = scoreColor(p.score)
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...C.body)
    doc.text(p.name, ML, curY)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...col)
    doc.text(`${p.score}/100`, W - MR, curY, { align: 'right' })
    scoreBar(ML + 32, curY - 2.5, CW - 48, p.score, 100, col)
    curY += 7
  })
  divider()

  // Quick stats row
  sectionTitle('Key Metrics', C.cyan)
  const stats: Array<[string, string, boolean | undefined]> = [
    ['HTTPS / SSL', result.seo?.ssl ? '✓ Enabled' : '✗ Missing', result.seo?.ssl],
    ['XML Sitemap', result.seo?.sitemap?.exists ? '✓ Found' : '✗ Missing', result.seo?.sitemap?.exists],
    ['robots.txt', result.seo?.robotsTxt?.exists ? '✓ Found' : '✗ Missing', result.seo?.robotsTxt?.exists],
    ['llms.txt', result.geo?.llmsTxt?.exists ? '✓ Found' : '✗ Missing', result.geo?.llmsTxt?.exists],
    ['Word Count', `${result.seo?.wordCount || 0} words`, undefined],
    ['Schema Types', `${result.seo?.schemaTypes?.length || 0} detected`, undefined],
    ['Internal Links', `${result.seo?.links?.internal || 0}`, undefined],
    ['Images without alt', `${result.seo?.images?.withoutAlt || 0}`, (result.seo?.images?.withoutAlt || 0) === 0],
  ]
  const half = Math.ceil(stats.length / 2)
  const colHW = (CW - 5) / 2
  stats.forEach((s, i) => {
    const x = i < half ? ML : ML + colHW + 5
    const y2 = curY + (i % half) * 6.5
    if (i === half) {} // start right col
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...C.body)
    doc.text(s[0], x, y2)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...(s[2] === true ? C.green : s[2] === false ? C.red : C.heading))
    doc.text(s[1], x + colHW, y2, { align: 'right' })
  })
  curY += half * 6.5 + 4

  // Issues summary
  const allIssues = [...(result.seo?.issues || []), ...(result.geo?.issues || [])]
  const errors = allIssues.filter(i => i.type === 'error').length
  const warnings = allIssues.filter(i => i.type === 'warning').length
  const passes = (result.seo?.passes?.length || 0) + (result.geo?.passes?.length || 0)

  divider()
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...C.heading)
  doc.text('Issues Summary', ML, curY)
  curY += 6

  const summaryCards = [
    { label: 'Errors', value: errors, color: C.red },
    { label: 'Warnings', value: warnings, color: C.yellow },
    { label: 'Passed', value: passes, color: C.green },
  ]
  summaryCards.forEach((sc, i) => {
    const x = ML + i * (CW / 3)
    card(x, curY, CW / 3 - 3, 16)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...sc.color)
    doc.text(String(sc.value), x + (CW / 3 - 3) / 2, curY + 10, { align: 'center' })
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...C.muted)
    doc.text(sc.label, x + (CW / 3 - 3) / 2, curY + 14, { align: 'center' })
  })
  curY += 20

  // ═══════════════════════════════════════════════════════════════════════
  // PAGE 2 — SEO ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════
  newPage()
  const seo = result.seo

  sectionTitle('SEO Analysis', C.cyan)
  subLabel(`Score: ${seo?.score || 0}/100  ·  Grade: ${seo?.grade || '—'}`)

  // Lighthouse scores
  if ((seo?.performance || 0) > 0) {
    sectionTitle('Lighthouse / PageSpeed', C.cyan)
    const lh = [
      { n: 'Performance',    v: seo?.performance   || 0 },
      { n: 'Accessibility',  v: seo?.accessibility  || 0 },
      { n: 'Best Practices', v: seo?.bestPractices  || 0 },
      { n: 'SEO (Lighthouse)',v: seo?.lighthouseSeo || 0 },
    ]
    lh.forEach(m => {
      const col = scoreColor(m.v)
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...C.body)
      doc.text(m.n, ML, curY)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...col)
      doc.text(String(m.v), W - MR, curY, { align: 'right' })
      scoreBar(ML + 44, curY - 2.5, CW - 59, m.v, 100, col)
      curY += 7
    })

    // Core Web Vitals
    const lcpMs  = (seo?.coreWebVitals?.lcp  || 0) * 1000
    if (lcpMs > 0) {
      divider()
      sectionTitle('Core Web Vitals', C.lime)
      const cwv = [
        { n: 'LCP (Largest Contentful Paint)', v: `${(lcpMs / 1000).toFixed(2)}s`, ok: lcpMs < 2500 },
        { n: 'FCP (First Contentful Paint)',   v: `${((seo?.coreWebVitals?.fcp || 0) * 1000 / 1000).toFixed(2)}s`, ok: (seo?.coreWebVitals?.fcp || 0) * 1000 < 1800 },
        { n: 'CLS (Cumulative Layout Shift)',  v: (seo?.coreWebVitals?.cls || 0).toFixed(3), ok: (seo?.coreWebVitals?.cls || 0) < 0.1 },
        { n: 'TBT (Total Blocking Time)',      v: `${((seo?.coreWebVitals?.tbt || 0) * 1000).toFixed(0)}ms`, ok: (seo?.coreWebVitals?.tbt || 0) * 1000 < 200 },
        { n: 'TTFB (Time to First Byte)',      v: `${((seo?.coreWebVitals?.ttfb || 0) * 1000).toFixed(0)}ms`, ok: (seo?.coreWebVitals?.ttfb || 0) * 1000 < 600 },
      ]
      cwv.forEach(c => { curY = row(c.n, c.v, c.ok) })
    }
  }

  divider()

  // On-page signals
  sectionTitle('On-Page Signals', C.cyan)
  const onPage: Array<[string, string, boolean | undefined]> = [
    ['Title tag', seo?.title?.exists ? `✓ ${seo.title.value.slice(0, 55)}${seo.title.value.length > 55 ? '…' : ''}` : '✗ Missing', seo?.title?.exists],
    ['Title length', seo?.title?.exists ? `${seo.title.length} chars ${seo.title.optimal ? '(optimal)' : '(adjust)'}` : '—', seo?.title?.optimal],
    ['Meta description', seo?.description?.exists ? `✓ ${seo.description.length} chars ${seo.description.optimal ? '(optimal)' : '(adjust)'}` : '✗ Missing', seo?.description?.exists],
    ['H1 tag', seo?.h1?.exists ? `✓ ${seo.h1.value.slice(0, 50)}${seo.h1.value.length > 50 ? '…' : ''}` : '✗ Missing', seo?.h1?.exists],
    ['H2 headings', `${seo?.headings?.h2 || 0} found`, undefined],
    ['Canonical tag', seo?.canonical?.exists ? '✓ Present' : '✗ Missing', seo?.canonical?.exists],
    ['OG: title', seo?.ogTags?.title ? '✓' : '✗', seo?.ogTags?.title],
    ['OG: description', seo?.ogTags?.description ? '✓' : '✗', seo?.ogTags?.description],
    ['OG: image', seo?.ogTags?.image ? '✓' : '✗', seo?.ogTags?.image],
    ['Twitter card', seo?.twitterCard?.exists ? `✓ ${seo.twitterCard.type}` : '✗ Missing', seo?.twitterCard?.exists],
    ['Schema types', (seo?.schemaTypes || []).slice(0, 5).join(', ') || 'None', (seo?.schemaTypes?.length || 0) > 0],
    ['Images total', `${seo?.images?.total || 0} (${seo?.images?.withoutAlt || 0} missing alt)`, (seo?.images?.withoutAlt || 0) === 0],
    ['HTTP compressed', seo?.httpCompressed ? '✓ Yes' : '—', seo?.httpCompressed],
  ]
  onPage.forEach(([l, v, ok]) => { curY = row(l, v, ok) })
  divider()

  // SEO Issues
  if (seo?.issues?.length) {
    sectionTitle('SEO Issues', C.red)
    seo.issues.forEach(i => issueRow(i.message, i.impact, i.type))
    divider()
  }

  // SEO Passes
  if (seo?.passes?.length) {
    sectionTitle('SEO Passes', C.green)
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...C.body)
    seo.passes.forEach(p => {
      ensureSpace(6)
      doc.setTextColor(...C.green)
      doc.text('+', ML, curY)
      doc.setTextColor(...C.body)
      doc.text(safe(p), ML + 6, curY)
      curY += 6
    })
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PAGE 3 — GEO ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════
  newPage()
  const geo = result.geo

  sectionTitle('GEO Analysis — AI Visibility', C.lime)
  subLabel(`Score: ${geo?.score || 0}/100  ·  Grade: ${geo?.grade || '—'}`)
  curY += 2

  // AI Crawlers
  sectionTitle('AI Crawler Access', C.cyan)
  const crawlers = [
    ['GPTBot (ChatGPT)',   geo?.crawlerAccess?.gptBot],
    ['ClaudeBot (Anthropic)', geo?.crawlerAccess?.claudeBot],
    ['PerplexityBot',     geo?.crawlerAccess?.perplexityBot],
    ['Bingbot (Copilot)', geo?.crawlerAccess?.bingBot],
    ['CCBot',             geo?.crawlerAccess?.ccBot],
    ['anthropic-ai',      geo?.crawlerAccess?.anthropicAI],
  ] as const
  crawlers.forEach(([name, status]) => {
    const col: RGB = status === 'allowed' ? C.green : status === 'blocked' ? C.red : C.yellow
    curY = row(name, (status || 'unknown').toUpperCase(), status === 'allowed')
  })
  divider()

  // llms.txt
  sectionTitle('llms.txt', C.cyan)
  curY = row('File present',    geo?.llmsTxt?.exists ? '✓ Found'     : '✗ Missing', geo?.llmsTxt?.exists)
  curY = row('Well formatted',  geo?.llmsTxt?.wellFormatted ? '✓ Yes' : geo?.llmsTxt?.exists ? '⚠ Basic' : '—', geo?.llmsTxt?.wellFormatted)
  divider()

  // Schema
  sectionTitle('AI Schema Types (14 checked)', C.purple)
  const schemaItems = [
    ['Organization', geo?.aiSchema?.organization], ['WebSite', geo?.aiSchema?.website],
    ['Article', geo?.aiSchema?.article], ['FAQPage', geo?.aiSchema?.faq],
    ['Person', geo?.aiSchema?.person], ['BreadcrumbList', geo?.aiSchema?.breadcrumb],
    ['speakable', geo?.aiSchema?.speakable], ['sameAs', geo?.aiSchema?.sameAs],
    ['HowTo', geo?.aiSchema?.howTo], ['Event', geo?.aiSchema?.event],
    ['VideoObject', geo?.aiSchema?.video], ['AggregateRating', geo?.aiSchema?.review],
    ['Product', geo?.aiSchema?.product], ['LocalBusiness', geo?.aiSchema?.localBusiness],
  ] as const
  const schemaHalf = Math.ceil(schemaItems.length / 2)
  schemaItems.forEach(([name, present], i) => {
    const col = present ? C.green : C.red
    const x = i < schemaHalf ? ML : ML + (CW / 2) + 5
    const baseY = curY + (i % schemaHalf) * 6.5
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...C.body)
    doc.text(name, x, baseY)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...col)
    doc.text(present ? 'YES' : 'NO', x + CW / 2 - 5, baseY, { align: 'right' })
  })
  curY += schemaHalf * 6.5 + 4
  divider()

  // E-E-A-T
  sectionTitle('E-E-A-T Signals', C.cyan)
  const eeat = [
    ['About Page', geo?.eeat?.hasAboutPage],
    ['Contact Page', geo?.eeat?.hasContactPage],
    ['Privacy Policy', geo?.eeat?.hasPrivacyPolicy],
    ['Terms of Service', geo?.eeat?.hasTerms],
    ['Author Information', geo?.eeat?.hasAuthorInfo],
    ['Social Profile Links', geo?.eeat?.hasLinkedInOrSocial],
    ['External Citations', geo?.eeat?.hasExternalLinks],
    ['Fresh Content (<1yr)', geo?.eeat?.hasFreshContent],
    ['Question Headings (H2/H3?)', geo?.eeat?.hasQuestionHeadings],
  ] as const
  eeat.forEach(([name, ok]) => { curY = row(name, ok ? '✓ Present' : '✗ Missing', ok) })
  divider()

  // GEO Issues
  if (geo?.issues?.length) {
    sectionTitle('GEO Issues', C.red)
    geo.issues.forEach(i => issueRow(i.message, i.impact, i.type))
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PAGE 4 — CONTENT ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════
  if (result.content) {
    newPage()
    const c = result.content

    sectionTitle('Content Analysis', C.yellow)
    subLabel(`Quality score: ${c.contentQualityScore}/100`)
    curY += 2

    // Search intent
    sectionTitle('Search Intent', C.cyan)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    const intentCol: RGB = c.searchIntent === 'informational' ? C.cyan : c.searchIntent === 'transactional' ? C.green : c.searchIntent === 'commercial' ? C.lime : C.purple
    doc.setTextColor(...intentCol)
    doc.text((c.searchIntent || '').toUpperCase(), ML, curY)
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...C.body)
    doc.text(`Confidence: ${c.intentConfidence}%`, ML, curY + 6)
    scoreBar(ML, curY + 9, CW, c.intentConfidence, 100, intentCol)
    curY += 16

    divider()

    // Readability
    sectionTitle('Readability', C.lime)
    const read = [
      ['Flesch Reading Score', `${c.readabilityScore?.toFixed(0) || '—'} / 100`],
      ['Reading Grade', c.readabilityGrade || '—'],
      ['Avg Sentence Length', `${c.avgSentenceLength?.toFixed(0) || '—'} words`],
      ['Avg Syllables/Word', `${c.avgSyllablesPerWord?.toFixed(1) || '—'}`],
    ]
    read.forEach(([l, v]) => { curY = row(l, v) })
    divider()

    // Content quality breakdown
    sectionTitle('Content Quality Breakdown', C.cyan)
    const breakdown: [string, string][] = [
      ['Primary Keyword', c.primaryKeyword || '—'],
      ['Top Keyword Density', c.topKeywordsLocal?.[0] ? `${c.topKeywordsLocal[0].density}%` : '—'],
      ['Reading Level', c.readingLevel || '—'],
      ['Content Type', c.contentType || '—'],
      ['Topical Authority', `${c.topicalAuthorityScore || 0}/100`],
      ['Topics Found', c.topicsFound?.length ? c.topicsFound.slice(0, 3).join(', ') : '—'],
    ]
    breakdown.forEach(([l, v]) => { curY = row(l, v) })
    divider()

    // Top keywords
    if (c.topKeywordsLocal?.length) {
      sectionTitle('Top Keywords', C.purple)
      c.topKeywordsLocal.slice(0, 10).forEach((kw, i) => {
        ensureSpace(6)
        doc.setFontSize(8.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...C.muted)
        doc.text(`${i + 1}.`, ML, curY)
        doc.setTextColor(...C.body)
        doc.text(kw.keyword, ML + 7, curY)
        doc.setTextColor(...C.cyan)
        doc.text(`${kw.count}× (${kw.density}%)`, W - MR, curY, { align: 'right' })
        curY += 6
      })
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PAGE 5 — AUTHORITY
  // ═══════════════════════════════════════════════════════════════════════
  if (result.authority) {
    newPage()
    const auth = result.authority

    sectionTitle('Authority & Keyword Intelligence', C.purple)

    // 4 authority cards
    const authCards = [
      {
        title: 'Domain Authority',
        value: auth.domainAuthority.available ? `${auth.domainAuthority.score}/10` : 'N/A',
        sub: auth.domainAuthority.available
          ? `Global rank: #${auth.domainAuthority.rank?.toLocaleString() || '—'}`
          : 'Add OPEN_PAGERANK_KEY to unlock',
        color: auth.domainAuthority.available ? scoreColor(auth.domainAuthority.score * 10) : C.muted,
      },
      {
        title: 'CC Pages Indexed',
        value: auth.backlinks.available ? auth.backlinks.crawledPages.toLocaleString() : '0',
        sub: auth.backlinks.available
          ? `Est. ${auth.backlinks.estimatedBacklinks.toLocaleString()} backlinks`
          : 'Not in Common Crawl index',
        color: auth.backlinks.available ? C.cyan : C.muted,
      },
      {
        title: 'Knowledge Graph',
        value: auth.knowledgeGraph.exists ? '✓ Found' : '✗ Missing',
        sub: auth.knowledgeGraph.exists ? auth.knowledgeGraph.name : 'Add Organization+sameAs schema',
        color: auth.knowledgeGraph.exists ? C.green : C.red,
      },
      {
        title: 'Wikipedia',
        value: auth.wikipedia.exists ? '✓ Present' : '✗ Missing',
        sub: auth.wikipedia.exists ? auth.wikipedia.title : 'No Wikipedia page found',
        color: auth.wikipedia.exists ? C.green : C.yellow,
      },
    ]

    const aW = (CW - 6) / 2
    authCards.forEach((ac, i) => {
      const x = ML + (i % 2) * (aW + 4)
      const y2 = curY + Math.floor(i / 2) * 26
      card(x, y2, aW, 24)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...C.muted)
      doc.text(ac.title.toUpperCase(), x + 3, y2 + 6)
      doc.setFontSize(12)
      doc.setTextColor(...ac.color)
      doc.text(ac.value, x + 3, y2 + 14)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...C.muted)
      const subLines = doc.splitTextToSize(ac.sub, aW - 6)
      doc.text(subLines[0], x + 3, y2 + 20)
    })
    curY += 58
    divider()

    // Keyword ideas
    if (auth.keywordResearch.available && auth.keywordResearch.suggestions.length) {
      sectionTitle('Keyword Ideas', C.cyan)
      subLabel(`Primary keyword: ${auth.keywordResearch.primaryKeyword}`)
      auth.keywordResearch.suggestions.slice(0, 12).forEach((kw, i) => {
        ensureSpace(6)
        const col: RGB = kw.type === 'semantic' ? C.cyan : kw.type === 'trigger' ? C.lime : kw.type === 'broader' ? C.yellow : C.purple
        doc.setFontSize(8.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...C.muted)
        doc.text(`${i + 1}.`, ML, curY)
        doc.setTextColor(...C.body)
        doc.text(kw.word, ML + 7, curY)
        doc.setTextColor(...col)
        doc.text(kw.type, W - MR, curY, { align: 'right' })
        curY += 6
      })
      divider()

      // LSI keywords
      if (auth.keywordResearch.lsiKeywords.length) {
        sectionTitle('LSI / Semantic Keywords', C.purple)
        doc.setFontSize(8.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...C.body)
        const lsiText = auth.keywordResearch.lsiKeywords.join('  ·  ')
        const lsiLines = doc.splitTextToSize(lsiText, CW)
        doc.text(lsiLines, ML, curY)
        curY += lsiLines.length * 6 + 4
      }

      // Content opportunities
      if (auth.keywordResearch.questions.length) {
        sectionTitle('Content Opportunities (AI-targeted)', C.yellow)
        auth.keywordResearch.questions.forEach((q, i) => {
          ensureSpace(7)
          doc.setFontSize(8.5)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(...C.yellow)
          doc.text(`Q${i + 1}`, ML, curY)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(...C.body)
          doc.text(q, ML + 9, curY)
          curY += 7
        })
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // FOOTER on every page
  // ═══════════════════════════════════════════════════════════════════════
  const pageCount = doc.getNumberOfPages()
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)
    doc.setFillColor(...C.surface)
    doc.rect(0, H - 8, W, 8, 'F')
    doc.setFontSize(6)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...C.muted)
    doc.text('Generated by SiteScope  ·  sitescope.app  ·  Free SEO + GEO auditing', ML, H - 3)
    doc.text(`${p} / ${pageCount}`, W - MR, H - 3, { align: 'right' })
  }

  doc.save(`sitescope-${result.domain}-report.pdf`)
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPARE PDF
// ─────────────────────────────────────────────────────────────────────────────
export async function exportComparePDF(compare: import('./types').CompareResult): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  const W = 210, H = 297, ML = 14, MR = 14, MT = 14, CW = W - ML - MR
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  let curY = MT

  function fillPage() { doc.setFillColor(...C.bg); doc.rect(0, 0, W, H, 'F') }
  function newPage() {
    doc.addPage(); fillPage(); curY = MT
    doc.setFillColor(...C.surface); doc.rect(0, 0, W, 8, 'F')
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.muted)
    doc.text(`SITESCOPE  ·  ${compare.siteA.domain} vs ${compare.siteB.domain}`, ML, 5.5)
    curY = 14
  }
  function ensureSpace(n: number) { if (curY + n > H - 14) newPage() }
  function divider() {
    curY += 2; doc.setDrawColor(...C.border); doc.setLineWidth(0.2)
    doc.line(ML, curY, W - MR, curY); curY += 4
  }
  function sectionTitle(title: string, color: RGB = C.cyan) {
    ensureSpace(14); doc.setFillColor(...color); doc.rect(ML, curY, 2, 6, 'F')
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.heading)
    doc.text(title.toUpperCase(), ML + 5, curY + 4.5); curY += 10
  }
  function compareRow(label: string, aVal: string, bVal: string, winner?: 'A' | 'B' | 'tie' | null) {
    ensureSpace(7)
    const aCol: RGB = winner === 'A' ? C.green : winner === 'B' ? C.red : C.heading
    const bCol: RGB = winner === 'B' ? C.green : winner === 'A' ? C.red : C.heading
    const colW = (CW - 50) / 2
    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.body)
    doc.text(safe(label), ML + 2, curY)
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...aCol)
    doc.text(safe(aVal), ML + 52 + colW, curY, { align: 'right' })
    doc.setTextColor(...bCol)
    doc.text(safe(bVal), ML + 52 + colW * 2 + 4, curY, { align: 'right' })
    if (winner === 'A') { doc.setFontSize(7); doc.setTextColor(...C.green); doc.text('WIN', ML + 54 + colW, curY) }
    if (winner === 'B') { doc.setFontSize(7); doc.setTextColor(...C.green); doc.text('WIN', ML + 56 + colW * 2 + 4, curY) }
    curY += 6.5
  }

  const { siteA, siteB, winner, seoWinner, geoWinner } = compare

  // ── COVER ──────────────────────────────────────────────────────────────
  fillPage()
  doc.setFillColor(...C.cyan); doc.rect(0, 0, W, 1.5, 'F')
  doc.setFillColor(...C.surface); doc.rect(0, 0, W, 30, 'F')
  doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.cyan)
  doc.text('SITESCOPE', ML, 13)
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.muted)
  doc.text('Competitor Comparison Report', ML, 19)
  doc.text(new Date().toLocaleString(), W - MR, 19, { align: 'right' })

  // Site badges
  const hw = (CW - 4) / 2
  doc.setFillColor(...C.card); doc.roundedRect(ML, 23, hw, 9, 2, 2, 'F')
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.cyan)
  doc.text(siteA.domain, ML + hw / 2, 28.5, { align: 'center' })
  doc.setFillColor(...C.card); doc.roundedRect(ML + hw + 4, 23, hw, 9, 2, 2, 'F')
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.lime)
  doc.text(siteB.domain, ML + hw + 4 + hw / 2, 28.5, { align: 'center' })
  curY = 38

  // Column headers
  const colW = (CW - 50) / 2
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.cyan)
  doc.text(siteA.domain.toUpperCase(), ML + 52 + colW, curY, { align: 'right' })
  doc.setTextColor(...C.lime)
  doc.text(siteB.domain.toUpperCase(), ML + 52 + colW * 2 + 4, curY, { align: 'right' })
  curY += 7
  doc.setDrawColor(...C.border); doc.setLineWidth(0.3); doc.line(ML, curY, W - MR, curY); curY += 5

  // Overall scores
  sectionTitle('Overall Scores', C.cyan)
  const overallWinner = siteA.overallScore > siteB.overallScore ? 'A' : siteB.overallScore > siteA.overallScore ? 'B' : 'tie'
  compareRow('Overall Score', `${siteA.overallScore}/100`, `${siteB.overallScore}/100`, overallWinner)
  compareRow('SEO Score', `${siteA.seo?.score || 0}/100`, `${siteB.seo?.score || 0}/100`, seoWinner)
  compareRow('GEO Score', `${siteA.geo?.score || 0}/100`, `${siteB.geo?.score || 0}/100`, geoWinner)
  compareRow('Grade', siteA.seo?.grade || '—', siteB.seo?.grade || '—',
    siteA.seo?.grade < siteB.seo?.grade ? 'A' : siteA.seo?.grade > siteB.seo?.grade ? 'B' : 'tie')
  divider()

  // Winner callout
  doc.setFillColor(...C.card); doc.roundedRect(ML, curY, CW, 14, 2, 2, 'F')
  doc.setFontSize(9); doc.setFont('helvetica', 'bold')
  if (winner === 'tie') {
    doc.setTextColor(...C.yellow); doc.text('TIE  —  Scores are very close', ML + CW / 2, curY + 8, { align: 'center' })
  } else {
    const wName = winner === 'A' ? siteA.domain : siteB.domain
    const wCol = winner === 'A' ? C.cyan : C.lime
    doc.setTextColor(...wCol); doc.text(`${wName.toUpperCase()}  WINS OVERALL`, ML + CW / 2, curY + 8, { align: 'center' })
  }
  curY += 18; divider()

  // ── SEO COMPARISON ──────────────────────────────────────────────────────
  sectionTitle('SEO Signals', C.cyan)
  compareRow('Word Count', `${siteA.seo?.wordCount || 0}`, `${siteB.seo?.wordCount || 0}`,
    (siteA.seo?.wordCount || 0) >= (siteB.seo?.wordCount || 0) ? 'A' : 'B')
  compareRow('Internal Links', `${siteA.seo?.links?.internal || 0}`, `${siteB.seo?.links?.internal || 0}`,
    (siteA.seo?.links?.internal || 0) >= (siteB.seo?.links?.internal || 0) ? 'A' : 'B')
  compareRow('Schema Types', `${siteA.seo?.schemaTypes?.length || 0}`, `${siteB.seo?.schemaTypes?.length || 0}`,
    (siteA.seo?.schemaTypes?.length || 0) >= (siteB.seo?.schemaTypes?.length || 0) ? 'A' : 'B')
  compareRow('HTTPS', siteA.seo?.ssl ? '✓ Yes' : '✗ No', siteB.seo?.ssl ? '✓ Yes' : '✗ No',
    siteA.seo?.ssl === siteB.seo?.ssl ? 'tie' : siteA.seo?.ssl ? 'A' : 'B')
  compareRow('Sitemap', siteA.seo?.sitemap?.exists ? '✓ Yes' : '✗ No', siteB.seo?.sitemap?.exists ? '✓ Yes' : '✗ No',
    siteA.seo?.sitemap?.exists === siteB.seo?.sitemap?.exists ? 'tie' : siteA.seo?.sitemap?.exists ? 'A' : 'B')
  compareRow('robots.txt', siteA.seo?.robotsTxt?.exists ? '✓ Yes' : '✗ No', siteB.seo?.robotsTxt?.exists ? '✓ Yes' : '✗ No',
    siteA.seo?.robotsTxt?.exists === siteB.seo?.robotsTxt?.exists ? 'tie' : siteA.seo?.robotsTxt?.exists ? 'A' : 'B')
  compareRow('Meta Description', siteA.seo?.description?.exists ? '✓ Yes' : '✗ No', siteB.seo?.description?.exists ? '✓ Yes' : '✗ No',
    siteA.seo?.description?.exists === siteB.seo?.description?.exists ? 'tie' : siteA.seo?.description?.exists ? 'A' : 'B')
  compareRow('H1 Tag', siteA.seo?.h1?.count === 1 ? '✓ Good' : `${siteA.seo?.h1?.count || 0} found`, siteB.seo?.h1?.count === 1 ? '✓ Good' : `${siteB.seo?.h1?.count || 0} found`,
    siteA.seo?.h1?.count === 1 && siteB.seo?.h1?.count !== 1 ? 'A' : siteB.seo?.h1?.count === 1 && siteA.seo?.h1?.count !== 1 ? 'B' : 'tie')
  divider()

  // ── SEO IMPROVEMENT AREAS ──────────────────────────────────────────────
  newPage()
  sectionTitle('Where You Need to Improve (vs Competitor)', C.red)
  const seoImprovements: string[] = []
  if ((siteA.seo?.wordCount || 0) < (siteB.seo?.wordCount || 0))
    seoImprovements.push(`Add ${(siteB.seo?.wordCount || 0) - (siteA.seo?.wordCount || 0)} more words — ${siteB.domain} has significantly more content depth`)
  if (!siteA.seo?.sitemap?.exists && siteB.seo?.sitemap?.exists)
    seoImprovements.push(`Create an XML sitemap — ${siteB.domain} has one and it helps crawling`)
  if (!siteA.seo?.description?.exists && siteB.seo?.description?.exists)
    seoImprovements.push(`Add a meta description — ${siteB.domain} has one, it improves click-through rates`)
  if ((siteA.seo?.schemaTypes?.length || 0) < (siteB.seo?.schemaTypes?.length || 0))
    seoImprovements.push(`Add ${(siteB.seo?.schemaTypes?.length || 0) - (siteA.seo?.schemaTypes?.length || 0)} more schema types — ${siteB.domain} uses: ${siteB.seo?.schemaTypes?.join(', ')}`)
  if ((siteA.seo?.images?.withoutAlt || 0) > (siteB.seo?.images?.withoutAlt || 0))
    seoImprovements.push(`Fix ${siteA.seo?.images?.withoutAlt} images missing alt text — ${siteB.domain} has better image accessibility`)
  if (!siteA.seo?.ssl && siteB.seo?.ssl)
    seoImprovements.push(`Enable HTTPS/SSL — ${siteB.domain} is secure, you are not (critical ranking factor)`)

  if (seoImprovements.length === 0) {
    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.green)
    doc.text('No major SEO gaps vs competitor detected', ML, curY); curY += 8
  } else {
    seoImprovements.forEach((item, i) => {
      ensureSpace(10)
      doc.setFillColor(...C.red); doc.circle(ML + 2, curY - 1, 1.5, 'F')
      doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.red)
      doc.text(`${i + 1}.`, ML + 5, curY)
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.body)
      const lines = doc.splitTextToSize(item, CW - 15)
      doc.text(lines, ML + 10, curY)
      curY += lines.length * 6 + 3
    })
  }
  divider()

  // ── GEO COMPARISON ──────────────────────────────────────────────────────
  sectionTitle('GEO / AI Readiness', C.lime)
  compareRow('GEO Score', `${siteA.geo?.score || 0}/100`, `${siteB.geo?.score || 0}/100`, geoWinner)
  compareRow('llms.txt', siteA.geo?.llmsTxt?.exists ? '✓ Yes' : '✗ No', siteB.geo?.llmsTxt?.exists ? '✓ Yes' : '✗ No',
    siteA.geo?.llmsTxt?.exists === siteB.geo?.llmsTxt?.exists ? 'tie' : siteA.geo?.llmsTxt?.exists ? 'A' : 'B')

  const aAICrawlers = [siteA.geo?.crawlerAccess?.gptBot, siteA.geo?.crawlerAccess?.claudeBot,
    siteA.geo?.crawlerAccess?.perplexityBot, siteA.geo?.crawlerAccess?.bingBot, siteA.geo?.crawlerAccess?.ccBot]
    .filter(v => v === 'allowed').length
  const bAICrawlers = [siteB.geo?.crawlerAccess?.gptBot, siteB.geo?.crawlerAccess?.claudeBot,
    siteB.geo?.crawlerAccess?.perplexityBot, siteB.geo?.crawlerAccess?.bingBot, siteB.geo?.crawlerAccess?.ccBot]
    .filter(v => v === 'allowed').length
  compareRow('AI Crawlers Allowed', `${aAICrawlers}/5`, `${bAICrawlers}/5`, aAICrawlers >= bAICrawlers ? 'A' : 'B')

  const aEEAT = Object.values(siteA.geo?.eeat || {}).filter(Boolean).length
  const bEEAT = Object.values(siteB.geo?.eeat || {}).filter(Boolean).length
  compareRow('E-E-A-T Signals', `${aEEAT}/9`, `${bEEAT}/9`, aEEAT >= bEEAT ? 'A' : 'B')

  compareRow('Google AI Score', `${siteA.geo?.platforms?.googleAI || 0}`, `${siteB.geo?.platforms?.googleAI || 0}`,
    (siteA.geo?.platforms?.googleAI || 0) >= (siteB.geo?.platforms?.googleAI || 0) ? 'A' : 'B')
  compareRow('ChatGPT Score', `${siteA.geo?.platforms?.chatgpt || 0}`, `${siteB.geo?.platforms?.chatgpt || 0}`,
    (siteA.geo?.platforms?.chatgpt || 0) >= (siteB.geo?.platforms?.chatgpt || 0) ? 'A' : 'B')
  compareRow('Perplexity Score', `${siteA.geo?.platforms?.perplexity || 0}`, `${siteB.geo?.platforms?.perplexity || 0}`,
    (siteA.geo?.platforms?.perplexity || 0) >= (siteB.geo?.platforms?.perplexity || 0) ? 'A' : 'B')
  divider()

  // ── GEO IMPROVEMENT AREAS ──────────────────────────────────────────────
  sectionTitle('GEO Gaps — How to Beat Competitor in AI Search', C.yellow)
  const geoImprovements: string[] = []
  if (!siteA.geo?.llmsTxt?.exists && siteB.geo?.llmsTxt?.exists)
    geoImprovements.push(`Create llms.txt — ${siteB.domain} has it, which tells AI crawlers what to include in training data`)
  if (aAICrawlers < bAICrawlers)
    geoImprovements.push(`Allow ${bAICrawlers - aAICrawlers} more AI crawlers in robots.txt — ${siteB.domain} permits more AI agents to crawl`)
  if (aEEAT < bEEAT)
    geoImprovements.push(`Improve ${bEEAT - aEEAT} more E-E-A-T signals — add author bios, privacy policy, contact page, security trust signals`)
  if (!siteA.geo?.aiSchema?.faq && siteB.geo?.aiSchema?.faq)
    geoImprovements.push(`Add FAQ schema — ${siteB.domain} has FAQ markup, which AI models use to generate featured answers`)
  if (!siteA.geo?.aiSchema?.organization && siteB.geo?.aiSchema?.organization)
    geoImprovements.push(`Add Organization schema with sameAs links — ${siteB.domain} has it, improving brand entity recognition in AI`)
  if ((siteA.geo?.platforms?.googleAI || 0) < (siteB.geo?.platforms?.googleAI || 0))
    geoImprovements.push(`Boost Google AI readiness: add more structured data, improve content freshness, ensure mobile-friendly pages`)
  if ((siteA.geo?.platforms?.chatgpt || 0) < (siteB.geo?.platforms?.chatgpt || 0))
    geoImprovements.push(`Improve ChatGPT visibility: add authoritative backlinks, Wikipedia presence, consistent NAP data`)

  if (geoImprovements.length === 0) {
    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.green)
    doc.text('No major GEO gaps vs competitor detected', ML, curY); curY += 8
  } else {
    geoImprovements.forEach((item, i) => {
      ensureSpace(10)
      doc.setFillColor(...C.yellow); doc.circle(ML + 2, curY - 1, 1.5, 'F')
      doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.yellow)
      doc.text(`${i + 1}.`, ML + 5, curY)
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.body)
      const lines = doc.splitTextToSize(item, CW - 15)
      doc.text(lines, ML + 10, curY)
      curY += lines.length * 6 + 3
    })
  }
  divider()

  // ── ISSUES BREAKDOWN ──────────────────────────────────────────────────────
  newPage()
  sectionTitle(`Top Issues — ${siteA.domain}`, C.red)
  const aIssues = [...(siteA.seo?.issues || []), ...(siteA.geo?.issues || [])].slice(0, 8)
  if (aIssues.length === 0) {
    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.green)
    doc.text('No major issues found', ML, curY); curY += 8
  } else {
    aIssues.forEach(issue => {
      ensureSpace(9)
      const col: RGB = issue.type === 'error' ? C.red : issue.type === 'warning' ? C.yellow : C.cyan
      doc.setFillColor(...col); doc.circle(ML + 2, curY - 1, 1.2, 'F')
      doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.body)
      const lines = doc.splitTextToSize(issue.message, CW - 20)
      doc.text(lines[0], ML + 6, curY)
      doc.setTextColor(...col); doc.setFontSize(7); doc.setFont('helvetica', 'bold')
      doc.text(issue.impact.toUpperCase(), W - MR, curY, { align: 'right' })
      curY += 6.5
    })
  }
  divider()

  sectionTitle(`Top Issues — ${siteB.domain}`, C.red)
  const bIssues = [...(siteB.seo?.issues || []), ...(siteB.geo?.issues || [])].slice(0, 8)
  if (bIssues.length === 0) {
    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.green)
    doc.text('No major issues found', ML, curY); curY += 8
  } else {
    bIssues.forEach(issue => {
      ensureSpace(9)
      const col: RGB = issue.type === 'error' ? C.red : issue.type === 'warning' ? C.yellow : C.cyan
      doc.setFillColor(...col); doc.circle(ML + 2, curY - 1, 1.2, 'F')
      doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.body)
      const lines = doc.splitTextToSize(issue.message, CW - 20)
      doc.text(lines[0], ML + 6, curY)
      doc.setTextColor(...col); doc.setFontSize(7); doc.setFont('helvetica', 'bold')
      doc.text(issue.impact.toUpperCase(), W - MR, curY, { align: 'right' })
      curY += 6.5
    })
  }

  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p); doc.setFillColor(...C.surface); doc.rect(0, H - 8, W, 8, 'F')
    doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.muted)
    doc.text('Generated by SiteScope  ·  sitescope.app', ML, H - 3)
    doc.text(`${p} / ${pageCount}`, W - MR, H - 3, { align: 'right' })
  }

  doc.save(`sitescope-compare-${siteA.domain}-vs-${siteB.domain}.pdf`)
}

// ─────────────────────────────────────────────────────────────────────────────
// BULK PDF
// ─────────────────────────────────────────────────────────────────────────────
export async function exportBulkPDF(results: import('./types').BulkResult[]): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  const W = 210, H = 297, ML = 14, MR = 14, MT = 14, CW = W - ML - MR
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  let curY = MT

  function fillPage() { doc.setFillColor(...C.bg); doc.rect(0, 0, W, H, 'F') }
  function newPage() {
    doc.addPage(); fillPage(); curY = MT
    doc.setFillColor(...C.surface); doc.rect(0, 0, W, 8, 'F')
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.muted)
    doc.text('SITESCOPE  ·  BULK AUDIT REPORT', ML, 5.5)
    curY = 14
  }
  function ensureSpace(n: number) { if (curY + n > H - 14) newPage() }
  function divider() {
    curY += 2; doc.setDrawColor(...C.border); doc.setLineWidth(0.2)
    doc.line(ML, curY, W - MR, curY); curY += 4
  }
  function sectionTitle(title: string, color: RGB = C.cyan) {
    ensureSpace(14); doc.setFillColor(...color); doc.rect(ML, curY, 2, 6, 'F')
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.heading)
    doc.text(title.toUpperCase(), ML + 5, curY + 4.5); curY += 10
  }

  // ── COVER ──────────────────────────────────────────────────────────────
  fillPage()
  doc.setFillColor(...C.cyan); doc.rect(0, 0, W, 1.5, 'F')
  doc.setFillColor(...C.surface); doc.rect(0, 0, W, 30, 'F')
  doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.cyan)
  doc.text('SITESCOPE', ML, 13)
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.muted)
  doc.text('Bulk Audit Report', ML, 19)
  doc.text(new Date().toLocaleString(), W - MR, 19, { align: 'right' })
  doc.setFillColor(...C.card); doc.roundedRect(ML, 23, CW, 8, 2, 2, 'F')
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.heading)
  doc.text(`${results.length} sites audited`, ML + 4, 28)
  curY = 38

  // Summary stats
  const successful = results.filter(r => !r.error)
  const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0
  const avgSEO = avg(successful.map(r => r.seoScore))
  const avgGEO = avg(successful.map(r => r.geoScore))
  const avgOverall = avg(successful.map(r => r.overallScore))

  sectionTitle('Summary', C.cyan)
  const summaryData: [string, string][] = [
    ['Sites Analyzed', `${results.length}`],
    ['Successful Audits', `${successful.length}`],
    ['Average SEO Score', `${avgSEO}/100`],
    ['Average GEO Score', `${avgGEO}/100`],
    ['Average Overall Score', `${avgOverall}/100`],
    ['Top Performers (A grade)', `${results.filter(r => r.grade === 'A').length} sites`],
    ['Needs Attention (D/F grade)', `${results.filter(r => r.grade === 'D' || r.grade === 'F').length} sites`],
  ]
  summaryData.forEach(([l, v]) => {
    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.body)
    doc.text(l, ML + 2, curY)
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.heading)
    doc.text(v, W - MR - 2, curY, { align: 'right' })
    curY += 6
  })
  divider()

  // Ranked table
  sectionTitle('Sites Ranked by Overall Score', C.lime)

  // Table header
  doc.setFillColor(...C.surface); doc.rect(ML, curY - 2, CW, 7, 'F')
  doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.muted)
  doc.text('#', ML + 2, curY + 3)
  doc.text('DOMAIN', ML + 10, curY + 3)
  doc.text('SEO', ML + 100, curY + 3)
  doc.text('GEO', ML + 120, curY + 3)
  doc.text('OVERALL', ML + 140, curY + 3)
  doc.text('GRADE', W - MR - 2, curY + 3, { align: 'right' })
  curY += 9

  const sorted = [...successful].sort((a, b) => b.overallScore - a.overallScore)
  sorted.forEach((r, i) => {
    ensureSpace(8)
    const gc = gradeColor(r.grade)
    if (i % 2 === 0) { doc.setFillColor(18, 24, 38); doc.rect(ML, curY - 3, CW, 7, 'F') }
    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal')
    doc.setTextColor(...C.muted); doc.text(`${i + 1}`, ML + 2, curY + 2)
    doc.setTextColor(...C.heading); doc.text(r.domain, ML + 10, curY + 2)
    doc.setTextColor(...scoreColor(r.seoScore)); doc.text(`${r.seoScore}`, ML + 100, curY + 2)
    doc.setTextColor(...scoreColor(r.geoScore)); doc.text(`${r.geoScore}`, ML + 120, curY + 2)
    doc.setTextColor(...scoreColor(r.overallScore)); doc.text(`${r.overallScore}`, ML + 140, curY + 2)
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...gc); doc.text(r.grade, W - MR - 2, curY + 2, { align: 'right' })
    curY += 7
  })
  divider()

  // ── IMPROVEMENT RECOMMENDATIONS ─────────────────────────────────────────
  newPage()
  sectionTitle('Improvement Recommendations by Site', C.yellow)

  const needsWork = sorted.filter(r => r.overallScore < 70)
  if (needsWork.length === 0) {
    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.green)
    doc.text('All sites are performing well (score ≥ 70)', ML, curY); curY += 8
  } else {
    needsWork.forEach(r => {
      ensureSpace(30)
      // Site header
      doc.setFillColor(...C.card); doc.roundedRect(ML, curY, CW, 9, 2, 2, 'F')
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...gradeColor(r.grade))
      doc.text(r.domain, ML + 4, curY + 6)
      doc.setFontSize(8); doc.setTextColor(...C.muted)
      doc.text(`SEO: ${r.seoScore}  GEO: ${r.geoScore}  Overall: ${r.overallScore}  Grade: ${r.grade}`, W - MR - 2, curY + 6, { align: 'right' })
      curY += 13

      // Top issue
      if (r.topIssue) {
        doc.setFillColor(...C.red); doc.circle(ML + 2, curY - 1, 1.2, 'F')
        doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.body)
        const lines = doc.splitTextToSize(r.topIssue, CW - 12)
        doc.text(lines, ML + 6, curY)
        curY += lines.length * 6 + 2
      }

      // Generic fixes based on score ranges
      const fixes: string[] = []
      if (r.seoScore < 50) fixes.push('SEO critical: Add meta description, fix title tag, check robots.txt and sitemap')
      else if (r.seoScore < 70) fixes.push('SEO needs work: Add schema markup, improve internal linking, optimize images with alt text')
      if (r.geoScore < 50) fixes.push('GEO critical: Allow AI crawlers in robots.txt, add llms.txt, implement FAQ + Organization schema')
      else if (r.geoScore < 70) fixes.push('GEO needs work: Improve E-E-A-T signals, add author info, boost content freshness')
      if (r.overallScore < 40) fixes.push('Priority: Enable HTTPS, create XML sitemap, add canonical tags, fix broken meta tags')

      fixes.forEach(fix => {
        ensureSpace(8)
        doc.setFillColor(...C.yellow); doc.circle(ML + 4, curY - 1, 1, 'F')
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.body)
        const fixLines = doc.splitTextToSize(fix, CW - 12)
        doc.text(fixLines, ML + 8, curY)
        curY += fixLines.length * 5.5 + 2
      })
      curY += 4
    })
  }

  // Failed sites
  const failed = results.filter(r => r.error)
  if (failed.length > 0) {
    divider()
    sectionTitle('Failed Audits', C.red)
    failed.forEach(r => {
      ensureSpace(7)
      doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.red); doc.text('FAIL', ML, curY)
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.body)
      doc.text(`${r.domain}  —  ${r.error}`, ML + 5, curY)
      curY += 6
    })
  }

  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p); doc.setFillColor(...C.surface); doc.rect(0, H - 8, W, 8, 'F')
    doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.muted)
    doc.text('Generated by SiteScope  ·  sitescope.app', ML, H - 3)
    doc.text(`${p} / ${pageCount}`, W - MR, H - 3, { align: 'right' })
  }

  doc.save(`sitescope-bulk-${results.length}sites.pdf`)
}
