'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Circle, Loader2 } from 'lucide-react'

interface Step {
  label: string
  duration: number
}

const AUDIT_STEPS: Step[] = [
  { label: 'Resolving DNS & checking SSL', duration: 800 },
  { label: 'Fetching page content', duration: 1200 },
  { label: 'Parsing HTML structure', duration: 700 },
  { label: 'Checking meta tags & headings', duration: 600 },
  { label: 'Analyzing schema markup', duration: 700 },
  { label: 'Fetching robots.txt & sitemap', duration: 1000 },
  { label: 'Checking AI crawler access', duration: 500 },
  { label: 'Scanning for llms.txt', duration: 600 },
  { label: 'Running PageSpeed analysis', duration: 4000 },
  { label: 'Computing E-E-A-T signals', duration: 1200 },
  { label: 'Firecrawl: extracting clean content', duration: 2000 },
  { label: 'ScrapegraphAI: analyzing content quality', duration: 3000 },
  { label: 'Extracting keywords & search intent', duration: 800 },
  { label: 'Checking content freshness', duration: 600 },
  { label: 'Calculating SEO, GEO & content scores', duration: 800 },
  { label: 'Generating report', duration: 600 },
]

const COMPARE_STEPS: Step[] = [
  { label: 'Resolving both sites', duration: 800 },
  { label: 'Fetching Site A content', duration: 1200 },
  { label: 'Fetching Site B content', duration: 1200 },
  { label: 'Analyzing SEO for both sites', duration: 2000 },
  { label: 'Checking AI visibility', duration: 1500 },
  { label: 'Running PageSpeed on both', duration: 5000 },
  { label: 'Comparing performance metrics', duration: 800 },
  { label: 'Building comparison report', duration: 600 },
]

const BULK_STEPS: Step[] = [
  { label: 'Queuing URLs for analysis', duration: 500 },
  { label: 'Running parallel audits', duration: 3000 },
  { label: 'Checking PageSpeed scores', duration: 4000 },
  { label: 'Aggregating results', duration: 800 },
  { label: 'Generating bulk report', duration: 500 },
]

interface ProgressViewProps {
  mode: 'audit' | 'compare' | 'bulk'
  url: string
}

export default function ProgressView({ mode, url }: ProgressViewProps) {
  const steps = mode === 'compare' ? COMPARE_STEPS : mode === 'bulk' ? BULK_STEPS : AUDIT_STEPS
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    let stepIndex = 0
    let totalElapsed = 0
    const totalDuration = steps.reduce((s, st) => s + st.duration, 0)

    const advanceStep = () => {
      if (stepIndex >= steps.length) return
      const step = steps[stepIndex]

      const interval = setInterval(() => {
        totalElapsed += 50
        const pct = Math.min(99, Math.round((totalElapsed / totalDuration) * 100))
        setProgress(pct)
        setElapsed(Math.round(totalElapsed / 1000))
      }, 50)

      setTimeout(() => {
        clearInterval(interval)
        stepIndex++
        setCurrentStep(stepIndex)
        if (stepIndex < steps.length) advanceStep()
      }, step.duration)
    }

    advanceStep()
  }, [])

  const domain = (() => {
    try {
      return new URL(url.startsWith('http') ? url : `https://${url}`).hostname
    } catch {
      return url
    }
  })()

  return (
    <div className="min-h-screen grid-bg flex items-center justify-center px-4 relative overflow-hidden">
      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(0,212,255,0.08), transparent)' }}
      />

      {/* Scan line */}
      <div className="scan-line" />

      <div className="relative z-10 w-full max-w-lg">
        {/* Radar graphic */}
        <div className="flex justify-center mb-8">
          <div className="relative w-32 h-32">
            {[1, 0.7, 0.4].map((scale, i) => (
              <div
                key={i}
                className="absolute inset-0 rounded-full border border-cyan-DEFAULT/20"
                style={{ transform: `scale(${scale})`, margin: 'auto' }}
              />
            ))}
            {/* Sweeping radar arm */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-full h-0.5 origin-left"
                style={{
                  background: 'linear-gradient(90deg, rgba(0,212,255,0.8), transparent)',
                  animation: 'spin 2s linear infinite',
                  transformOrigin: '50% 50%',
                }}
              />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-cyan-DEFAULT glow-cyan" />
            </div>
          </div>
        </div>

        {/* Domain being scanned */}
        <div className="text-center mb-8">
          <p className="text-muted text-sm uppercase tracking-widest font-mono mb-2">Scanning</p>
          <p className="text-heading text-xl font-mono truncate">{domain}</p>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-muted text-xs font-mono">ANALYSIS PROGRESS</span>
            <span className="text-cyan-DEFAULT text-sm font-mono font-medium">{progress}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div
              className="h-full rounded-full transition-all duration-300 progress-glow"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #00D4FF, #AAFF3E)',
              }}
            />
          </div>
          <p className="text-muted text-xs font-mono mt-1 text-right">{elapsed}s elapsed</p>
        </div>

        {/* Steps */}
        <div className="glass-card p-5 space-y-3">
          {steps.map((step, i) => {
            const isDone = i < currentStep
            const isActive = i === currentStep
            return (
              <div
                key={i}
                className={`flex items-center gap-3 transition-opacity duration-300 ${
                  i > currentStep ? 'opacity-30' : 'opacity-100'
                }`}
              >
                <div className="flex-shrink-0">
                  {isDone ? (
                    <CheckCircle2 size={16} className="text-success" />
                  ) : isActive ? (
                    <Loader2 size={16} className="text-cyan-DEFAULT animate-spin" />
                  ) : (
                    <Circle size={16} className="text-muted" />
                  )}
                </div>
                <span
                  className={`text-sm font-mono ${
                    isDone ? 'text-success' : isActive ? 'text-heading' : 'text-muted'
                  }`}
                >
                  {step.label}
                </span>
                {isDone && (
                  <span className="ml-auto text-xs font-mono text-success/60">✓</span>
                )}
              </div>
            )
          })}
        </div>

        <p className="text-center text-muted text-xs font-mono mt-4">
          Deep analysis may take up to 30 seconds for PageSpeed data
        </p>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
