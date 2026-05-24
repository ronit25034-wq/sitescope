'use client'

import { Search, Lightbulb, TrendingUp, Brain, CheckCircle2, XCircle, ExternalLink } from 'lucide-react'
import type { AuthorityResult } from '@/lib/analyzers/authority'
import type { RankTrackingResult } from '@/lib/analyzers/rank-tracking'
import RankTrackingSection from './RankTrackingSection'

function ScoreBar({ value, max = 10, color = '#00D4FF' }: { value: number; max?: number; color?: string }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
      <div className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}60` }} />
    </div>
  )
}

function Chip({ label, color = '#00D4FF' }: { label: string; color?: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-mono"
      style={{ background: `${color}15`, color, border: `1px solid ${color}35` }}>
      {label}
    </span>
  )
}

function StatusBadge({ ok, yes, no }: { ok: boolean; yes: string; no: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-mono font-medium ${ok ? 'text-success' : 'text-error'}`}>
      {ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
      {ok ? yes : no}
    </span>
  )
}

export default function AuthoritySection({ authority, rankTracking, domain }: { authority: AuthorityResult; rankTracking?: RankTrackingResult; domain?: string }) {
  const { domainAuthority, backlinks, wikipedia, knowledgeGraph, keywordResearch } = authority

  const daColor = domainAuthority.score >= 6 ? '#00FF8A' : domainAuthority.score >= 3 ? '#FFB740' : '#FF6B6B'

  const typeColors: Record<string, string> = {
    semantic: '#00D4FF',
    trigger: '#AAFF3E',
    broader: '#FFB740',
    related: '#9B8FFF',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-heading text-2xl font-display tracking-wide">AUTHORITY & KEYWORD INTELLIGENCE</h2>
        <p className="text-muted text-sm mt-1">Powered by Open PageRank · Common Crawl · Google Knowledge Graph · Wikipedia · DataMuse — all free APIs</p>
      </div>

      {/* Top 4 metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

        {/* Domain Authority — only show when data is available */}
        {domainAuthority.available && (
          <div className="glass-card p-4 flex flex-col">
            <p className="text-muted text-xs font-mono uppercase tracking-wider mb-3">Domain Authority</p>
            <div className="flex-1">
              <div className="flex items-baseline gap-1 mb-1">
                <span className="font-display text-5xl" style={{ color: daColor }}>{domainAuthority.score}</span>
                <span className="text-muted text-sm font-mono">/10</span>
              </div>
              <p className="text-muted text-xs font-mono mb-2">≈ Moz DA · Ahrefs DR</p>
              <ScoreBar value={domainAuthority.score} max={10} color={daColor} />
              {domainAuthority.rank > 0 && (
                <p className="text-muted text-xs mt-2 font-mono">Global rank #{domainAuthority.rank.toLocaleString()}</p>
              )}
            </div>
          </div>
        )}

        {/* Pages Indexed */}
        <div className="glass-card p-4 flex flex-col">
          <p className="text-muted text-xs font-mono uppercase tracking-wider mb-3">Common Crawl Index</p>
          {backlinks.available ? (
            <div className="flex-1">
              <div className="flex items-baseline gap-1 mb-1">
                <span className="font-display text-5xl text-cyan-DEFAULT">{backlinks.crawledPages.toLocaleString()}</span>
              </div>
              <p className="text-muted text-xs font-mono mb-3">pages in CC snapshot</p>
              <div className="p-2.5 rounded-lg space-y-1.5" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">Est. backlinks</span>
                  <span className="text-heading font-mono">~{backlinks.estimatedBacklinks.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">Coverage</span>
                  <span className={`font-mono ${backlinks.crawledPages > 100 ? 'text-success' : backlinks.crawledPages > 20 ? 'text-warning' : 'text-error'}`}>
                    {backlinks.crawledPages > 100 ? 'Good' : backlinks.crawledPages > 20 ? 'Low' : 'Very Low'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center text-center gap-2 py-2">
              <span className="text-muted" style={{ fontSize: '2rem' }}>—</span>
              <p className="text-muted text-xs font-mono">Not in CC snapshot</p>
              <p className="text-muted leading-relaxed" style={{ fontSize: '10px' }}>Submit your sitemap to Google Search Console to increase crawl coverage</p>
            </div>
          )}
        </div>

        {/* Knowledge Graph */}
        <div className="glass-card p-4 flex flex-col">
          <p className="text-muted text-xs font-mono uppercase tracking-wider mb-3">Google Knowledge Graph</p>
          <div className="flex-1">
            <div className="mb-3">
              <StatusBadge ok={knowledgeGraph.exists} yes="Entity found" no="Not in KG" />
            </div>
            {knowledgeGraph.exists ? (
              <div className="space-y-2">
                <p className="text-heading text-xs font-medium truncate">{knowledgeGraph.name}</p>
                <div className="flex flex-wrap gap-1">
                  {knowledgeGraph.types.slice(0, 2).map(t => (
                    <Chip key={t} label={t} color="#00FF8A" />
                  ))}
                </div>
                <div className="p-2.5 rounded-lg" style={{ background: 'rgba(0,255,138,0.04)' }}>
                  <p className="text-muted text-xs font-mono mb-0.5">KG confidence score</p>
                  <p className="font-display text-2xl text-success">{knowledgeGraph.score.toLocaleString()}</p>
                </div>
                {knowledgeGraph.description && (
                  <p className="text-muted text-xs leading-relaxed line-clamp-2">{knowledgeGraph.description}</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="p-3 rounded-lg" style={{ background: 'rgba(255,107,107,0.05)', border: '1px solid rgba(255,107,107,0.15)' }}>
                  <p className="text-muted text-xs leading-relaxed">Not recognized as a brand entity. AI tools are less confident citing unknown entities.</p>
                </div>
                <p className="text-cyan-DEFAULT text-xs font-mono">Fix: Add Organization schema with <code>sameAs</code> links</p>
              </div>
            )}
          </div>
        </div>

        {/* Wikipedia */}
        <div className="glass-card p-4 flex flex-col">
          <p className="text-muted text-xs font-mono uppercase tracking-wider mb-3">Wikipedia Presence</p>
          <div className="flex-1">
            <div className="mb-3">
              <StatusBadge ok={wikipedia.exists} yes="Has Wikipedia page" no="No Wikipedia page" />
            </div>
            {wikipedia.exists ? (
              <div className="space-y-2">
                <p className="text-heading text-xs font-medium truncate">{wikipedia.title}</p>
                <p className="text-muted text-xs leading-relaxed line-clamp-3">{wikipedia.extract}</p>
                <a href={wikipedia.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-cyan-DEFAULT text-xs hover:underline">
                  View Wikipedia article <ExternalLink size={10} />
                </a>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="p-3 rounded-lg" style={{ background: 'rgba(255,183,64,0.05)', border: '1px solid rgba(255,183,64,0.15)' }}>
                  <p className="text-muted text-xs leading-relaxed">Wikipedia presence is a strong trust signal — AI models heavily weight Wikipedia-covered brands.</p>
                </div>
                <p className="text-warning text-xs font-mono">Fix: Earn press coverage to build notability</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Knowledge Graph detail */}
      {knowledgeGraph.exists && knowledgeGraph.detailedDescription && (
        <div className="glass-card p-5" style={{ borderColor: 'rgba(0,255,138,0.15)' }}>
          <h3 className="text-heading font-mono text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
            <Brain size={16} className="text-success" />
            Google Knowledge Graph — Entity Detail
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-muted text-xs font-mono mb-1">Entity Name</p>
              <p className="text-heading text-sm font-medium">{knowledgeGraph.name}</p>
            </div>
            <div>
              <p className="text-muted text-xs font-mono mb-1">Entity Types</p>
              <div className="flex flex-wrap gap-1">
                {knowledgeGraph.types.map(t => <Chip key={t} label={t} color="#00FF8A" />)}
              </div>
            </div>
            <div>
              <p className="text-muted text-xs font-mono mb-1">KG Confidence Score</p>
              <p className="font-display text-2xl text-success">{knowledgeGraph.score.toLocaleString()}</p>
            </div>
          </div>
          {knowledgeGraph.detailedDescription && (
            <div className="mt-3 p-3 rounded-lg" style={{ background: 'rgba(0,255,138,0.04)', border: '1px solid rgba(0,255,138,0.1)' }}>
              <p className="text-muted text-xs leading-relaxed">{knowledgeGraph.detailedDescription}</p>
            </div>
          )}
          <div className="mt-3 p-3 rounded-lg" style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.15)' }}>
            <p className="text-cyan-DEFAULT text-xs font-mono font-medium mb-1">💡 Why this matters for GEO</p>
            <p className="text-muted text-xs leading-relaxed">
              Being in Google's Knowledge Graph means AI models (Gemini, ChatGPT, Perplexity) can confidently identify your brand as a real entity.
              Sites with KG entries are cited significantly more in AI-generated answers than unrecognized brands.
            </p>
          </div>
        </div>
      )}

      {/* Keyword Research */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Keyword suggestions */}
        <div className="glass-card p-5">
          <h3 className="text-heading font-mono text-sm uppercase tracking-wider mb-1 flex items-center gap-2">
            <Search size={16} className="text-cyan-DEFAULT" />
            Keyword Ideas
          </h3>
          <p className="text-muted text-xs mb-4">Related terms for <strong className="text-heading">"{keywordResearch.primaryKeyword}"</strong> — powered by DataMuse (free, no key)</p>

          {keywordResearch.available ? (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {keywordResearch.suggestions.slice(0, 15).map((kw, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-muted text-xs font-mono w-4">{i + 1}</span>
                    <span className="text-body text-sm">{kw.word}</span>
                    <Chip label={kw.type} color={typeColors[kw.type] || '#9B8FFF'} />
                  </div>
                  <div className="w-16 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full" style={{
                      width: `${Math.min(100, (kw.score / (keywordResearch.suggestions[0]?.score || 1)) * 100)}%`,
                      background: typeColors[kw.type] || '#9B8FFF',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-sm">No keyword suggestions available.</p>
          )}

          <div className="mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-muted text-xs font-mono uppercase mb-2">LSI Keywords (semantic)</p>
            <div className="flex flex-wrap gap-1.5">
              {keywordResearch.lsiKeywords.map((kw, i) => (
                <Chip key={i} label={kw} color="#9B8FFF" />
              ))}
              {keywordResearch.lsiKeywords.length === 0 && (
                <p className="text-muted text-xs">None found</p>
              )}
            </div>
          </div>
        </div>

        {/* Content Opportunities + Tips */}
        <div className="space-y-4">
          <div className="glass-card p-5">
            <h3 className="text-heading font-mono text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
              <Lightbulb size={16} className="text-warning" />
              Content Opportunities
            </h3>
            <p className="text-muted text-xs mb-3">Answer these questions to get cited by AI tools:</p>
            <div className="space-y-2">
              {keywordResearch.questions.map((q, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg" style={{ background: 'rgba(255,183,64,0.05)', border: '1px solid rgba(255,183,64,0.1)' }}>
                  <span className="text-warning text-xs font-mono flex-shrink-0 mt-0.5">Q{i + 1}</span>
                  <p className="text-body text-xs">{q}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="text-heading font-mono text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
              <TrendingUp size={16} className="text-success" />
              Authority Improvement Tips
            </h3>
            <div className="space-y-2.5">
              {([
                !knowledgeGraph.exists && {
                  priority: 'HIGH', color: '#FF6B6B',
                  tip: 'Add Organization schema with sameAs to LinkedIn/Twitter — this helps Google create a KG entry',
                },
                !wikipedia.exists && {
                  priority: 'MEDIUM', color: '#FFB740',
                  tip: 'Get Wikipedia coverage — reach out to journalists or create a notable company profile',
                },
                !domainAuthority.available && {
                  priority: 'INFO', color: '#00D4FF',
                  tip: 'Add OPEN_PAGERANK_KEY to .env.local to see your domain authority score (free at openpagerank.com)',
                },
                {
                  priority: 'HIGH', color: '#FF6B6B',
                  tip: 'Create FAQ pages answering the Content Opportunities above — directly boosts AI citation rate',
                },
                keywordResearch.lsiKeywords.length > 0 && {
                  priority: 'MEDIUM', color: '#FFB740',
                  tip: `Add "${keywordResearch.lsiKeywords.slice(0, 3).join('", "')}" as semantic keywords in your content`,
                },
                !backlinks.available && {
                  priority: 'HIGH', color: '#FF6B6B',
                  tip: 'Low crawl coverage — submit your sitemap to Google Search Console to boost indexing',
                },
              ] as const).filter(Boolean).map((item: any, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="text-xs font-mono px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5"
                    style={{ background: `${item.color}15`, color: item.color, border: `1px solid ${item.color}30` }}>
                    {item.priority}
                  </span>
                  <p className="text-body text-xs leading-relaxed">{item.tip}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Rank Tracking — only show when connected or has data */}
      {(rankTracking?.connected || rankTracking?.available) && (
        <RankTrackingSection
          data={rankTracking}
          domain={domain ?? ''}
        />
      )}

      {/* Feature matrix vs Ahrefs/SEMrush */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.06), rgba(170,255,62,0.06))' }}>
          <p className="text-heading text-sm font-mono uppercase tracking-wider">📊 SiteScope vs Ahrefs vs SEMrush — Feature Matrix</p>
          <p className="text-muted text-xs mt-1">All SiteScope features use 100% free APIs — no credit card, no limits</p>
        </div>
        <div className="grid text-xs font-mono px-5 py-2.5" style={{ gridTemplateColumns: '2fr 1.2fr 1.2fr 1.4fr', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="text-muted uppercase tracking-wider">Feature</span>
          <span className="text-warning text-center">Ahrefs</span>
          <span style={{ color: '#FF9F43' }} className="text-center">SEMrush</span>
          <span className="text-success text-center">SiteScope</span>
        </div>
        {[
          { feature: 'Domain Authority', ahrefs: { val: 'Domain Rating', avail: true, note: '$99+/mo' }, semrush: { val: 'Authority Score', avail: true, note: '$119+/mo' }, us: { val: 'Open PageRank (free)', avail: true, note: 'FREE' } },
          { feature: 'Backlink Count', ahrefs: { val: 'Exact DB', avail: true, note: 'paid' }, semrush: { val: 'Backlink Analytics', avail: true, note: 'paid' }, us: { val: 'Common Crawl estimate', avail: true, note: 'FREE' } },
          { feature: 'Keyword Search Volume', ahrefs: { val: 'Full data', avail: true, note: 'paid' }, semrush: { val: 'Full data', avail: true, note: 'paid' }, us: { val: 'Not available', avail: false, note: 'paid API only' } },
          { feature: 'Keyword Semantic Ideas', ahrefs: { val: 'Keyword Explorer', avail: true, note: 'paid' }, semrush: { val: 'Keyword Magic', avail: true, note: 'paid' }, us: { val: 'DataMuse semantic + LSI', avail: true, note: 'FREE' } },
          { feature: 'Rank Tracking', ahrefs: { val: 'Full SERP tracking', avail: true, note: 'paid' }, semrush: { val: 'Position Tracking', avail: true, note: 'paid' }, us: { val: 'GSC keyword positions', avail: true, note: 'FREE · UNIQUE' } },
          { feature: 'Brand Entity (KG)', ahrefs: { val: '—', avail: false, note: 'N/A' }, semrush: { val: '—', avail: false, note: 'N/A' }, us: { val: 'Google KG API', avail: true, note: 'FREE · UNIQUE' } },
          { feature: 'Wikipedia Presence', ahrefs: { val: '—', avail: false, note: 'N/A' }, semrush: { val: '—', avail: false, note: 'N/A' }, us: { val: 'Wikipedia REST API', avail: true, note: 'FREE · UNIQUE' } },
          { feature: 'Full GEO / AI Audit', ahrefs: { val: '—', avail: false, note: 'N/A' }, semrush: { val: 'Partial (new)', avail: false, note: 'limited' }, us: { val: '14 schemas + 5 AI platforms', avail: true, note: 'FREE · UNIQUE' } },
          { feature: 'E-E-A-T Checker', ahrefs: { val: '—', avail: false, note: 'N/A' }, semrush: { val: '—', avail: false, note: 'N/A' }, us: { val: '9-signal E-E-A-T audit', avail: true, note: 'FREE · UNIQUE' } },
          { feature: 'llms.txt Check', ahrefs: { val: '—', avail: false, note: 'N/A' }, semrush: { val: '—', avail: false, note: 'N/A' }, us: { val: 'Full check + spec validation', avail: true, note: 'FREE · UNIQUE' } },
          { feature: 'Price', ahrefs: { val: '$99–$449/mo', avail: false, note: 'paid only' }, semrush: { val: '$119–$449/mo', avail: false, note: 'paid only' }, us: { val: '100% Free', avail: true, note: '✨ always free' } },
        ].map((row, i) => {
          const isUnique = !row.ahrefs.avail && !row.semrush.avail && row.us.avail
          const isWeakSpot = !row.us.avail
          return (
            <div key={row.feature} className="grid items-center px-5 py-3 text-xs"
              style={{
                gridTemplateColumns: '2fr 1.2fr 1.2fr 1.4fr',
                background: isUnique ? 'rgba(0,255,138,0.03)' : isWeakSpot ? 'rgba(255,107,107,0.02)' : i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}>
              <div>
                <span className="text-heading font-medium">{row.feature}</span>
                {isUnique && <span className="ml-2 text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,255,138,0.15)', color: '#00FF8A', border: '1px solid rgba(0,255,138,0.3)' }}>UNIQUE</span>}
                {isWeakSpot && <span className="ml-2 text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,107,107,0.15)', color: '#FF6B6B', border: '1px solid rgba(255,107,107,0.3)' }}>PAID ONLY</span>}
              </div>
              {[row.ahrefs, row.semrush, row.us].map((col, ci) => (
                <div key={ci} className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <span className={col.avail ? 'text-success' : 'text-error'}>{col.avail ? '✓' : '✗'}</span>
                    <span className={col.avail ? 'text-body' : 'text-muted'}>{col.val}</span>
                  </div>
                  <span className="font-mono" style={{ color: col.avail ? (ci === 2 ? '#00FF8A' : '#FFB740') : '#5A6478', fontSize: '10px' }}>{col.note}</span>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
