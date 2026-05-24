'use client'

import { CheckCircle2, XCircle, AlertCircle, Info, BookOpen, Search, TrendingUp, Clock, Link2, Zap, Brain, Target } from 'lucide-react'
import type { ContentResult } from '@/lib/analyzers/content'

function IssueItem({ issue }: { issue: { type: string; message: string; impact: string; fix?: string } }) {
  const icon = issue.type === 'error' ? <XCircle size={14} className="text-error flex-shrink-0 mt-0.5" />
    : issue.type === 'warning' ? <AlertCircle size={14} className="text-warning flex-shrink-0 mt-0.5" />
    : <Info size={14} className="text-cyan-DEFAULT flex-shrink-0 mt-0.5" />
  return (
    <div className="flex gap-3 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-heading">{issue.message}</p>
        {issue.fix && <p className="text-xs text-muted mt-1">{issue.fix}</p>}
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full font-mono flex-shrink-0 h-fit ${
        issue.impact === 'high' ? 'badge-error' : issue.impact === 'medium' ? 'badge-warning' : 'badge-info'
      }`}>{issue.impact}</span>
    </div>
  )
}

function ScoreCard({ label, value, max = 100, color, icon, sub }: {
  label: string; value: number; max?: number; color?: string; icon: React.ReactNode; sub?: string
}) {
  const c = color || (value >= 70 ? '#00FF8A' : value >= 45 ? '#FFB740' : '#FF4040')
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <span style={{ color: c }}>{icon}</span>
        <p className="text-muted text-xs font-mono uppercase tracking-wider">{label}</p>
      </div>
      <div className="flex items-baseline gap-1 mb-2">
        <span className="font-display text-3xl" style={{ color: c }}>{value}</span>
        <span className="text-muted text-sm font-mono">/{max}</span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(value / max) * 100}%`, background: c, boxShadow: `0 0 8px ${c}60` }} />
      </div>
      {sub && <p className="text-muted text-xs mt-1.5">{sub}</p>}
    </div>
  )
}

function IntentBadge({ intent, confidence }: { intent: string; confidence: number }) {
  const config: Record<string, { icon: string; color: string; desc: string }> = {
    informational: { icon: '📖', color: '#00D4FF', desc: 'Users want to learn or research' },
    transactional:  { icon: '🛒', color: '#00FF8A', desc: 'Users want to buy or take action' },
    navigational:   { icon: '🧭', color: '#FFB740', desc: 'Users are looking for a specific page' },
    commercial:     { icon: '🔍', color: '#AAFF3E', desc: 'Users are comparing before buying' },
  }
  const cfg = config[intent] || config.informational
  return (
    <div className="glass-card p-5">
      <h3 className="text-heading font-mono text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
        <Target size={16} className="text-cyan-DEFAULT" />
        Search Intent
      </h3>
      <div className="flex items-center gap-4">
        <span className="text-4xl">{cfg.icon}</span>
        <div>
          <p className="font-display text-2xl" style={{ color: cfg.color }}>{intent.toUpperCase()}</p>
          <p className="text-muted text-sm mt-0.5">{cfg.desc}</p>
          <div className="flex items-center gap-2 mt-2">
            <div className="h-1.5 w-24 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-full rounded-full" style={{ width: `${confidence}%`, background: cfg.color }} />
            </div>
            <span className="text-xs font-mono" style={{ color: cfg.color }}>{confidence}% confidence</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function KeywordRow({ keyword, count, density, isPrimary }: { keyword: string; count: number; density: number; isPrimary?: boolean }) {
  const barWidth = Math.min(100, density * 20)
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border">
      <div className="flex-1 min-w-0 flex items-center gap-2">
        {isPrimary && <span className="text-xs font-mono px-1.5 py-0.5 rounded badge-pass flex-shrink-0">PRIMARY</span>}
        <span className="text-heading text-sm truncate">{keyword}</span>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="w-20 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full bg-cyan-DEFAULT" style={{ width: `${barWidth}%` }} />
        </div>
        <span className="text-muted text-xs font-mono w-10 text-right">{count}×</span>
        <span className="text-cyan-DEFAULT text-xs font-mono w-12 text-right">{density}%</span>
      </div>
    </div>
  )
}

export default function ContentSection({ content }: { content: ContentResult }) {
  const errors = content.issues?.filter(i => i.type === 'error') || []
  const warnings = content.issues?.filter(i => i.type === 'warning') || []

  const freshnessColor = content.freshnessScore >= 70 ? '#00FF8A' : content.freshnessScore >= 45 ? '#FFB740' : '#FF4040'
  const freshnessLabel = content.ageInDays < 0 ? 'Unknown' : content.ageInDays === 0 ? 'Today' : content.ageInDays < 30 ? `${content.ageInDays}d ago` : content.ageInDays < 365 ? `${Math.round(content.ageInDays / 30)}mo ago` : `${Math.round(content.ageInDays / 365)}yr ago`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-heading text-2xl font-display tracking-wide">CONTENT ANALYSIS</h2>
          <p className="text-muted text-sm mt-1 flex items-center gap-3">
            Content quality, keywords, freshness & topical authority
            {content.poweredByFirecrawl && (
              <span className="text-xs font-mono px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,183,64,0.1)', border: '1px solid rgba(255,183,64,0.3)', color: '#FFB740' }}>
                ⚡ Firecrawl
              </span>
            )}
            {content.poweredByScrapegraph && (
              <span className="text-xs font-mono px-2 py-0.5 rounded-full" style={{ background: 'rgba(170,255,62,0.1)', border: '1px solid rgba(170,255,62,0.3)', color: '#AAFF3E' }}>
                🧠 ScrapegraphAI
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-muted text-xs font-mono uppercase mb-1">Errors</p>
            <p className="text-error font-display text-2xl">{errors.length}</p>
          </div>
          <div className="text-center">
            <p className="text-muted text-xs font-mono uppercase mb-1">Warnings</p>
            <p className="text-warning font-display text-2xl">{warnings.length}</p>
          </div>
          <div className="text-center">
            <p className="text-muted text-xs font-mono uppercase mb-1">Passed</p>
            <p className="font-display text-2xl" style={{ color: '#00FF8A' }}>{content.passes?.length || 0}</p>
          </div>
        </div>
      </div>

      {/* Score cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ScoreCard label="Content Quality" value={content.contentQualityScore} icon={<Brain size={16} />} sub={content.contentType} />
        <ScoreCard label="Readability" value={content.readabilityScore} icon={<BookOpen size={16} />} sub={content.readabilityGrade} />
        <ScoreCard label="Freshness" value={content.freshnessScore} icon={<Clock size={16} />} color={freshnessColor} sub={freshnessLabel} />
        <ScoreCard label="Topical Authority" value={content.topicalAuthorityScore} icon={<TrendingUp size={16} />} sub={`${content.pagesAnalyzed} pages analyzed`} />
      </div>

      {/* AI Analysis feedback */}
      {content.poweredByScrapegraph && content.contentQualityFeedback && content.contentQualityFeedback !== 'Run deep analysis for AI-powered content feedback.' && (
        <div className="glass-card p-5" style={{ border: '1px solid rgba(170,255,62,0.15)' }}>
          <h3 className="text-heading font-mono text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
            <Brain size={16} style={{ color: '#AAFF3E' }} />
            AI Content Insight
            <span className="text-xs font-mono ml-2 px-2 py-0.5 rounded-full" style={{ background: 'rgba(170,255,62,0.1)', color: '#AAFF3E', border: '1px solid rgba(170,255,62,0.2)' }}>ScrapegraphAI</span>
          </h3>
          <p className="text-body leading-relaxed">{content.contentQualityFeedback}</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
            <div>
              <p className="text-muted text-xs font-mono">Content Type</p>
              <p className="text-heading text-sm mt-0.5 capitalize">{content.contentType}</p>
            </div>
            <div>
              <p className="text-muted text-xs font-mono">Target Audience</p>
              <p className="text-heading text-sm mt-0.5">{content.targetAudience}</p>
            </div>
            <div>
              <p className="text-muted text-xs font-mono">Reading Level</p>
              <p className="text-heading text-sm mt-0.5">{content.readingLevel}</p>
            </div>
          </div>
          {content.missingElements?.length > 0 && (
            <div className="mt-4 p-3 rounded-lg" style={{ background: 'rgba(255,183,64,0.06)', border: '1px solid rgba(255,183,64,0.15)' }}>
              <p className="text-warning text-xs font-mono uppercase mb-2">Content Gaps</p>
              <ul className="space-y-1">
                {content.missingElements.map((el, i) => (
                  <li key={i} className="text-sm text-body flex items-center gap-2"><span className="text-warning">→</span>{el}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Intent + Readability */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <IntentBadge intent={content.searchIntent} confidence={content.intentConfidence} />

        <div className="glass-card p-5">
          <h3 className="text-heading font-mono text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
            <BookOpen size={16} className="text-cyan-DEFAULT" />
            Readability Breakdown
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-body text-sm">Flesch Score</span>
              <span className="font-mono font-medium" style={{ color: content.readabilityScore >= 60 ? '#00FF8A' : '#FFB740' }}>{content.readabilityScore}/100</span>
            </div>
            <div className="flex justify-between">
              <span className="text-body text-sm">Grade Level</span>
              <span className="font-mono text-heading">{content.readabilityGrade}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-body text-sm">Avg Sentence Length</span>
              <span className="font-mono text-heading">{content.avgSentenceLength} words</span>
            </div>
            <div className="flex justify-between">
              <span className="text-body text-sm">Avg Syllables/Word</span>
              <span className="font-mono text-heading">{content.avgSyllablesPerWord}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-body text-sm">Reading Level</span>
              <span className="font-mono text-heading">{content.readingLevel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Keyword Analysis */}
      <div className="glass-card p-5">
        <h3 className="text-heading font-mono text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
          <Search size={16} className="text-cyan-DEFAULT" />
          Keyword Research & Analysis
          {content.poweredByScrapegraph && <span className="text-xs font-mono px-2 py-0.5 rounded-full ml-2" style={{ background: 'rgba(170,255,62,0.1)', color: '#AAFF3E', border: '1px solid rgba(170,255,62,0.2)' }}>AI-powered</span>}
        </h3>

        {/* Primary keyword presence */}
        <div className="p-4 rounded-xl mb-5" style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.15)' }}>
          <p className="text-muted text-xs font-mono uppercase mb-2">Primary Keyword Detected</p>
          <p className="text-heading text-xl font-mono font-medium mb-3">"{content.primaryKeyword}"</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'In Title', ok: content.keywordInTitle },
              { label: 'In H1', ok: content.keywordInH1 },
              { label: 'In URL', ok: content.keywordInUrl },
              { label: 'In Meta Desc', ok: content.keywordInMetaDesc },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2">
                <span className={item.ok ? 'text-success' : 'text-error'}>{item.ok ? '✓' : '✗'}</span>
                <span className="text-body text-sm">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Secondary keywords */}
        {content.secondaryKeywords?.length > 0 && (
          <div className="mb-5">
            <p className="text-muted text-xs font-mono uppercase mb-2">Secondary Keywords</p>
            <div className="flex flex-wrap gap-2">
              {content.secondaryKeywords.map((kw, i) => (
                <span key={i} className="px-3 py-1 rounded-full text-xs font-mono text-body" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>{kw}</span>
              ))}
            </div>
          </div>
        )}

        {/* LSI keywords */}
        {content.lsiKeywords?.length > 0 && (
          <div className="mb-5">
            <p className="text-muted text-xs font-mono uppercase mb-2">LSI / Semantic Keywords</p>
            <div className="flex flex-wrap gap-2">
              {content.lsiKeywords.map((kw, i) => (
                <span key={i} className="px-3 py-1 rounded-full text-xs font-mono" style={{ background: 'rgba(170,255,62,0.06)', border: '1px solid rgba(170,255,62,0.2)', color: '#AAFF3E' }}>{kw}</span>
              ))}
            </div>
          </div>
        )}

        {/* Keyword density table */}
        <div>
          <p className="text-muted text-xs font-mono uppercase mb-3">Top Keywords by Frequency</p>
          <div>
            <div className="flex items-center gap-3 pb-2 border-b border-border">
              <p className="flex-1 text-xs font-mono text-muted uppercase">Keyword</p>
              <p className="text-xs font-mono text-muted uppercase w-20 text-right">Count</p>
              <p className="text-xs font-mono text-muted uppercase w-12 text-right">Density</p>
            </div>
            {content.topKeywordsLocal.slice(0, 12).map((kw, i) => (
              <KeywordRow key={i} keyword={kw.keyword} count={kw.count} density={kw.density} isPrimary={i === 0 && kw.keyword === content.primaryKeyword} />
            ))}
          </div>
        </div>

        {/* Missing keyword opportunities */}
        {content.missingKeywords?.length > 0 && (
          <div className="mt-4 p-3 rounded-lg" style={{ background: 'rgba(255,183,64,0.05)', border: '1px solid rgba(255,183,64,0.15)' }}>
            <p className="text-warning text-xs font-mono uppercase mb-2">Keyword Opportunities You're Missing</p>
            <div className="flex flex-wrap gap-2">
              {content.missingKeywords.map((kw, i) => (
                <span key={i} className="px-3 py-1 rounded-full text-xs font-mono text-warning" style={{ background: 'rgba(255,183,64,0.1)', border: '1px solid rgba(255,183,64,0.2)' }}>+ {kw}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Content Freshness — only render when we have real data */}
      {(content.lastModified || (content.ageInDays >= 0 && content.freshnessSource && content.freshnessSource !== 'unknown')) && (
        <div className="glass-card p-5">
          <h3 className="text-heading font-mono text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
            <Clock size={16} className="text-cyan-DEFAULT" />
            Content Freshness
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              {content.lastModified && (
                <div className="flex justify-between">
                  <span className="text-body text-sm">Last Modified</span>
                  <span className="font-mono text-heading text-sm">{new Date(content.lastModified).toLocaleDateString()}</span>
                </div>
              )}
              {content.ageInDays >= 0 && (
                <div className="flex justify-between">
                  <span className="text-body text-sm">Content Age</span>
                  <span className="font-mono text-sm" style={{ color: freshnessColor }}>{freshnessLabel}</span>
                </div>
              )}
              {content.freshnessSource && content.freshnessSource !== 'unknown' && (
                <div className="flex justify-between">
                  <span className="text-body text-sm">Detected Via</span>
                  <span className="font-mono text-heading text-sm capitalize">{content.freshnessSource}</span>
                </div>
              )}
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-body text-sm">Freshness Score</span>
                <span className="font-mono text-sm font-medium" style={{ color: freshnessColor }}>{content.freshnessScore}/100</span>
              </div>
              <div className="h-3 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${content.freshnessScore}%`, background: freshnessColor, boxShadow: `0 0 8px ${freshnessColor}60` }} />
              </div>
              <p className="text-muted text-xs mt-2">
                {content.freshnessScore >= 85 ? '✓ Great — search engines love fresh content' :
                 content.freshnessScore >= 55 ? '⚠ Acceptable — consider updating soon' :
                 '✗ Stale content — update to regain rankings'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Topical Authority */}
      {content.pagesAnalyzed > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-heading font-mono text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-cyan-DEFAULT" />
            Topical Authority
            <span className="text-xs font-mono ml-2 px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,183,64,0.1)', color: '#FFB740', border: '1px solid rgba(255,183,64,0.2)' }}>⚡ Firecrawl</span>
          </h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <p className="text-muted text-xs font-mono mb-1">Pages Crawled</p>
              <p className="font-display text-2xl text-cyan-DEFAULT">{content.pagesAnalyzed}</p>
            </div>
            <div className="text-center p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <p className="text-muted text-xs font-mono mb-1">Topics Found</p>
              <p className="font-display text-2xl" style={{ color: '#AAFF3E' }}>{content.topicsFound.length}</p>
            </div>
            <div className="text-center p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <p className="text-muted text-xs font-mono mb-1">Avg Words/Page</p>
              <p className="font-display text-2xl text-warning">{content.avgWordsPerPage}</p>
            </div>
          </div>
          {content.topicsFound.length > 0 && (
            <div>
              <p className="text-muted text-xs font-mono uppercase mb-2">Detected Topic Clusters</p>
              <div className="flex flex-wrap gap-2">
                {content.topicsFound.map((t, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-full text-xs font-mono text-body capitalize" style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)' }}>{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Issues & Passes */}
      {content.issues?.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-heading font-mono text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
            <AlertCircle size={16} className="text-warning" />
            Issues Found ({content.issues.length})
          </h3>
          <div className="space-y-2">
            {content.issues.map((issue, i) => <IssueItem key={i} issue={issue} />)}
          </div>
        </div>
      )}

      {content.passes?.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-heading font-mono text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-success" />
            Passing Checks ({content.passes.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {content.passes.map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <CheckCircle2 size={13} className="text-success flex-shrink-0" />
                <span className="text-body">{p}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
