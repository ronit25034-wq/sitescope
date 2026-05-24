'use client'

import { CheckCircle2, XCircle, AlertCircle, Info, Bot, FileSearch, Shield, Star, Cpu, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import type { GEOResult } from '@/lib/types'
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts'

function CrawlerBadge({ name, status }: { name: string; status: 'allowed' | 'blocked' | 'unknown' }) {
  const color = status === 'allowed' ? '#00FF8A' : status === 'blocked' ? '#FF4040' : '#FFB740'
  const bg = status === 'allowed' ? 'rgba(0,255,138,0.1)' : status === 'blocked' ? 'rgba(255,64,64,0.1)' : 'rgba(255,183,64,0.1)'
  const border = status === 'allowed' ? 'rgba(0,255,138,0.3)' : status === 'blocked' ? 'rgba(255,64,64,0.3)' : 'rgba(255,183,64,0.3)'
  return (
    <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: bg, border: `1px solid ${border}` }}>
      <div className="flex items-center gap-2">
        <Bot size={14} style={{ color }} />
        <span className="text-heading text-sm font-mono">{name}</span>
      </div>
      <span className="text-xs font-mono font-medium uppercase" style={{ color }}>{status}</span>
    </div>
  )
}

function SchemaChip({ label, present }: { label: string; present: boolean }) {
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono"
      style={{
        background: present ? 'rgba(0,255,138,0.1)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${present ? 'rgba(0,255,138,0.3)' : 'rgba(255,255,255,0.08)'}`,
        color: present ? '#00FF8A' : '#5A6478',
      }}
    >
      {present ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
      {label}
    </div>
  )
}

function PlatformBar({ name, score, icon }: { name: string; score: number; icon: string }) {
  const color = score >= 70 ? '#00FF8A' : score >= 45 ? '#AAFF3E' : score >= 25 ? '#FFB740' : '#FF4040'
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <span className="text-heading text-sm">{name}</span>
        </div>
        <span className="font-mono text-sm font-medium" style={{ color }}>{score}/100</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${score}%`,
            background: `linear-gradient(90deg, ${color}aa, ${color})`,
            boxShadow: `0 0 8px ${color}60`,
          }}
        />
      </div>
    </div>
  )
}

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

function GEOExplainerBanner() {
  return (
    <div className="rounded-xl p-5 mb-2" style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.05), rgba(170,255,62,0.05))', border: '1px solid rgba(0,212,255,0.15)' }}>
      <p className="text-heading text-sm font-mono uppercase tracking-wider mb-3">💡 What is GEO?</p>
      <p className="text-body text-sm mb-4">
        <strong className="text-heading">Generative Engine Optimization (GEO)</strong> is about making your site visible to AI tools like ChatGPT, Perplexity, Google Gemini, and Bing Copilot — not just Google Search. These AI tools read your site and decide whether to <em>cite</em> you in their answers.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {[
          { icon: '🤖', title: 'AI Crawler Access', desc: 'Are AI bots allowed to read your site? Blocked bots = zero chance of being cited.' },
          { icon: '📄', title: 'llms.txt', desc: 'A special file (like robots.txt for AI) that tells AI models exactly what your site is about.' },
          { icon: '🏆', title: 'E-E-A-T Signals', desc: 'Experience, Expertise, Authority, Trust. Pages with About/Contact/Author info rank higher in AI answers.' },
          { icon: '🗂️', title: 'Schema Markup', desc: 'Structured data (JSON-LD) that lets AI understand your site\'s content type, organisation and topics.' },
        ].map(item => (
          <div key={item.title} className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <p className="text-lg mb-1">{item.icon}</p>
            <p className="text-heading text-xs font-mono font-medium mb-1">{item.title}</p>
            <p className="text-muted text-xs leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

const SCHEMA_INFO: Record<string, { icon: string; headline: string; why: string; example?: string }> = {
  'Organization': {
    icon: '🏢',
    headline: 'Identifies your brand to AI',
    why: 'Tells AI models your company name, logo, website URL, and social profiles. Without this, AI tools may not know who you are.',
    example: '"name": "Scaler Academy", "url": "https://scaler.com", "logo": "https://...", "sameAs": [...]',
  },
  'WebSite': {
    icon: '🌐',
    headline: 'Powers Google sitelinks search box',
    why: 'Adds a search box under your Google listing and enables a "SearchAction" so Google and AI tools know your site has a search feature. Also confirms your site\'s canonical URL and name.',
    example: '"potentialAction": { "@type": "SearchAction", "target": "https://scaler.com/search?q={query}", "query-input": "required name=query" }',
  },
  'Article': {
    icon: '📰',
    headline: 'Marks blog posts / news articles',
    why: 'Tells AI "this page is an article" — includes author, publish date, and headline. Perplexity and ChatGPT heavily favour Article-tagged pages when answering factual questions.',
    example: '"headline": "...", "author": { "@type": "Person", "name": "..." }, "datePublished": "2024-01-01"',
  },
  'FAQPage': {
    icon: '❓',
    headline: 'Shows Q&A directly in Google + boosts AI citations',
    why: 'When you mark up FAQ content, Google can show the questions and answers directly in search results (rich snippets). AI tools like ChatGPT and Gemini also extract FAQ content when answering questions — making your site far more likely to be cited.',
    example: '"mainEntity": [{ "@type": "Question", "name": "What is Scaler?", "acceptedAnswer": { "text": "Scaler is an ed-tech..." } }]',
  },
  'Person': {
    icon: '👤',
    headline: 'Author / founder credibility',
    why: 'Links a real person to your content. Boosts E-E-A-T (Google\'s trust signal) — especially important for health, finance, or educational content.',
    example: '"name": "Anshuman Singh", "jobTitle": "CEO", "url": "https://linkedin.com/in/..."',
  },
  'BreadcrumbList': {
    icon: '🍞',
    headline: 'Shows page path in Google results',
    why: 'Displays "Home > Courses > DSA" style breadcrumbs in Google. Helps both users and AI understand your site hierarchy.',
    example: '"itemListElement": [{ "position": 1, "name": "Home", "item": "https://scaler.com" }, ...]',
  },
  'speakable': {
    icon: '🔊',
    headline: 'Marks content for Google Assistant / voice',
    why: 'Tells Google which sections are best read aloud by voice assistants. Also used by Google AI Overviews to pick quote-worthy sentences.',
    example: '"speakable": { "@type": "SpeakableSpecification", "cssSelector": ["h1", ".summary"] }',
  },
  'sameAs': {
    icon: '🔗',
    headline: 'Links your social profiles to your brand',
    why: 'An array of your LinkedIn, Twitter, Wikipedia, Wikidata etc. URLs. Helps AI models confidently identify your brand across the web — critical for knowledge graph inclusion.',
    example: '"sameAs": ["https://linkedin.com/company/scaler", "https://twitter.com/scaler_official"]',
  },
  'HowTo': {
    icon: '📋',
    headline: 'Step-by-step instructions schema',
    why: 'Marks up tutorial or how-to content so Google can show steps as rich snippets. Perplexity loves citing step-by-step guides.',
    example: '"step": [{ "@type": "HowToStep", "text": "Install Node.js" }, ...]',
  },
  'Event': {
    icon: '📅',
    headline: 'Marks events (webinars, classes, workshops)',
    why: 'Adds events to Google Search\'s event listings. AI assistants can surface your upcoming events when users ask about related topics.',
    example: '"name": "DSA Bootcamp", "startDate": "2024-02-01", "location": { "name": "Online" }',
  },
  'VideoObject': {
    icon: '🎬',
    headline: 'Marks video content for AI discovery',
    why: 'AI tools like Gemini and Perplexity increasingly surface video answers. VideoObject schema tells AI what your video is about, how long it is, and its transcript/description — making it citeable.',
    example: '"name": "How to crack DSA", "duration": "PT15M", "description": "...", "uploadDate": "2024-01-01"',
  },
  'AggregateRating': {
    icon: '⭐',
    headline: 'Ratings/reviews signal quality to AI',
    why: 'AggregateRating shows Google and AI models that real users have rated your product/service. Pages with ratings are perceived as more authoritative and trustworthy sources.',
    example: '"ratingValue": "4.8", "reviewCount": "1200", "bestRating": "5"',
  },
  'Product': {
    icon: '📦',
    headline: 'Product/software metadata for AI shopping',
    why: 'Product and SoftwareApplication schema lets AI tools compare and recommend your offerings. Perplexity and Google AI use this for product comparison queries.',
    example: '"name": "Scaler Pro", "offers": { "@type": "Offer", "price": "999", "priceCurrency": "INR" }',
  },
  'LocalBusiness': {
    icon: '📍',
    headline: 'Local presence for location-based AI queries',
    why: 'LocalBusiness schema gives AI models your address, hours, phone, and geo-coordinates. Critical for "near me" queries and for AI tools answering location-specific questions.',
    example: '"address": { "@type": "PostalAddress", "streetAddress": "...", "addressLocality": "Bengaluru" }, "telephone": "..."',
  },
}

function SchemaMarkupPanel({ geo }: { geo: GEOResult }) {
  const [expanded, setExpanded] = useState(false)

  const schemas = [
    { key: 'Organization', present: geo.aiSchema?.organization },
    { key: 'WebSite', present: geo.aiSchema?.website },
    { key: 'Article', present: geo.aiSchema?.article },
    { key: 'FAQPage', present: geo.aiSchema?.faq },
    { key: 'Person', present: geo.aiSchema?.person },
    { key: 'BreadcrumbList', present: geo.aiSchema?.breadcrumb },
    { key: 'speakable', present: geo.aiSchema?.speakable },
    { key: 'sameAs', present: geo.aiSchema?.sameAs },
    { key: 'HowTo', present: geo.aiSchema?.howTo },
    { key: 'Event', present: geo.aiSchema?.event },
    { key: 'VideoObject', present: geo.aiSchema?.video },
    { key: 'AggregateRating', present: geo.aiSchema?.review },
    { key: 'Product', present: geo.aiSchema?.product },
    { key: 'LocalBusiness', present: geo.aiSchema?.localBusiness },
  ]

  const foundCount = schemas.filter(s => s.present).length

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-heading font-mono text-sm uppercase tracking-wider flex items-center gap-2">
          <Star size={16} className="text-cyan-DEFAULT" />
          AI-Relevant Schema Markup
        </h3>
        <span className="text-xs font-mono px-2 py-0.5 rounded-full" style={{
          background: foundCount >= 4 ? 'rgba(0,255,138,0.1)' : foundCount >= 2 ? 'rgba(255,183,64,0.1)' : 'rgba(255,64,64,0.1)',
          color: foundCount >= 4 ? '#00FF8A' : foundCount >= 2 ? '#FFB740' : '#FF6B6B',
          border: `1px solid ${foundCount >= 4 ? 'rgba(0,255,138,0.3)' : foundCount >= 2 ? 'rgba(255,183,64,0.3)' : 'rgba(255,64,64,0.3)'}`,
        }}>{foundCount}/{schemas.length} present</span>
      </div>
      <p className="text-muted text-xs mb-4">Structured data (JSON-LD) that helps AI models understand what your site is, who runs it, and what it contains.</p>

      {/* Chip grid */}
      <div className="flex flex-wrap gap-2 mb-4">
        {schemas.map(({ key, present }) => (
          <SchemaChip key={key} label={key} present={!!present} />
        ))}
      </div>

      {/* Expand/collapse explainer */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs font-mono text-cyan-DEFAULT hover:text-white transition-colors"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {expanded ? 'Hide' : 'What does each schema type do?'}
      </button>

      {expanded && (
        <div className="mt-4 space-y-3">
          {/* Highlight FAQ + WebSite first */}
          <div className="p-3 rounded-lg" style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.15)' }}>
            <p className="text-cyan-DEFAULT text-xs font-mono font-medium mb-1">💡 Most impactful for AI citations</p>
            <p className="text-muted text-xs leading-relaxed">
              <strong className="text-heading">FAQPage</strong> and <strong className="text-heading">WebSite+SearchAction</strong> are the two schema types that most directly boost AI visibility — they tell AI tools what questions you answer and confirm your site's identity. If you're missing either, add them first.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {schemas.map(({ key, present }) => {
              const info = SCHEMA_INFO[key]
              if (!info) return null
              return (
                <div
                  key={key}
                  className="p-3 rounded-lg"
                  style={{
                    background: present ? 'rgba(0,255,138,0.04)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${present ? 'rgba(0,255,138,0.15)' : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  <div className="flex items-start gap-2 mb-1.5">
                    <span className="text-base flex-shrink-0">{info.icon}</span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-heading text-xs font-mono font-medium">{key}</span>
                        <span className={`text-xs font-mono ${present ? 'text-success' : 'text-error'}`}>
                          {present ? '✓ Found' : '✗ Missing'}
                        </span>
                      </div>
                      <p className="text-cyan-DEFAULT text-xs font-medium mt-0.5">{info.headline}</p>
                    </div>
                  </div>
                  <p className="text-muted text-xs leading-relaxed mb-2">{info.why}</p>
                  {info.example && (
                    <div className="text-xs font-mono text-muted p-2 rounded" style={{ background: 'rgba(0,0,0,0.3)' }}>
                      <span className="text-muted opacity-60 block mb-0.5">Example JSON-LD snippet:</span>
                      <span className="text-cyan-DEFAULT opacity-70">{info.example}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function GEOSection({ geo }: { geo: GEOResult }) {
  const crawlers: Array<[string, string]> = [
    ['GPTBot (ChatGPT)', 'gptBot'],
    ['ClaudeBot (Anthropic)', 'claudeBot'],
    ['PerplexityBot', 'perplexityBot'],
    ['Bingbot (Copilot)', 'bingBot'],
    ['CCBot (Common Crawl)', 'ccBot'],
    ['anthropic-ai', 'anthropicAI'],
  ]

  const radarData = [
    { subject: 'AI Access', value: Object.values(geo.crawlerAccess || {}).filter(v => v === 'allowed').length * 17 },
    { subject: 'Schema', value: Math.round(Object.values(geo.aiSchema || {}).filter(Boolean).length / 14 * 100) },
    { subject: 'E-E-A-T', value: Math.round(Object.values(geo.eeat || {}).filter(Boolean).length / 9 * 100) },
    { subject: 'llms.txt', value: geo.llmsTxt?.exists ? (geo.llmsTxt.wellFormatted ? 100 : 60) : 0 },
    { subject: 'Citability', value: geo.citability?.score || 0 },
  ]

  const platforms: Array<[string, string, keyof typeof geo.platforms]> = [
    ['Google AI Overviews', '🔍', 'googleAI'],
    ['ChatGPT Web Search', '🤖', 'chatgpt'],
    ['Perplexity AI', '⚡', 'perplexity'],
    ['Google Gemini', '✨', 'gemini'],
    ['Bing Copilot', '🔷', 'bingCopilot'],
  ]

  const errors = geo.issues?.filter(i => i.type === 'error') || []
  const warnings = geo.issues?.filter(i => i.type === 'warning') || []

  return (
    <div className="space-y-6">
      {/* GEO Explainer */}
      <GEOExplainerBanner />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-heading text-2xl font-display tracking-wide">GEO ANALYSIS</h2>
          <p className="text-muted text-sm mt-1">Generative Engine Optimization audit</p>
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
            <p className="font-display text-2xl" style={{ color: '#00FF8A' }}>{geo.passes?.length || 0}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* AI Crawler Access */}
        <div className="glass-card p-5">
          <h3 className="text-heading font-mono text-sm uppercase tracking-wider mb-1 flex items-center gap-2">
            <Bot size={16} className="text-cyan-DEFAULT" />
            AI Crawler Access
          </h3>
          <p className="text-muted text-xs mb-4">Can AI bots read your pages? Blocked = never cited.</p>
          <div className="space-y-2">
            {crawlers.map(([label, key]) => (
              <CrawlerBadge
                key={key}
                name={label}
                status={(geo.crawlerAccess?.[key as keyof typeof geo.crawlerAccess] as 'allowed' | 'blocked' | 'unknown') || 'unknown'}
              />
            ))}
          </div>
          <p className="text-muted text-xs mt-3 p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
            ℹ️ These bots are controlled via your <code className="text-cyan-DEFAULT">robots.txt</code> file
          </p>
        </div>

        {/* AI Platform Readiness */}
        <div className="glass-card p-5">
          <h3 className="text-heading font-mono text-sm uppercase tracking-wider mb-1 flex items-center gap-2">
            <Cpu size={16} className="text-cyan-DEFAULT" />
            AI Platform Readiness
          </h3>
          <p className="text-muted text-xs mb-4">How likely each AI is to cite your site in its answers.</p>
          <div className="space-y-4">
            {platforms.map(([name, icon, key]) => (
              <PlatformBar key={key} name={name} icon={icon} score={geo.platforms?.[key] || 0} />
            ))}
          </div>
          <p className="text-muted text-xs mt-3">Score is based on crawler access + schema + E-E-A-T + llms.txt</p>
        </div>
      </div>

      {/* llms.txt & Schema */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* llms.txt */}
        <div className="glass-card p-5">
          <h3 className="text-heading font-mono text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
            <FileSearch size={16} className="text-cyan-DEFAULT" />
            llms.txt
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-body text-sm">File present</span>
              <span className={`text-sm font-mono font-medium ${geo.llmsTxt?.exists ? 'text-success' : 'text-error'}`}>
                {geo.llmsTxt?.exists ? '✓ Found' : '✗ Missing'}
              </span>
            </div>
            {geo.llmsTxt?.exists && (
              <div className="flex items-center justify-between">
                <span className="text-body text-sm">Well formatted</span>
                <span className={`text-sm font-mono font-medium ${geo.llmsTxt.wellFormatted ? 'text-success' : 'text-warning'}`}>
                  {geo.llmsTxt.wellFormatted ? '✓ Yes' : '⚠ Basic'}
                </span>
              </div>
            )}
            {geo.llmsTxt?.content && (
              <div className="mt-3 p-3 rounded-lg text-xs font-mono text-muted overflow-auto max-h-32" style={{ background: 'rgba(0,0,0,0.3)' }}>
                {geo.llmsTxt.content}
              </div>
            )}
            {!geo.llmsTxt?.exists && (
              <div className="p-3 rounded-lg" style={{ background: 'rgba(255,64,64,0.08)', border: '1px solid rgba(255,64,64,0.2)' }}>
                <p className="text-xs text-error">Create /llms.txt to give AI models context about your site. See llmstxt.org for the spec.</p>
              </div>
            )}
          </div>
        </div>

        {/* E-E-A-T */}
        <div className="glass-card p-5">
          <h3 className="text-heading font-mono text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
            <Shield size={16} className="text-cyan-DEFAULT" />
            E-E-A-T Signals
          </h3>
          <div className="space-y-2.5">
            {[
              { label: 'About Page', ok: geo.eeat?.hasAboutPage },
              { label: 'Contact Page', ok: geo.eeat?.hasContactPage },
              { label: 'Privacy Policy', ok: geo.eeat?.hasPrivacyPolicy },
              { label: 'Terms of Service', ok: geo.eeat?.hasTerms },
              { label: 'Author Information', ok: geo.eeat?.hasAuthorInfo },
              { label: 'Social Profile Links', ok: geo.eeat?.hasLinkedInOrSocial },
              { label: 'External Citations', ok: geo.eeat?.hasExternalLinks },
              { label: 'Fresh Content (< 1yr)', ok: geo.eeat?.hasFreshContent },
              { label: 'Question Headings (H2/H3?)', ok: geo.eeat?.hasQuestionHeadings },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-body text-sm">{item.label}</span>
                <span className={`text-xs font-mono font-medium ${item.ok ? 'text-success' : 'text-error'}`}>
                  {item.ok ? '✓' : '✗'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Schema */}
      <SchemaMarkupPanel geo={geo} />

      {/* Citability */}
      <div className="glass-card p-5">
        <h3 className="text-heading font-mono text-sm uppercase tracking-wider mb-4">Citability Score</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <p className="text-muted text-xs font-mono">Score</p>
            <p className="font-display text-3xl text-cyan-DEFAULT mt-1">{geo.citability?.score || 0}</p>
          </div>
          <div className="text-center p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <p className="text-muted text-xs font-mono">Content Depth</p>
            <p className={`font-mono text-sm mt-2 font-medium uppercase ${
              geo.citability?.contentDepth === 'deep' ? 'text-success' :
              geo.citability?.contentDepth === 'medium' ? 'text-warning' : 'text-error'
            }`}>{geo.citability?.contentDepth || 'N/A'}</p>
          </div>
          <div className="text-center p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <p className="text-muted text-xs font-mono">Ext. Links</p>
            <p className="font-display text-3xl mt-1" style={{ color: '#AAFF3E' }}>{geo.citability?.externalLinkCount || 0}</p>
          </div>
          <div className="text-center p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <p className="text-muted text-xs font-mono">Structured</p>
            <p className={`font-mono text-sm mt-2 font-medium ${geo.citability?.hasStructuredContent ? 'text-success' : 'text-error'}`}>
              {geo.citability?.hasStructuredContent ? '✓ Yes' : '✗ No'}
            </p>
          </div>
        </div>
      </div>

      {/* Issues & Passes */}
      {geo.issues && geo.issues.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-heading font-mono text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
            <AlertCircle size={16} className="text-warning" />
            Issues Found ({geo.issues.length})
          </h3>
          <div className="space-y-2">
            {geo.issues.map((issue, i) => <IssueItem key={i} issue={issue} />)}
          </div>
        </div>
      )}

      {geo.passes && geo.passes.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-heading font-mono text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-success" />
            Passing Checks ({geo.passes.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {geo.passes.map((p, i) => (
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
