'use client'

import { useState } from 'react'
import { Download, ArrowLeft, Share2, RefreshCw, ExternalLink } from 'lucide-react'
import type { AuditResult, CompareResult, BulkResult } from '@/lib/types'
import ScoreRing from '../ScoreRing'
import SEOSection from './SEOSection'
import GEOSection from './GEOSection'
import CompareView from './CompareView'
import BulkView from './BulkView'
import ContentSection from './ContentSection'
import AuthoritySection from './AuthoritySection'

type Tab = 'overview' | 'seo' | 'geo' | 'content' | 'authority' | 'compare' | 'bulk'

interface ReportViewProps {
  mode: 'audit' | 'compare' | 'bulk'
  result?: AuditResult
  compareResult?: CompareResult
  bulkResults?: BulkResult[]
  onBack: () => void
  onRerun: () => void
}

export default function ReportView({
  mode, result, compareResult, bulkResults, onBack, onRerun
}: ReportViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>(
    mode === 'compare' ? 'compare' : mode === 'bulk' ? 'bulk' : 'overview'
  )
  const handleDownloadPDF = async () => {
    if (mode === 'compare' && compareResult) {
      const { exportComparePDF } = await import('@/lib/pdf-export')
      await exportComparePDF(compareResult)
    } else if (mode === 'bulk' && bulkResults) {
      const { exportBulkPDF } = await import('@/lib/pdf-export')
      await exportBulkPDF(bulkResults)
    } else if (result) {
      const { exportAuditPDF } = await import('@/lib/pdf-export')
      await exportAuditPDF(result)
    }
  }

  const tabs: Array<{ id: Tab; label: string }> = mode === 'audit'
    ? [{ id: 'overview', label: 'Overview' }, { id: 'seo', label: 'SEO' }, { id: 'geo', label: 'GEO' }, { id: 'content', label: '🧠 Content' }, { id: 'authority', label: '🔗 Authority' }]
    : mode === 'compare'
    ? [{ id: 'compare', label: 'Comparison' }]
    : [{ id: 'bulk', label: 'Bulk Results' }]

  const auditedAt = result?.auditedAt ? new Date(result.auditedAt).toLocaleString() : ''

  return (
    <div className="min-h-screen grid-bg">
      {/* Top bar */}
      <div
        className="sticky top-0 z-50 no-print"
        style={{ background: 'rgba(7,10,18,0.9)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-muted hover:text-heading transition-colors text-sm"
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <div className="w-px h-5 bg-border" />
            <div>
              {result && (
                <>
                  <p className="text-heading text-sm font-medium font-mono">{result.domain}</p>
                  <p className="text-muted text-xs">{auditedAt}</p>
                </>
              )}
              {compareResult && (
                <p className="text-heading text-sm font-mono">
                  {compareResult.siteA.domain} vs {compareResult.siteB.domain}
                </p>
              )}
              {bulkResults && (
                <p className="text-heading text-sm font-mono">{bulkResults.length} sites analyzed</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRerun}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-muted hover:text-heading text-sm transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <RefreshCw size={14} />
              Rerun
            </button>
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-80"
              style={{
                background: 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(170,255,62,0.2))',
                border: '1px solid rgba(0,212,255,0.4)',
                color: '#00D4FF',
              }}
            >
              <Download size={14} />
              Download PDF
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-4 flex gap-1 pb-3">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-mono transition-all ${
                activeTab === tab.id ? 'tab-active' : 'text-muted hover:text-heading'
              }`}
              style={{ border: '1px solid transparent' }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Overview tab */}
        {result && (
          <div data-tab-panel="overview" className="space-y-8" style={{ display: activeTab === 'overview' ? 'block' : 'none' }}>
            {/* Score hero */}
            <div
              className="rounded-2xl p-8 relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(0,212,255,0.05), rgba(170,255,62,0.05))',
                border: '1px solid rgba(0,212,255,0.15)',
              }}
            >
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.08), transparent)', transform: 'translate(30%, -30%)' }}
              />

              <div className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-8 items-center">
                <div className="md:col-span-2 flex flex-wrap justify-center md:justify-start gap-8">
                  <ScoreRing score={result.overallScore} size={150} label="Overall Score" sublabel="Combined SEO + GEO" />
                  <div className="flex flex-col justify-center gap-4">
                    <div>
                      <p className="text-muted text-xs font-mono uppercase mb-1">SEO Score</p>
                      <div className="flex items-baseline gap-2">
                        <span className="font-display text-4xl text-cyan-DEFAULT">{result.seo?.score || 0}</span>
                        <span className="text-muted font-mono">/100</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-muted text-xs font-mono uppercase mb-1">GEO Score</p>
                      <div className="flex items-baseline gap-2">
                        <span className="font-display text-4xl" style={{ color: '#AAFF3E' }}>{result.geo?.score || 0}</span>
                        <span className="text-muted font-mono">/100</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 grid grid-cols-2 gap-3">
                  {[
                    { label: 'Performance', value: result.seo?.performance, color: '#00D4FF' },
                    { label: 'Accessibility', value: result.seo?.accessibility, color: '#AAFF3E' },
                    { label: 'SEO (Lighthouse)', value: result.seo?.lighthouseSeo, color: '#00FF8A' },
                    { label: 'Best Practices', value: result.seo?.bestPractices, color: '#FFB740' },
                  ].map(m => {
                    const hasData = (m.value || 0) > 0
                    return (
                      <div key={m.label} className="glass-card p-3">
                        <p className="text-muted text-xs font-mono mb-1">{m.label}</p>
                        {hasData ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                              <div className="h-full rounded-full" style={{ width: `${m.value}%`, background: m.color }} />
                            </div>
                            <span className="font-mono text-xs font-medium" style={{ color: m.color }}>{m.value}</span>
                          </div>
                        ) : (
                          <p className="text-muted text-xs mt-1">Run Deep for PageSpeed data</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Stats row */}
              <div className="relative z-10 grid grid-cols-2 md:grid-cols-5 gap-3 mt-6 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <div>
                  <p className="text-muted text-xs font-mono">URL</p>
                  <a href={result.url} target="_blank" rel="noopener noreferrer"
                    className="text-cyan-DEFAULT text-sm font-mono flex items-center gap-1 hover:underline mt-0.5 truncate">
                    {result.domain} <ExternalLink size={11} />
                  </a>
                </div>
                <div>
                  <p className="text-muted text-xs font-mono">Depth</p>
                  <p className="text-heading text-sm font-mono mt-0.5 uppercase">{result.depth}</p>
                </div>
                <div>
                  <p className="text-muted text-xs font-mono">Load Time</p>
                  <p className="text-heading text-sm font-mono mt-0.5">{(result.loadTime / 1000).toFixed(1)}s</p>
                </div>
                <div>
                  <p className="text-muted text-xs font-mono">Total Issues</p>
                  <p className="text-error text-sm font-mono mt-0.5">{(result.seo?.issues?.length || 0) + (result.geo?.issues?.length || 0)} found</p>
                </div>
                <div>
                  <p className="text-muted text-xs font-mono">Passes</p>
                  <p className="text-success text-sm font-mono mt-0.5">{(result.seo?.passes?.length || 0) + (result.geo?.passes?.length || 0)} checks</p>
                </div>
              </div>
            </div>

            {/* AI Platform readiness preview */}
            <div className="glass-card p-6">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-heading font-mono text-sm uppercase tracking-wider">AI Platform Readiness</h3>
                <span className="text-muted text-xs font-mono">Score = crawler access + schema + E-E-A-T + llms.txt</span>
              </div>
              <p className="text-muted text-xs mb-5">How likely each AI is to <strong className="text-heading">cite your site</strong> in its answers. Each platform weighs signals differently.</p>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {[
                  { name: 'Google AI', icon: '🔍', score: result.geo?.platforms?.googleAI || 0, factors: 'Org Schema + Speakable + FAQ + About page + sameAs' },
                  { name: 'ChatGPT', icon: '🤖', score: result.geo?.platforms?.chatgpt || 0, factors: 'GPTBot allowed + Org Schema + llms.txt + FAQ Schema' },
                  { name: 'Perplexity', icon: '⚡', score: result.geo?.platforms?.perplexity || 0, factors: 'PerplexityBot allowed + Article Schema + External links + sameAs' },
                  { name: 'Gemini', icon: '✨', score: result.geo?.platforms?.gemini || 0, factors: 'Org Schema + Speakable + sameAs + About page' },
                  { name: 'Bing Copilot', icon: '🔷', score: result.geo?.platforms?.bingCopilot || 0, factors: 'Bingbot allowed + Org Schema + FAQ + Contact page' },
                ].map(p => {
                  const color = p.score >= 70 ? '#00FF8A' : p.score >= 45 ? '#FFB740' : '#FF4040'
                  const label = p.score >= 70 ? 'Good' : p.score >= 45 ? 'Needs work' : 'Poor'
                  return (
                    <div key={p.name} className="flex flex-col gap-2 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${color}22` }}>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{p.icon}</span>
                        <p className="text-heading text-sm font-medium">{p.name}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-display text-2xl" style={{ color }}>{p.score}</span>
                        <span className="text-xs font-mono px-2 py-0.5 rounded-full" style={{ background: `${color}20`, color }}>{label}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${p.score}%`, background: color, boxShadow: `0 0 6px ${color}60` }} />
                      </div>
                      <p className="text-muted leading-relaxed" style={{ fontSize: '10px' }}>Based on: {p.factors}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Quick issue summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Top SEO issues */}
              <div className="glass-card p-5">
                <h3 className="text-heading font-mono text-sm uppercase tracking-wider mb-4">Top SEO Issues</h3>
                <div className="space-y-2">
                  {(result.seo?.issues || []).slice(0, 4).map((issue, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className={`mt-0.5 flex-shrink-0 text-xs font-mono px-1.5 py-0.5 rounded ${
                        issue.type === 'error' ? 'badge-error' : 'badge-warning'
                      }`}>{issue.impact}</span>
                      <p className="text-body">{issue.message}</p>
                    </div>
                  ))}
                  {!result.seo?.issues?.length && <p className="text-success text-sm">No major SEO issues!</p>}
                </div>
              </div>

              {/* Top GEO issues */}
              <div className="glass-card p-5">
                <h3 className="text-heading font-mono text-sm uppercase tracking-wider mb-4">Top GEO Issues</h3>
                <div className="space-y-2">
                  {(result.geo?.issues || []).slice(0, 4).map((issue, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className={`mt-0.5 flex-shrink-0 text-xs font-mono px-1.5 py-0.5 rounded ${
                        issue.type === 'error' ? 'badge-error' : 'badge-warning'
                      }`}>{issue.impact}</span>
                      <p className="text-body">{issue.message}</p>
                    </div>
                  ))}
                  {!result.geo?.issues?.length && <p className="text-success text-sm">No major GEO issues!</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div data-tab-panel="seo" style={{ display: activeTab === 'seo' ? 'block' : 'none' }}>
            <SEOSection seo={result.seo} />
          </div>
        )}
        {result && (
          <div data-tab-panel="geo" style={{ display: activeTab === 'geo' ? 'block' : 'none' }}>
            <GEOSection geo={result.geo} />
          </div>
        )}
        {result && (
          <div data-tab-panel="content" style={{ display: activeTab === 'content' ? 'block' : 'none' }}>
            {result.content
              ? <ContentSection content={result.content} />
              : (
                <div className="glass-card p-8 text-center">
                  <p className="text-muted text-lg font-mono">Content analysis not available for this audit.</p>
                  <p className="text-muted text-sm mt-2">Re-run the audit to generate content analysis.</p>
                </div>
              )
            }
          </div>
        )}
        {result && (
          <div data-tab-panel="authority" style={{ display: activeTab === 'authority' ? 'block' : 'none' }}>
            {result.authority
              ? <AuthoritySection authority={result.authority} rankTracking={result.rankTracking} domain={result.domain} />
              : (
                <div className="glass-card p-8 text-center">
                  <p className="text-muted text-lg font-mono">Authority data not available.</p>
                  <p className="text-muted text-sm mt-2">Authority analysis runs after main audit — try re-running.</p>
                </div>
              )
            }
          </div>
        )}
        {compareResult && (
          <div data-tab-panel="compare" style={{ display: activeTab === 'compare' ? 'block' : 'none' }}>
            <CompareView result={compareResult} />
          </div>
        )}
        {bulkResults && (
          <div data-tab-panel="bulk" style={{ display: activeTab === 'bulk' ? 'block' : 'none' }}>
            <BulkView results={bulkResults} />
          </div>
        )}
      </div>
    </div>
  )
}
