'use client'

import { useState, useRef } from 'react'
import { Search, ArrowRight, Zap, Globe, Bot, Shield, ChevronDown, X, Plus } from 'lucide-react'
import dynamic from 'next/dynamic'
import type { AuditResult, CompareResult, BulkResult, AuditMode, AuditDepth } from '@/lib/types'

const ProgressView = dynamic(() => import('@/components/ProgressView'), { ssr: false })
const ReportView = dynamic(() => import('@/components/report/ReportView'), { ssr: false })

type AppView = 'home' | 'progress' | 'report'

export default function HomePage() {
  const [view, setView] = useState<AppView>('home')
  const [mode, setMode] = useState<AuditMode>('audit')
  const [depth] = useState<AuditDepth>('deep')
  const [url, setUrl] = useState('')
  const [competitorUrl, setCompetitorUrl] = useState('')
  const [bulkUrls, setBulkUrls] = useState<string[]>(['', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [result, setResult] = useState<AuditResult | undefined>()
  const [compareResult, setCompareResult] = useState<CompareResult | undefined>()
  const [bulkResults, setBulkResults] = useState<BulkResult[] | undefined>()

  const inputRef = useRef<HTMLInputElement>(null)

  const validate = () => {
    if (mode === 'audit') {
      if (!url.trim()) return 'Please enter a URL to audit'
      try { new URL(url.startsWith('http') ? url : `https://${url}`) } catch { return 'Please enter a valid URL' }
    }
    if (mode === 'compare') {
      if (!url.trim() || !competitorUrl.trim()) return 'Please enter both URLs to compare'
    }
    if (mode === 'bulk') {
      const filled = bulkUrls.filter(u => u.trim())
      if (filled.length < 1) return 'Please enter at least one URL'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationError = validate()
    if (validationError) { setError(validationError); return }
    setError('')

    setView('progress')
    setLoading(true)

    try {
      const body = {
        url: url.startsWith('http') ? url : `https://${url}`,
        competitorUrl: competitorUrl ? (competitorUrl.startsWith('http') ? competitorUrl : `https://${competitorUrl}`) : undefined,
        urls: bulkUrls.filter(u => u.trim()).map(u => u.startsWith('http') ? u : `https://${u}`),
        mode,
        depth,
      }

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error('Analysis failed')
      const data = await res.json()

      if (data.mode === 'audit') setResult(data.result)
      if (data.mode === 'compare') setCompareResult(data.result)
      if (data.mode === 'bulk') setBulkResults(data.results)

      setView('report')
    } catch (err) {
      setError('Failed to analyze. Please check the URL and try again.')
      setView('home')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    setView('home')
    setResult(undefined)
    setCompareResult(undefined)
    setBulkResults(undefined)
  }

  const handleRerun = () => {
    setView('home')
  }

  if (view === 'progress') {
    return <ProgressView mode={mode} url={url || bulkUrls[0]} />
  }

  if (view === 'report') {
    return (
      <ReportView
        mode={mode}
        result={result}
        compareResult={compareResult}
        bulkResults={bulkResults}
        onBack={handleBack}
        onRerun={handleRerun}
      />
    )
  }

  return (
    <div className="min-h-screen grid-bg relative overflow-hidden">
      {/* Background radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 50% at 50% -10%, rgba(0,212,255,0.12), transparent)' }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '-20%', left: '50%', transform: 'translateX(-50%)',
          width: '60%', height: '40%',
          background: 'radial-gradient(ellipse, rgba(170,255,62,0.04), transparent)',
        }}
      />

      {/* Scan line */}
      <div className="scan-line" />

      {/* Nav */}
      <nav className="relative z-10 max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Logo */}
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" stroke="rgba(0,212,255,0.4)" strokeWidth="1.5" />
            <circle cx="16" cy="16" r="9" stroke="rgba(0,212,255,0.3)" strokeWidth="1.5" />
            <circle cx="16" cy="16" r="4" stroke="rgba(0,212,255,0.5)" strokeWidth="1.5" />
            <line x1="16" y1="2" x2="16" y2="30" stroke="rgba(0,212,255,0.2)" strokeWidth="1" />
            <line x1="2" y1="16" x2="30" y2="16" stroke="rgba(0,212,255,0.2)" strokeWidth="1" />
            <circle cx="16" cy="16" r="2" fill="#00D4FF" />
          </svg>
          <span className="font-display text-xl text-heading tracking-widest">SITESCOPE</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <a href="#features" className="text-muted hover:text-heading transition-colors">Features</a>
          <a href="#how" className="text-muted hover:text-heading transition-colors">How it works</a>
          <span
            className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium"
            style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', color: '#00D4FF' }}
          >
            FREE
          </span>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-12 pb-6 text-center">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono mb-6"
          style={{ background: 'rgba(170,255,62,0.08)', border: '1px solid rgba(170,255,62,0.2)', color: '#AAFF3E' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          SEO + GEO Audit in one scan
        </div>

        <h1
          className="font-display leading-none mb-4"
          style={{
            fontSize: 'clamp(52px, 9vw, 110px)',
            letterSpacing: '-0.01em',
            background: 'linear-gradient(135deg, #E8F0FF 0%, #00D4FF 50%, #AAFF3E 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          SCAN ANY SITE.
          <br />
          RANK EVERYWHERE.
        </h1>

        <p className="text-body text-lg max-w-xl mx-auto mb-10">
          Get a full SEO + GEO audit in seconds. Rank on Google <em>and</em> get cited by ChatGPT, Perplexity, Gemini, and Bing Copilot.
        </p>

        {/* Main form card */}
        <div
          className="rounded-2xl p-6 md:p-8 text-left"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Mode tabs */}
          <div className="flex gap-1 p-1 rounded-xl mb-6 w-fit" style={{ background: 'rgba(0,0,0,0.3)' }}>
            {([
              { id: 'audit', label: '🔍 Site Audit', desc: 'Full SEO + GEO report' },
              { id: 'compare', label: '⚔️ Compare', desc: 'You vs Competitor' },
              { id: 'bulk', label: '📊 Bulk Scan', desc: 'Multiple URLs' },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => { setMode(tab.id); setError('') }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === tab.id
                    ? 'bg-cyan-DEFAULT/10 text-cyan-DEFAULT border border-cyan-DEFAULT/40'
                    : 'text-muted hover:text-heading'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Audit mode */}
            {mode === 'audit' && (
              <div className="relative">
                <Globe size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  ref={inputRef}
                  type="text"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://yourwebsite.com"
                  className="w-full pl-11 pr-4 py-4 rounded-xl text-heading placeholder-muted font-mono text-sm focus:outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(0,212,255,0.4)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
              </div>
            )}

            {/* Compare mode */}
            {mode === 'compare' && (
              <div className="space-y-3">
                <div className="relative">
                  <Globe size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-DEFAULT" />
                  <input
                    type="text"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="Your site: https://yoursite.com"
                    className="w-full pl-11 pr-4 py-4 rounded-xl text-heading placeholder-muted font-mono text-sm focus:outline-none transition-all"
                    style={{ background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.2)' }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(0,212,255,0.5)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(0,212,255,0.2)')}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-muted text-xs font-mono">VS</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="relative">
                  <Globe size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#AAFF3E' }} />
                  <input
                    type="text"
                    value={competitorUrl}
                    onChange={e => setCompetitorUrl(e.target.value)}
                    placeholder="Competitor: https://competitor.com"
                    className="w-full pl-11 pr-4 py-4 rounded-xl text-heading placeholder-muted font-mono text-sm focus:outline-none transition-all"
                    style={{ background: 'rgba(170,255,62,0.04)', border: '1px solid rgba(170,255,62,0.2)' }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(170,255,62,0.5)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(170,255,62,0.2)')}
                  />
                </div>
              </div>
            )}

            {/* Bulk mode */}
            {mode === 'bulk' && (
              <div className="space-y-2">
                {bulkUrls.map((u, i) => (
                  <div key={i} className="flex gap-2">
                    <div className="relative flex-1">
                      <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                      <input
                        type="text"
                        value={u}
                        onChange={e => {
                          const next = [...bulkUrls]
                          next[i] = e.target.value
                          setBulkUrls(next)
                        }}
                        placeholder={`https://site${i + 1}.com`}
                        className="w-full pl-9 pr-4 py-3 rounded-xl text-heading placeholder-muted font-mono text-sm focus:outline-none transition-all"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                        onFocus={e => (e.target.style.borderColor = 'rgba(0,212,255,0.3)')}
                        onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                      />
                    </div>
                    {bulkUrls.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setBulkUrls(bulkUrls.filter((_, j) => j !== i))}
                        className="p-3 rounded-xl text-muted hover:text-error transition-colors"
                        style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
                {bulkUrls.length < 10 && (
                  <button
                    type="button"
                    onClick={() => setBulkUrls([...bulkUrls, ''])}
                    className="flex items-center gap-2 text-sm text-muted hover:text-cyan-DEFAULT transition-colors py-2"
                  >
                    <Plus size={16} />
                    Add URL (max 10)
                  </button>
                )}
              </div>
            )}

            {/* Submit row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono text-muted" style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)' }}>
                🔬 Full deep scan · PageSpeed + Core Web Vitals included
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-mono font-medium text-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #00D4FF, #AAFF3E)',
                  color: '#070A12',
                  boxShadow: '0 0 30px rgba(0,212,255,0.3)',
                }}
              >
                <Search size={16} />
                {mode === 'audit' ? 'Run Audit' : mode === 'compare' ? 'Compare Sites' : 'Bulk Scan'}
                <ArrowRight size={16} />
              </button>
            </div>

            {error && (
              <p className="text-error text-sm font-mono pt-1 flex items-center gap-2">
                <span>⚠</span> {error}
              </p>
            )}
          </form>
        </div>

        <p className="text-muted text-xs font-mono mt-3">
          No account needed · Free · Powered by PageSpeed API + AI analysis
        </p>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 max-w-5xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: <Globe size={24} className="text-cyan-DEFAULT" />,
              title: 'Full SEO Audit',
              desc: 'Meta tags, Core Web Vitals, schema markup, robots.txt, sitemap, internal links, and PageSpeed scores.',
            },
            {
              icon: <Bot size={24} style={{ color: '#AAFF3E' }} />,
              title: 'GEO Analysis',
              desc: 'AI crawler access, llms.txt detection, E-E-A-T signals, Organization schema, and platform-specific readiness scores.',
            },
            {
              icon: <Shield size={24} className="text-warning" />,
              title: 'Competitor Compare',
              desc: 'Head-to-head comparison of your site vs any competitor across all SEO and GEO metrics.',
            },
          ].map(f => (
            <div key={f.title} className="glass-card glass-card-hover p-6">
              <div className="mb-4">{f.icon}</div>
              <h3 className="text-heading font-display text-xl mb-2 tracking-wide">{f.title}</h3>
              <p className="text-body text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative z-10 max-w-4xl mx-auto px-6 pb-20">
        <h2 className="font-display text-3xl text-heading text-center mb-10 tracking-wide">HOW IT WORKS</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { step: '01', label: 'Enter URL', desc: 'Paste any website URL' },
            { step: '02', label: 'Full Deep Scan', desc: 'PageSpeed + Core Web Vitals included' },
            { step: '03', label: 'Scan Runs', desc: '30+ checks in seconds' },
            { step: '04', label: 'Get Report', desc: 'Download as PDF anytime' },
          ].map((s, i) => (
            <div key={s.step} className="flex flex-col items-center text-center gap-3 relative">
              {i < 3 && (
                <div className="hidden md:block absolute top-6 left-[60%] w-[80%] h-px" style={{ background: 'linear-gradient(90deg, rgba(0,212,255,0.3), transparent)' }} />
              )}
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center font-display text-lg"
                style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)', color: '#00D4FF' }}
              >
                {s.step}
              </div>
              <p className="text-heading font-medium">{s.label}</p>
              <p className="text-muted text-sm">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border py-6 px-6">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="14" stroke="rgba(0,212,255,0.4)" strokeWidth="1.5" />
              <circle cx="16" cy="16" r="2" fill="#00D4FF" />
            </svg>
            <span className="font-display text-sm text-muted tracking-widest">SITESCOPE</span>
          </div>
          <p className="text-muted text-xs font-mono">SEO + GEO auditing tool · Built with PageSpeed API</p>
        </div>
      </footer>
    </div>
  )
}
