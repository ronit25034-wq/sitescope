'use client'

import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react'
import type { BulkResult } from '@/lib/types'

function GradeChip({ grade }: { grade: string }) {
  const colors: Record<string, string> = {
    A: '#00FF8A', B: '#AAFF3E', C: '#FFB740', D: '#FF8040', F: '#FF4040',
  }
  const color = colors[grade] || '#5A6478'
  return (
    <span
      className="inline-flex items-center justify-center w-8 h-8 rounded-lg font-display text-lg font-bold"
      style={{ color, background: `${color}18`, border: `1px solid ${color}40` }}
    >
      {grade}
    </span>
  )
}

function ScoreBar({ score, color = '#00D4FF' }: { score: number; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${score}%`, background: color, boxShadow: `0 0 6px ${color}60` }}
        />
      </div>
      <span className="font-mono text-xs w-8 text-right" style={{ color }}>{score}</span>
    </div>
  )
}

export default function BulkView({ results }: { results: BulkResult[] }) {
  const avgScore = Math.round(results.reduce((s, r) => s + r.overallScore, 0) / results.length)
  const best = results.reduce((a, b) => a.overallScore > b.overallScore ? a : b)
  const worst = results.reduce((a, b) => a.overallScore < b.overallScore ? a : b)

  return (
    <div className="space-y-6">
      <h2 className="text-heading text-2xl font-display tracking-wide">BULK SCAN RESULTS</h2>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-card p-4 text-center">
          <p className="text-muted text-xs font-mono uppercase mb-1">Sites Scanned</p>
          <p className="font-display text-3xl text-cyan-DEFAULT">{results.length}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-muted text-xs font-mono uppercase mb-1">Avg Score</p>
          <p className="font-display text-3xl" style={{ color: avgScore >= 70 ? '#00FF8A' : avgScore >= 45 ? '#FFB740' : '#FF4040' }}>{avgScore}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-muted text-xs font-mono uppercase mb-1">Best Site</p>
          <p className="font-mono text-sm text-success truncate mt-1">{best.domain}</p>
          <p className="font-display text-2xl text-success">{best.overallScore}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-muted text-xs font-mono uppercase mb-1">Needs Work</p>
          <p className="font-mono text-sm text-error truncate mt-1">{worst.domain}</p>
          <p className="font-display text-2xl text-error">{worst.overallScore}</p>
        </div>
      </div>

      {/* Results table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {['Grade', 'Domain', 'Overall', 'SEO Score', 'GEO Score', 'Top Issue'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-muted text-xs font-mono uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results
                .sort((a, b) => b.overallScore - a.overallScore)
                .map((r, i) => (
                  <tr
                    key={i}
                    className="transition-colors"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <td className="py-4 px-4"><GradeChip grade={r.grade} /></td>
                    <td className="py-4 px-4">
                      <p className="text-heading text-sm font-medium">{r.domain}</p>
                      {r.error && <p className="text-error text-xs mt-0.5">{r.error}</p>}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className="font-display text-2xl"
                        style={{ color: r.overallScore >= 70 ? '#00FF8A' : r.overallScore >= 45 ? '#FFB740' : '#FF4040' }}
                      >
                        {r.overallScore}
                      </span>
                    </td>
                    <td className="py-4 px-4 w-32"><ScoreBar score={r.seoScore} color="#00D4FF" /></td>
                    <td className="py-4 px-4 w-32"><ScoreBar score={r.geoScore} color="#AAFF3E" /></td>
                    <td className="py-4 px-4">
                      <p className="text-muted text-xs max-w-xs truncate">{r.topIssue}</p>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
