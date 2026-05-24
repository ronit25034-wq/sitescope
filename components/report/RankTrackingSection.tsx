'use client'

import { TrendingUp, TrendingDown, Minus, ExternalLink, BarChart2 } from 'lucide-react'
import type { RankTrackingResult } from '@/lib/analyzers/rank-tracking'
import type { RankRow } from '@/lib/supabase'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

// ── helpers ───────────────────────────────────────────────────────────────────
function posColor(pos: number) {
  if (pos <= 3)  return '#00FF8A'
  if (pos <= 10) return '#FFB740'
  if (pos <= 20) return '#00D4FF'
  return '#9BA8C0'
}

function DeltaBadge({ current, prev }: { current: number; prev: number | undefined }) {
  if (prev === undefined) return <span className="text-muted text-xs font-mono">new</span>
  const delta = Math.round((prev - current) * 10) / 10    // positive = rank improved
  if (Math.abs(delta) < 0.5) return <Minus size={12} className="text-muted" />
  return delta > 0
    ? <span className="flex items-center gap-0.5 text-xs font-mono font-medium text-success"><TrendingUp size={11} />+{delta}</span>
    : <span className="flex items-center gap-0.5 text-xs font-mono font-medium text-error"><TrendingDown size={11} />{delta}</span>
}

function PositionBubble({ pos }: { pos: number }) {
  const color = posColor(pos)
  return (
    <span className="inline-flex items-center justify-center w-10 h-7 rounded font-display text-sm font-bold flex-shrink-0"
      style={{ background: `${color}18`, color, border: `1px solid ${color}40` }}>
      #{pos}
    </span>
  )
}

// ── GSC Not Connected ─────────────────────────────────────────────────────────
function ConnectGSC() {
  return (
    <div className="glass-card p-6 flex flex-col items-center text-center gap-4">
      <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)' }}>
        <BarChart2 size={22} className="text-cyan-DEFAULT" />
      </div>
      <div>
        <h3 className="text-heading font-display text-lg tracking-wide">RANK TRACKING</h3>
        <p className="text-muted text-sm mt-1">Monitor your keyword positions in Google Search over time</p>
      </div>
      <div className="w-full max-w-sm space-y-2 text-left">
        {['Top 25 keywords tracked automatically', 'Position delta vs last audit', 'Clicks · Impressions · CTR from GSC', 'Saved to Supabase — full history'].map(f => (
          <div key={f} className="flex items-center gap-2 text-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-DEFAULT flex-shrink-0" />
            <span className="text-body">{f}</span>
          </div>
        ))}
      </div>
      <a href="/api/auth/gsc"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-sm font-medium transition-all"
        style={{ background: 'rgba(0,212,255,0.12)', color: '#00D4FF', border: '1px solid rgba(0,212,255,0.3)' }}>
        Connect Google Search Console
        <ExternalLink size={14} />
      </a>
      <p className="text-muted text-xs">One-click Google OAuth · only reads your GSC data · no write access</p>
    </div>
  )
}

// ── Mini sparkline per keyword ────────────────────────────────────────────────
function MiniChart({ history }: { history: Array<{ date: string; pos: number }> }) {
  if (history.length < 2) return null
  const data = history.slice().reverse().map((h, i) => ({ i, pos: h.pos }))
  return (
    <div style={{ width: 60, height: 24 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line type="monotone" dataKey="pos" stroke="#00D4FF" strokeWidth={1.5} dot={false} />
          <YAxis domain={['dataMax', 'dataMin']} hide />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function RankTrackingSection({
  data,
  domain,
}: {
  data: RankTrackingResult
  domain: string
}) {
  if (!data.connected) return <ConnectGSC />

  if (!data.available) {
    return (
      <div className="glass-card p-5 text-center space-y-2">
        <BarChart2 size={20} className="text-muted mx-auto" />
        <p className="text-heading text-sm font-mono">GSC CONNECTED</p>
        <p className="text-muted text-xs">No keyword data yet for <strong>{domain}</strong>.</p>
        <p className="text-muted text-xs">Make sure you've added this property to Search Console and it has search traffic.</p>
        <p className="text-muted text-xs mt-2">Connected site: <code className="text-cyan-DEFAULT text-xs">{data.siteUrl}</code></p>
        <a href="/api/auth/gsc" className="inline-flex items-center gap-1 text-xs text-cyan-DEFAULT hover:underline font-mono mt-1">
          Re-connect / switch property <ExternalLink size={10} />
        </a>
      </div>
    )
  }

  const prevMap = new Map(data.previous.map(r => [r.keyword, r.position]))

  // Summary stats
  const top3    = data.keywords.filter(k => k.position <= 3).length
  const top10   = data.keywords.filter(k => k.position <= 10).length
  const avgPos  = data.keywords.length
    ? Math.round(data.keywords.reduce((s, k) => s + k.position, 0) / data.keywords.length * 10) / 10
    : 0
  const totalClicks = data.keywords.reduce((s, k) => s + k.clicks, 0)
  const totalImpressions = data.keywords.reduce((s, k) => s + k.impressions, 0)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-heading font-mono text-sm uppercase tracking-wider flex items-center gap-2">
            <BarChart2 size={15} className="text-cyan-DEFAULT" />
            Rank Tracking
            <span className="text-xs font-normal text-success bg-success/10 px-2 py-0.5 rounded-full border border-success/20">GSC Live</span>
          </h3>
          <p className="text-muted text-xs mt-0.5">
            {data.siteUrl} · last 28 days
          </p>
        </div>
        <a href="/api/auth/gsc" className="text-xs text-muted hover:text-cyan-DEFAULT font-mono transition-colors flex items-center gap-1">
          switch property <ExternalLink size={10} />
        </a>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Keywords', value: data.keywords.length, color: '#00D4FF' },
          { label: 'Top 3', value: top3, color: '#00FF8A' },
          { label: 'Top 10', value: top10, color: '#AAFF3E' },
          { label: 'Avg Position', value: avgPos, color: '#FFB740' },
          { label: 'Total Clicks', value: totalClicks.toLocaleString(), color: '#9B8FFF' },
        ].map(s => (
          <div key={s.label} className="glass-card p-3 text-center">
            <p className="text-muted text-xs font-mono uppercase mb-1">{s.label}</p>
            <p className="font-display text-2xl" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Keyword table */}
      <div className="glass-card overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-border"
          style={{ background: 'rgba(255,255,255,0.02)' }}>
          <span className="col-span-1 text-muted text-xs font-mono uppercase">Pos</span>
          <span className="col-span-5 text-muted text-xs font-mono uppercase">Keyword</span>
          <span className="col-span-2 text-muted text-xs font-mono uppercase text-right">Delta</span>
          <span className="col-span-2 text-muted text-xs font-mono uppercase text-right">Clicks</span>
          <span className="col-span-2 text-muted text-xs font-mono uppercase text-right">Impr.</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border/50">
          {data.keywords.slice(0, 25).map((kw) => (
            <div key={kw.keyword} className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center hover:bg-white/[0.02] transition-colors">
              <div className="col-span-1">
                <PositionBubble pos={Math.round(kw.position)} />
              </div>
              <div className="col-span-5 min-w-0">
                <p className="text-heading text-sm truncate font-medium">{kw.keyword}</p>
                <p className="text-muted text-xs font-mono">{kw.ctr}% CTR</p>
              </div>
              <div className="col-span-2 flex justify-end">
                <DeltaBadge current={kw.position} prev={prevMap.get(kw.keyword)} />
              </div>
              <div className="col-span-2 text-right">
                <p className="text-heading text-sm font-mono">{kw.clicks.toLocaleString()}</p>
              </div>
              <div className="col-span-2 text-right">
                <p className="text-muted text-sm font-mono">{kw.impressions.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Overall position distribution */}
      <div className="glass-card p-4">
        <p className="text-muted text-xs font-mono uppercase tracking-wider mb-3">Position Distribution</p>
        <div className="flex items-end gap-1 h-16">
          {[
            { label: '#1-3', count: data.keywords.filter(k => k.position <= 3).length, color: '#00FF8A' },
            { label: '#4-10', count: data.keywords.filter(k => k.position > 3 && k.position <= 10).length, color: '#AAFF3E' },
            { label: '#11-20', count: data.keywords.filter(k => k.position > 10 && k.position <= 20).length, color: '#FFB740' },
            { label: '#21+', count: data.keywords.filter(k => k.position > 20).length, color: '#9BA8C0' },
          ].map(b => {
            const max = Math.max(...[3, data.keywords.filter(k => k.position <= 3).length,
              data.keywords.filter(k => k.position > 3 && k.position <= 10).length,
              data.keywords.filter(k => k.position > 10 && k.position <= 20).length,
              data.keywords.filter(k => k.position > 20).length])
            const pct = max > 0 ? (b.count / max) * 100 : 0
            return (
              <div key={b.label} className="flex-1 flex flex-col items-center gap-1">
                <p className="text-xs font-mono font-bold" style={{ color: b.color }}>{b.count}</p>
                <div className="w-full rounded-t-sm transition-all" style={{ height: `${Math.max(4, pct)}%`, background: b.color, opacity: 0.7 }} />
                <p className="text-muted text-xs font-mono">{b.label}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
