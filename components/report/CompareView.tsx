'use client'

import { Trophy, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Zap } from 'lucide-react'
import type { CompareResult } from '@/lib/types'
import ScoreRing from '../ScoreRing'

function Diff({ a, b, label }: { a: number; b: number; label: string }) {
  const diff = a - b
  const winner = diff > 0 ? 'A' : diff < 0 ? 'B' : 'tie'
  return (
    <div className="grid grid-cols-3 items-center py-3 border-b border-border">
      <span className={`font-mono text-sm font-medium text-right ${winner === 'A' ? 'text-success' : 'text-body'}`}>{a}</span>
      <span className="text-center text-muted text-xs px-3">{label}</span>
      <span className={`font-mono text-sm font-medium text-left ${winner === 'B' ? 'text-success' : 'text-body'}`}>{b}</span>
    </div>
  )
}

function BoolRow({ a, b, label }: { a: boolean; b: boolean; label: string }) {
  return (
    <div className="grid grid-cols-3 items-center py-3 border-b border-border">
      <span className={`text-sm text-right ${a ? 'text-success' : 'text-error'}`}>{a ? '✓' : '✗'}</span>
      <span className="text-center text-muted text-xs px-3">{label}</span>
      <span className={`text-sm text-left ${b ? 'text-success' : 'text-error'}`}>{b ? '✓' : '✗'}</span>
    </div>
  )
}

function AuthorityGapSection({ siteA, siteB, domA, domB }: {
  siteA: CompareResult['siteA']
  siteB: CompareResult['siteB']
  domA: string
  domB: string
}) {
  const authA = siteA.authority
  const authB = siteB.authority

  // GEO gap rows — things site A is behind on
  type GeoGapRow = {
    label: string
    aVal: string | number | boolean
    bVal: string | number | boolean
    aWins: boolean
    bWins: boolean
    fix: string
  }

  const geoRows: GeoGapRow[] = [
    {
      label: 'AI Crawler Access',
      aVal: `${Object.values(siteA.geo?.crawlerAccess || {}).filter(v => v === 'allowed').length}/6`,
      bVal: `${Object.values(siteB.geo?.crawlerAccess || {}).filter(v => v === 'allowed').length}/6`,
      aWins: Object.values(siteA.geo?.crawlerAccess || {}).filter(v => v === 'allowed').length >= Object.values(siteB.geo?.crawlerAccess || {}).filter(v => v === 'allowed').length,
      bWins: Object.values(siteB.geo?.crawlerAccess || {}).filter(v => v === 'allowed').length > Object.values(siteA.geo?.crawlerAccess || {}).filter(v => v === 'allowed').length,
      fix: 'Update robots.txt to allow blocked AI bots (GPTBot, ClaudeBot, PerplexityBot)',
    },
    {
      label: 'Schema Types',
      aVal: `${Object.values(siteA.geo?.aiSchema || {}).filter(Boolean).length}/14`,
      bVal: `${Object.values(siteB.geo?.aiSchema || {}).filter(Boolean).length}/14`,
      aWins: Object.values(siteA.geo?.aiSchema || {}).filter(Boolean).length >= Object.values(siteB.geo?.aiSchema || {}).filter(Boolean).length,
      bWins: Object.values(siteB.geo?.aiSchema || {}).filter(Boolean).length > Object.values(siteA.geo?.aiSchema || {}).filter(Boolean).length,
      fix: 'Add missing schema types: Organization, FAQ, speakable, sameAs are highest priority',
    },
    {
      label: 'E-E-A-T Signals',
      aVal: `${Object.values(siteA.geo?.eeat || {}).filter(Boolean).length}/9`,
      bVal: `${Object.values(siteB.geo?.eeat || {}).filter(Boolean).length}/9`,
      aWins: Object.values(siteA.geo?.eeat || {}).filter(Boolean).length >= Object.values(siteB.geo?.eeat || {}).filter(Boolean).length,
      bWins: Object.values(siteB.geo?.eeat || {}).filter(Boolean).length > Object.values(siteA.geo?.eeat || {}).filter(Boolean).length,
      fix: 'Add About page, Contact page, author info, external citations to boost trust',
    },
    {
      label: 'llms.txt',
      aVal: siteA.geo?.llmsTxt?.exists ? (siteA.geo.llmsTxt.wellFormatted ? 'Well-formed' : 'Basic') : 'Missing',
      bVal: siteB.geo?.llmsTxt?.exists ? (siteB.geo.llmsTxt.wellFormatted ? 'Well-formed' : 'Basic') : 'Missing',
      aWins: (siteA.geo?.llmsTxt?.exists && siteA.geo.llmsTxt.wellFormatted) || (!siteB.geo?.llmsTxt?.exists && !!siteA.geo?.llmsTxt?.exists),
      bWins: (siteB.geo?.llmsTxt?.exists && siteB.geo.llmsTxt.wellFormatted) || (!siteA.geo?.llmsTxt?.exists && !!siteB.geo?.llmsTxt?.exists),
      fix: 'Create /llms.txt following the llmstxt.org spec to help AI understand your content',
    },
    {
      label: 'FAQ Schema',
      aVal: siteA.geo?.aiSchema?.faq ? '✓ Present' : '✗ Missing',
      bVal: siteB.geo?.aiSchema?.faq ? '✓ Present' : '✗ Missing',
      aWins: !!siteA.geo?.aiSchema?.faq,
      bWins: !!siteB.geo?.aiSchema?.faq && !siteA.geo?.aiSchema?.faq,
      fix: 'Add FAQPage JSON-LD schema — AI tools extract FAQ content for direct answers',
    },
    {
      label: 'Organization Schema',
      aVal: siteA.geo?.aiSchema?.organization ? '✓ Present' : '✗ Missing',
      bVal: siteB.geo?.aiSchema?.organization ? '✓ Present' : '✗ Missing',
      aWins: !!siteA.geo?.aiSchema?.organization,
      bWins: !!siteB.geo?.aiSchema?.organization && !siteA.geo?.aiSchema?.organization,
      fix: 'Add Organization JSON-LD with name, url, logo, sameAs to social profiles',
    },
    {
      label: 'Fresh Content',
      aVal: siteA.geo?.eeat?.hasFreshContent ? '✓ Detected' : '✗ None',
      bVal: siteB.geo?.eeat?.hasFreshContent ? '✓ Detected' : '✗ None',
      aWins: !!siteA.geo?.eeat?.hasFreshContent,
      bWins: !!siteB.geo?.eeat?.hasFreshContent && !siteA.geo?.eeat?.hasFreshContent,
      fix: 'Add datePublished/dateModified to Article schema. AI models weight recent content higher.',
    },
  ]

  // Authority rows (if data available)
  const authorityRows = authA && authB ? [
    {
      label: 'Domain Authority',
      aVal: authA.domainAuthority.available ? authA.domainAuthority.score + '/10' : 'N/A',
      bVal: authB.domainAuthority.available ? authB.domainAuthority.score + '/10' : 'N/A',
      aWins: authA.domainAuthority.score >= authB.domainAuthority.score,
      bWins: authB.domainAuthority.score > authA.domainAuthority.score,
      fix: 'Build backlinks from authoritative sites: guest posts, PR, directory submissions',
    },
    {
      label: 'Pages Indexed (CC)',
      aVal: authA.backlinks.available ? authA.backlinks.crawledPages.toLocaleString() : 'N/A',
      bVal: authB.backlinks.available ? authB.backlinks.crawledPages.toLocaleString() : 'N/A',
      aWins: authA.backlinks.crawledPages >= authB.backlinks.crawledPages,
      bWins: authB.backlinks.crawledPages > authA.backlinks.crawledPages,
      fix: 'Submit sitemap to Google Search Console and Common Crawl to boost crawl coverage',
    },
    {
      label: 'Knowledge Graph',
      aVal: authA.knowledgeGraph.exists ? '✓ In KG' : '✗ Missing',
      bVal: authB.knowledgeGraph.exists ? '✓ In KG' : '✗ Missing',
      aWins: authA.knowledgeGraph.exists,
      bWins: authB.knowledgeGraph.exists && !authA.knowledgeGraph.exists,
      fix: 'Add Organization schema with sameAs to LinkedIn, Wikipedia, Wikidata to earn a KG entry',
    },
    {
      label: 'Wikipedia Page',
      aVal: authA.wikipedia.exists ? '✓ ' + authA.wikipedia.title : '✗ None',
      bVal: authB.wikipedia.exists ? '✓ ' + authB.wikipedia.title : '✗ None',
      aWins: authA.wikipedia.exists,
      bWins: authB.wikipedia.exists && !authA.wikipedia.exists,
      fix: 'Earn press coverage and build notability — Wikipedia presence strongly signals trust to AI',
    },
  ] : []

  const behindRows = geoRows.filter(r => r.bWins)
  const winningRows = geoRows.filter(r => r.aWins && !r.bWins)

  return (
    <div className="space-y-4">
      {/* Authority comparison (if available) */}
      {authorityRows.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-heading font-mono text-sm uppercase tracking-wider mb-1 flex items-center gap-2">
            <Zap size={16} className="text-cyan-DEFAULT" />
            Authority Gap
          </h3>
          <p className="text-muted text-xs mb-4">Real authority signals from Open PageRank, Common Crawl, Wikipedia, and Google KG</p>
          <div className="grid grid-cols-3 mb-3 text-xs font-mono">
            <span className="text-cyan-DEFAULT font-medium truncate">{domA}</span>
            <span className="text-muted text-center">Signal</span>
            <span className="font-medium truncate text-right" style={{ color: '#AAFF3E' }}>{domB}</span>
          </div>
          <div className="space-y-0">
            {authorityRows.map((row, i) => (
              <div key={i} className="grid grid-cols-3 items-start py-3 text-xs" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <span className={`font-mono font-medium ${row.aWins && !row.bWins ? 'text-success' : row.bWins ? 'text-error' : 'text-body'}`}>{row.aVal}</span>
                  {row.bWins && <p className="text-muted mt-1 leading-relaxed" style={{ fontSize: '10px' }}>⚡ Fix: {row.fix}</p>}
                </div>
                <span className="text-muted text-center text-xs">{row.label}</span>
                <span className={`font-mono font-medium text-right ${row.bWins ? 'text-success' : row.aWins && !row.bWins ? 'text-error' : 'text-body'}`}>{row.bVal}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GEO gap analysis */}
      <div className="glass-card p-5">
        <h3 className="text-heading font-mono text-sm uppercase tracking-wider mb-1 flex items-center gap-2">
          <TrendingUp size={16} className="text-warning" />
          GEO Competitive Gap — Where to Improve
        </h3>
        <p className="text-muted text-xs mb-5">Areas where <span className="text-cyan-DEFAULT font-medium">{domA}</span> lags behind <span style={{ color: '#AAFF3E' }} className="font-medium">{domB}</span></p>

        {/* Falling behind */}
        {behindRows.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={13} className="text-error" />
              <p className="text-error text-xs font-mono uppercase tracking-wider">{domA} is losing in {behindRows.length} area{behindRows.length > 1 ? 's' : ''}</p>
            </div>
            <div className="space-y-2">
              {behindRows.map((row, i) => (
                <div key={i} className="p-3 rounded-lg" style={{ background: 'rgba(255,64,64,0.05)', border: '1px solid rgba(255,64,64,0.15)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-heading text-xs font-mono font-medium">{row.label}</span>
                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="text-error">{domA}: {row.aVal}</span>
                      <span className="text-success">{domB}: {row.bVal}</span>
                    </div>
                  </div>
                  <p className="text-muted text-xs leading-relaxed">→ {row.fix}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Winning areas */}
        {winningRows.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 size={13} className="text-success" />
              <p className="text-success text-xs font-mono uppercase tracking-wider">{domA} leads in {winningRows.length} area{winningRows.length > 1 ? 's' : ''} — keep it up</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {winningRows.map((row, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg text-xs" style={{ background: 'rgba(0,255,138,0.04)', border: '1px solid rgba(0,255,138,0.1)' }}>
                  <span className="text-body font-mono">{row.label}</span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-success font-medium">{row.aVal}</span>
                    <span className="text-muted">vs {row.bVal}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {behindRows.length === 0 && (
          <div className="text-center py-4">
            <CheckCircle2 size={24} className="text-success mx-auto mb-2" />
            <p className="text-success font-mono text-sm">🎉 {domA} leads or matches {domB} on all GEO signals!</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function CompareView({ result }: { result: CompareResult }) {
  const { siteA, siteB, winner, seoWinner, geoWinner } = result
  const domA = siteA.domain
  const domB = siteB.domain

  return (
    <div className="space-y-6">
      {/* Winner banner */}
      {winner !== 'tie' && (
        <div
          className="flex items-center justify-center gap-3 p-4 rounded-xl"
          style={{
            background: 'linear-gradient(135deg, rgba(170,255,62,0.08), rgba(0,212,255,0.08))',
            border: '1px solid rgba(170,255,62,0.2)',
          }}
        >
          <Trophy size={20} className="text-yellow-400" />
          <p className="text-heading font-mono text-sm">
            <span style={{ color: '#AAFF3E' }}>
              {winner === 'A' ? domA : domB}
            </span>{' '}
            wins the overall comparison
          </p>
          <Trophy size={20} className="text-yellow-400" />
        </div>
      )}

      {/* Score comparison */}
      <div className="glass-card p-6">
        <h3 className="text-heading font-mono text-sm uppercase tracking-wider mb-6 text-center">Overall Scores</h3>
        <div className="grid grid-cols-3 items-center gap-4">
          {/* Site A */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              {seoWinner === 'A' && <Trophy size={14} className="text-yellow-400" />}
              <p className="text-heading font-mono text-sm truncate max-w-[120px]">{domA}</p>
            </div>
            <ScoreRing score={siteA.overallScore} size={120} label="Overall" />
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-muted text-xs font-mono">SEO</p>
                <p className="font-display text-xl text-cyan-DEFAULT">{siteA.seo?.score || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-muted text-xs font-mono">GEO</p>
                <p className="font-display text-xl" style={{ color: '#AAFF3E' }}>{siteA.geo?.score || 0}</p>
              </div>
            </div>
          </div>

          {/* VS */}
          <div className="flex flex-col items-center gap-2">
            <span className="font-display text-4xl text-muted">VS</span>
            <div className="w-px h-16 bg-border" />
          </div>

          {/* Site B */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              {seoWinner === 'B' && <Trophy size={14} className="text-yellow-400" />}
              <p className="text-heading font-mono text-sm truncate max-w-[120px]">{domB}</p>
            </div>
            <ScoreRing score={siteB.overallScore} size={120} label="Overall" />
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-muted text-xs font-mono">SEO</p>
                <p className="font-display text-xl text-cyan-DEFAULT">{siteB.seo?.score || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-muted text-xs font-mono">GEO</p>
                <p className="font-display text-xl" style={{ color: '#AAFF3E' }}>{siteB.geo?.score || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed comparison */}
      <div className="glass-card p-5">
        <div className="grid grid-cols-3 mb-4">
          <p className="text-cyan-DEFAULT font-mono text-sm font-medium text-right truncate pr-4">{domA}</p>
          <p className="text-muted text-xs text-center">Metric</p>
          <p className="font-mono text-sm font-medium text-left truncate pl-4" style={{ color: '#AAFF3E' }}>{domB}</p>
        </div>

        <Diff a={siteA.seo?.score || 0} b={siteB.seo?.score || 0} label="SEO Score" />
        <Diff a={siteA.geo?.score || 0} b={siteB.geo?.score || 0} label="GEO Score" />
        <Diff a={siteA.seo?.performance || 0} b={siteB.seo?.performance || 0} label="Performance" />
        <Diff a={siteA.seo?.wordCount || 0} b={siteB.seo?.wordCount || 0} label="Word Count" />
        <Diff a={siteA.seo?.links?.internal || 0} b={siteB.seo?.links?.internal || 0} label="Internal Links" />
        <Diff a={siteA.seo?.schemaTypes?.length || 0} b={siteB.seo?.schemaTypes?.length || 0} label="Schema Types" />
        <Diff a={siteA.seo?.issues?.length || 0} b={siteB.seo?.issues?.length || 0} label="SEO Issues" />
        <Diff a={siteA.geo?.issues?.length || 0} b={siteB.geo?.issues?.length || 0} label="GEO Issues" />

        <BoolRow a={siteA.seo?.ssl || false} b={siteB.seo?.ssl || false} label="HTTPS" />
        <BoolRow a={siteA.seo?.sitemap?.exists || false} b={siteB.seo?.sitemap?.exists || false} label="XML Sitemap" />
        <BoolRow a={siteA.geo?.llmsTxt?.exists || false} b={siteB.geo?.llmsTxt?.exists || false} label="llms.txt" />
        <BoolRow a={siteA.geo?.aiSchema?.organization || false} b={siteB.geo?.aiSchema?.organization || false} label="Org Schema" />
        <BoolRow a={siteA.geo?.eeat?.hasAboutPage || false} b={siteB.geo?.eeat?.hasAboutPage || false} label="About Page" />
        <BoolRow a={siteA.geo?.eeat?.hasPrivacyPolicy || false} b={siteB.geo?.eeat?.hasPrivacyPolicy || false} label="Privacy Policy" />
      </div>

      {/* AI Platform comparison */}
      <div className="glass-card p-5">
        <h3 className="text-heading font-mono text-sm uppercase tracking-wider mb-2 text-center">AI Platform Readiness</h3>
        <p className="text-muted text-xs text-center mb-5">How well each site is optimised to appear in AI-generated answers</p>

        {/* Legend */}
        <div className="flex justify-between text-xs font-mono mb-4 px-1">
          <span className="text-cyan-DEFAULT font-medium truncate max-w-[120px]">{domA}</span>
          <span className="text-muted">Platform</span>
          <span className="font-medium truncate max-w-[120px] text-right" style={{ color: '#AAFF3E' }}>{domB}</span>
        </div>

        <div className="space-y-5">
          {[
            { name: 'Google AI Overviews', key: 'googleAI', icon: '🔍', tip: 'Ranked in Google AI-generated answers' },
            { name: 'ChatGPT Web Search', key: 'chatgpt', icon: '🤖', tip: 'Cited by ChatGPT when browsing the web' },
            { name: 'Perplexity AI', key: 'perplexity', icon: '⚡', tip: 'Sourced by Perplexity answers' },
            { name: 'Google Gemini', key: 'gemini', icon: '✨', tip: 'Used in Gemini AI responses' },
            { name: 'Bing Copilot', key: 'bingCopilot', icon: '🔷', tip: 'Cited by Bing Copilot' },
          ].map(({ name, key, icon, tip }) => {
            const aScore = (siteA.geo?.platforms?.[key as keyof typeof siteA.geo.platforms]) || 0
            const bScore = (siteB.geo?.platforms?.[key as keyof typeof siteB.geo.platforms]) || 0
            const diff = aScore - bScore
            const winner = diff > 5 ? 'A' : diff < -5 ? 'B' : 'tie'
            const aColor = winner === 'A' ? '#00FF8A' : winner === 'B' ? '#FF6B6B' : '#00D4FF'
            const bColor = winner === 'B' ? '#00FF8A' : winner === 'A' ? '#FF6B6B' : '#AAFF3E'
            const label = Math.abs(diff) > 30 ? (diff > 0 ? '↑ Much better' : '↓ Much worse')
              : Math.abs(diff) > 10 ? (diff > 0 ? '↑ Better' : '↓ Worse')
              : '≈ Similar'
            const labelColor = winner === 'A' ? '#00FF8A' : winner === 'B' ? '#FF6B6B' : '#FFB740'

            return (
              <div key={key}>
                {/* Platform header */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-base">{icon}</span>
                  <div className="text-center">
                    <p className="text-heading text-xs font-mono">{name}</p>
                    <p className="text-muted text-xs" style={{ fontSize: '10px' }}>{tip}</p>
                  </div>
                  <span className="text-xs font-mono font-medium" style={{ color: labelColor }}>{label}</span>
                </div>

                {/* Score bars side by side */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Site A bar */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-mono text-muted truncate">{domA}</span>
                      <span className="text-xs font-mono font-bold" style={{ color: aColor }}>{aScore}/100</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${aScore}%`, background: `linear-gradient(90deg, ${aColor}88, ${aColor})`, boxShadow: `0 0 6px ${aColor}60` }} />
                    </div>
                  </div>
                  {/* Site B bar */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-mono text-muted truncate">{domB}</span>
                      <span className="text-xs font-mono font-bold" style={{ color: bColor }}>{bScore}/100</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${bScore}%`, background: `linear-gradient(90deg, ${bColor}88, ${bColor})`, boxShadow: `0 0 6px ${bColor}60` }} />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Summary row */}
        <div className="mt-5 pt-4 grid grid-cols-2 gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          {[siteA, siteB].map((site, i) => {
            const platforms = site.geo?.platforms || {}
            const avg = Math.round(Object.values(platforms).reduce((s: number, v) => s + (v as number || 0), 0) / 5)
            const color = i === 0 ? '#00D4FF' : '#AAFF3E'
            return (
              <div key={i} className="text-center p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <p className="text-xs font-mono text-muted truncate">{i === 0 ? domA : domB}</p>
                <p className="font-display text-2xl mt-1" style={{ color }}>{avg}</p>
                <p className="text-xs text-muted mt-0.5">avg AI score</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Authority Gap Analysis */}
      <AuthorityGapSection siteA={siteA} siteB={siteB} domA={domA} domB={domB} />
    </div>
  )
}
