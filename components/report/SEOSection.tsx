'use client'

import { CheckCircle2, XCircle, AlertCircle, Info, Globe, Zap, Link2, Image, Code2, FileText } from 'lucide-react'
import type { SEOResult } from '@/lib/types'
import ScoreRing from '../ScoreRing'
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from 'recharts'

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${ok ? 'bg-success' : 'bg-error'}`}
    />
  )
}

function IssueItem({ issue }: { issue: { type: string; message: string; impact: string; fix?: string } }) {
  const icon = issue.type === 'error' ? (
    <XCircle size={14} className="text-error flex-shrink-0 mt-0.5" />
  ) : issue.type === 'warning' ? (
    <AlertCircle size={14} className="text-warning flex-shrink-0 mt-0.5" />
  ) : (
    <Info size={14} className="text-cyan-DEFAULT flex-shrink-0 mt-0.5" />
  )

  const badgeClass = issue.type === 'error' ? 'badge-error' : issue.type === 'warning' ? 'badge-warning' : 'badge-info'

  return (
    <div className="flex gap-3 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-heading">{issue.message}</p>
        {issue.fix && <p className="text-xs text-muted mt-1">{issue.fix}</p>}
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full font-mono flex-shrink-0 h-fit ${badgeClass}`}>
        {issue.impact}
      </span>
    </div>
  )
}

function MetricCard({ label, value, unit, color = '#00D4FF', description }: {
  label: string; value: string | number; unit?: string; color?: string; description?: string
}) {
  return (
    <div className="glass-card p-4">
      <p className="text-muted text-xs uppercase tracking-wider font-mono mb-2">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="font-display text-3xl" style={{ color }}>{value}</span>
        {unit && <span className="text-muted text-sm font-mono">{unit}</span>}
      </div>
      {description && <p className="text-muted text-xs mt-1">{description}</p>}
    </div>
  )
}

export default function SEOSection({ seo }: { seo: SEOResult }) {
  const cwvData = [
    { name: 'Performance', value: seo.performance, fill: '#00D4FF' },
    { name: 'Accessibility', value: seo.accessibility, fill: '#AAFF3E' },
    { name: 'Best Practices', value: seo.bestPractices, fill: '#FFB740' },
    { name: 'SEO', value: seo.lighthouseSeo, fill: '#00FF8A' },
  ]

  const lcpMs = seo.coreWebVitals?.lcp || 0
  const fcpMs = seo.coreWebVitals?.fcp || 0
  const cls = seo.coreWebVitals?.cls || 0
  const tbt = seo.coreWebVitals?.tbt || 0
  const ttfb = seo.coreWebVitals?.ttfb || 0

  const lcpOk = lcpMs < 2500
  const fcpOk = fcpMs < 1800
  const clsOk = cls < 0.1
  const tbtOk = tbt < 200
  const ttfbOk = ttfb < 800

  const errors = seo.issues?.filter(i => i.type === 'error') || []
  const warnings = seo.issues?.filter(i => i.type === 'warning') || []
  const infos = seo.issues?.filter(i => i.type === 'info') || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-heading text-2xl font-display tracking-wide">SEO ANALYSIS</h2>
          <p className="text-muted text-sm mt-1">Search engine optimization audit</p>
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
            <p className="font-display text-2xl" style={{ color: '#00FF8A' }}>{seo.passes?.length || 0}</p>
          </div>
        </div>
      </div>

      {/* Core metrics grid */}
      <div className={`grid gap-3 ${seo.performance > 0 ? 'grid-cols-2 md:grid-cols-5' : 'grid-cols-2 md:grid-cols-2'}`}>
        {seo.performance > 0 && (
          <MetricCard
            label="Performance"
            value={seo.performance}
            color={seo.performance >= 75 ? '#00FF8A' : seo.performance >= 50 ? '#FFB740' : '#FF4040'}
            description={seo.performance >= 90 ? '✓ Fast' : seo.performance >= 50 ? 'Needs improvement' : '✗ Slow'}
          />
        )}
        {seo.accessibility > 0 && (
          <MetricCard
            label="Accessibility"
            value={seo.accessibility}
            color={seo.accessibility >= 90 ? '#00FF8A' : seo.accessibility >= 70 ? '#FFB740' : '#FF4040'}
            description={seo.accessibility >= 90 ? '✓ Excellent' : seo.accessibility >= 70 ? 'Some issues' : '✗ Accessibility issues'}
          />
        )}
        {seo.bestPractices > 0 && (
          <MetricCard
            label="Best Practices"
            value={seo.bestPractices}
            color={seo.bestPractices >= 90 ? '#00FF8A' : seo.bestPractices >= 70 ? '#FFB740' : '#FF4040'}
            description={seo.bestPractices >= 90 ? '✓ Best practices met' : 'Issues found'}
          />
        )}
        <MetricCard label="Word Count" value={seo.wordCount || 0} color="#00D4FF"
          description={
            (seo.wordCount || 0) >= 1500 ? '✓ In-depth content' :
            (seo.wordCount || 0) >= 500 ? 'Medium depth' : '⚠ Thin content'}
        />
        <MetricCard
          label="Domain Age"
          value={seo.domainAge && seo.domainAge.days > 0 ? seo.domainAge.label : '—'}
          color={!seo.domainAge || seo.domainAge.days < 0 ? '#5A6478' : seo.domainAge.days > 730 ? '#00FF8A' : seo.domainAge.days > 180 ? '#FFB740' : '#FF6B6B'}
          description={
            !seo.domainAge || seo.domainAge.days < 0 ? 'Could not detect' :
            seo.domainAge.days > 1825 ? '✓ Well-established' :
            seo.domainAge.days > 365 ? '~ Growing domain' :
            '⚠ New domain'
          }
        />
      </div>

      {/* Core Web Vitals */}
      {lcpMs > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-heading font-mono text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
            <Zap size={16} className="text-cyan-DEFAULT" />
            Core Web Vitals
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'LCP', value: (lcpMs / 1000).toFixed(2), unit: 's', ok: lcpOk, desc: 'Largest Content Paint' },
              { label: 'FCP', value: (fcpMs / 1000).toFixed(2), unit: 's', ok: fcpOk, desc: 'First Content Paint' },
              { label: 'CLS', value: cls.toFixed(3), unit: '', ok: clsOk, desc: 'Layout Shift' },
              { label: 'TBT', value: Math.round(tbt), unit: 'ms', ok: tbtOk, desc: 'Total Blocking Time' },
              { label: 'TTFB', value: Math.round(ttfb), unit: 'ms', ok: ttfbOk, desc: 'Server Response' },
            ].map(m => (
              <div key={m.label} className="p-3 rounded-lg text-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <StatusDot ok={m.ok} />
                <p className="text-muted text-xs font-mono mt-1">{m.label}</p>
                <p className={`font-display text-xl mt-1 ${m.ok ? 'text-success' : 'text-error'}`}>
                  {m.value}<span className="text-sm">{m.unit}</span>
                </p>
                <p className="text-muted text-xs mt-0.5">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Meta & Content checks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Meta Tags */}
        <div className="glass-card p-5">
          <h3 className="text-heading font-mono text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
            <Code2 size={16} className="text-cyan-DEFAULT" />
            Meta Tags
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Title Tag', ok: seo.title?.exists, detail: seo.title?.value ? `"${seo.title.value.slice(0, 50)}${seo.title.value.length > 50 ? '…' : ''}"` : 'Missing', sub: seo.title?.length ? `${seo.title.length} chars` : '' },
              { label: 'Meta Description', ok: seo.description?.exists, detail: seo.description?.value ? `${seo.description.length} chars` : 'Missing' },
              { label: 'Canonical Tag', ok: seo.canonical?.exists, detail: seo.canonical?.value || 'Not set' },
              { label: 'Meta Robots', ok: !seo.metaRobots?.noindex, detail: seo.metaRobots?.noindex ? 'NOINDEX set!' : 'Indexable' },
              { label: 'Open Graph', ok: seo.ogTags?.title && seo.ogTags?.description && seo.ogTags?.image, detail: Object.values(seo.ogTags || {}).filter(Boolean).length + '/5 tags' },
              { label: 'Twitter Card', ok: seo.twitterCard?.exists, detail: seo.twitterCard?.type || 'Not set' },
            ].map(item => (
              <div key={item.label} className="flex items-start gap-2">
                <StatusDot ok={item.ok} />
                <div className="flex-1 min-w-0">
                  <p className="text-heading text-sm">{item.label}</p>
                  <p className="text-muted text-xs truncate">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Structure */}
        <div className="glass-card p-5">
          <h3 className="text-heading font-mono text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
            <FileText size={16} className="text-cyan-DEFAULT" />
            Content & Structure
          </h3>
          <div className="space-y-3">
            {[
              { label: 'HTTPS / SSL', ok: seo.ssl, detail: seo.ssl ? 'Secure' : 'Not secure' },
              { label: 'H1 Heading', ok: seo.h1?.count === 1, detail: seo.h1?.value ? `"${seo.h1.value.slice(0, 40)}…"` : `${seo.h1?.count || 0} found` },
              { label: 'robots.txt', ok: seo.robotsTxt?.exists, detail: seo.robotsTxt?.exists ? 'Found' : 'Missing' },
              { label: 'XML Sitemap', ok: seo.sitemap?.exists, detail: seo.sitemap?.exists ? 'Found' : 'Missing' },
              { label: 'Structured Data', ok: seo.structuredData, detail: seo.schemaTypes?.length ? seo.schemaTypes.join(', ') : 'None found' },
              { label: 'Image Alt Text', ok: seo.images?.withoutAlt === 0, detail: `${seo.images?.withAlt || 0}/${seo.images?.total || 0} images with alt` },
            ].map(item => (
              <div key={item.label} className="flex items-start gap-2">
                <StatusDot ok={item.ok} />
                <div className="flex-1 min-w-0">
                  <p className="text-heading text-sm">{item.label}</p>
                  <p className="text-muted text-xs truncate">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Link analysis */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-4 text-center">
          <p className="text-muted text-xs font-mono uppercase mb-2">Internal Links</p>
          <p className="font-display text-3xl text-cyan-DEFAULT">{seo.links?.internal || 0}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-muted text-xs font-mono uppercase mb-2">External Links</p>
          <p className="font-display text-3xl" style={{ color: '#AAFF3E' }}>{seo.links?.external || 0}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-muted text-xs font-mono uppercase mb-2">Schema Types</p>
          <p className="font-display text-3xl text-warning">{seo.schemaTypes?.length || 0}</p>
        </div>
      </div>

      {/* Issues */}
      {seo.issues && seo.issues.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-heading font-mono text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
            <AlertCircle size={16} className="text-warning" />
            Issues Found ({seo.issues.length})
          </h3>
          <div className="space-y-2">
            {seo.issues.map((issue, i) => <IssueItem key={i} issue={issue} />)}
          </div>
        </div>
      )}

      {/* Passes */}
      {seo.passes && seo.passes.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-heading font-mono text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-success" />
            Passing Checks ({seo.passes.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {seo.passes.map((p, i) => (
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
