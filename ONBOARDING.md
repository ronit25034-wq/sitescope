# SiteScope — Build Guide for Claude Code

SiteScope is a full-stack SEO + GEO audit tool built with Next.js 14, TypeScript, Supabase, and deployed on Vercel. This guide will get you from zero to deployed in ~30 minutes.

---

## What You're Building

A web app that audits any website across 50+ signals:
- SEO (title, meta, Core Web Vitals, PageSpeed, schema)
- GEO / AI Visibility (ChatGPT, Perplexity, Gemini, Bing Copilot)
- Content quality (readability, E-E-A-T, keyword analysis)
- Domain authority (backlinks, Common Crawl, OpenPageRank)
- Rank tracking (Google Search Console keyword positions)
- PDF export for all audit types

**Live demo:** sitescope-xchw.vercel.app

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Hosting | Vercel |
| PDF | jsPDF |
| Charts | Recharts |
| HTML parsing | Cheerio |

---

## Step 1 — Clone the Repo

```bash
git clone https://github.com/ronit25034-wq/sitescope.git
cd sitescope
npm install
```

---

## Step 2 — Get Your API Keys

You need 6 free API keys. All are free, no credit card needed.

### 1. Google PageSpeed API (free)
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project
3. Go to **APIs & Services → Library** → enable **PageSpeed Insights API**
4. Go to **Credentials → Create Credentials → API Key**
5. Copy the key → `PAGESPEED_API_KEY`

### 2. Firecrawl (free tier — 500 credits)
1. Sign up at [firecrawl.dev](https://firecrawl.dev)
2. Go to dashboard → copy API key → `FIRECRAWL_API_KEY`

### 3. ScrapeGraph AI (free tier)
1. Sign up at [scrapegraphai.com](https://scrapegraphai.com)
2. Go to dashboard → copy API key → `SCRAPEGRAPH_API_KEY`

### 4. OpenPageRank (free)
1. Sign up at [openpagerank.com](https://openpagerank.com)
2. Copy API key → `OPEN_PAGERANK_KEY`

### 5. Supabase (free tier)
1. Sign up at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to **Settings → API**
4. Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
5. Copy **service_role secret** → `SUPABASE_SERVICE_KEY`
6. Go to **SQL Editor → New Query** → paste and run the contents of `supabase/schema.sql`

### 6. Google Search Console OAuth (for rank tracking)
1. Go to [console.cloud.google.com](https://console.cloud.google.com) → your project
2. **APIs & Services → Library** → enable **Google Search Console API**
3. **APIs & Services → OAuth consent screen** → External → fill app name → save
4. **Audience → Test users** → add your Gmail address
5. **Clients → Create Client → OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Redirect URI: `http://localhost:3000/api/auth/gsc/callback`
6. Copy **Client ID** → `GSC_CLIENT_ID`
7. Copy **Client Secret** → `GSC_CLIENT_SECRET`

---

## Step 3 — Create .env.local

Create a file called `.env.local` in the project root:

```env
PAGESPEED_API_KEY=your_key_here

FIRECRAWL_API_KEY=your_key_here
SCRAPEGRAPH_API_KEY=your_key_here

OPEN_PAGERANK_KEY=your_key_here

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key

GSC_CLIENT_ID=your_client_id.apps.googleusercontent.com
GSC_CLIENT_SECRET=GOCSPX-your_secret

NEXT_PUBLIC_APP_URL=http://localhost:3000
FETCH_TIMEOUT=15000
```

---

## Step 4 — Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — audit any website!

---

## Step 5 — Connect Google Search Console (for Rank Tracking)

1. Visit `http://localhost:3000/api/auth/gsc` in your browser
2. Sign in with the Google account that has your website in Search Console
3. Click **Allow**
4. You'll be redirected back — rank tracking is now live

> Note: Rank tracking only shows data for websites YOU own and have verified in Google Search Console.

---

## Step 6 — Deploy to Vercel

### Push to GitHub
```bash
git remote set-url origin https://YOUR_GITHUB_USERNAME:YOUR_PAT@github.com/YOUR_USERNAME/sitescope.git
git push -u origin main
```

### Deploy
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repo
3. Add all environment variables from `.env.local`
4. Change `NEXT_PUBLIC_APP_URL` to your Vercel URL (e.g. `https://sitescope-xxxx.vercel.app`)
5. Click **Deploy**

### After Deploy
1. Go to Google Cloud Console → your OAuth client → add redirect URI:
   `https://your-vercel-url.vercel.app/api/auth/gsc/callback`
2. Update `NEXT_PUBLIC_APP_URL` in Vercel env vars to your production URL
3. Redeploy

---

## Project Structure

```
sitescope/
├── app/
│   ├── api/
│   │   ├── analyze/route.ts        # Main audit API
│   │   └── auth/gsc/               # GSC OAuth flow
│   ├── page.tsx                    # Homepage
│   └── globals.css
├── components/
│   └── report/
│       ├── ReportView.tsx          # Main report container
│       ├── SEOSection.tsx          # SEO tab
│       ├── GEOSection.tsx          # GEO/AI tab
│       ├── ContentSection.tsx      # Content tab
│       ├── AuthoritySection.tsx    # Authority tab
│       └── RankTrackingSection.tsx # Rank tracking
├── lib/
│   ├── analyzers/
│   │   ├── seo.ts                  # SEO analysis
│   │   ├── geo.ts                  # GEO/AI analysis
│   │   ├── content.ts              # Content analysis
│   │   ├── authority.ts            # Domain authority
│   │   └── rank-tracking.ts        # GSC rank data
│   ├── scrapers/
│   │   ├── firecrawl.ts
│   │   └── scrapegraph.ts
│   ├── pdf-export.ts               # PDF generation
│   ├── supabase.ts                 # DB client + helpers
│   └── types.ts
└── supabase/
    └── schema.sql                  # Run this in Supabase SQL Editor
```

---

## Prompts Used to Build This (for Claude Code)

Ask Claude Code to build features using prompts like:

- *"Build a Next.js 14 SEO audit tool that fetches a URL and checks title, meta description, h1, canonical, robots, sitemap, SSL, and page speed"*
- *"Add a GEO section that checks if the site appears on ChatGPT, Perplexity, and Gemini using schema markup signals"*
- *"Add rank tracking using Google Search Console API with OAuth, store results in Supabase"*
- *"Generate a PDF report using jsPDF with all audit results — no Unicode characters"*
- *"Add a competitor comparison mode that audits two URLs side by side"*

---

## Cost

**$0/month** — everything runs on free tiers:
- Vercel Hobby: free
- Supabase free tier: 500MB DB, 2GB bandwidth
- Firecrawl: 500 free credits/month
- ScrapeGraph: free tier credits
- All other APIs: completely free

---

## Common Issues

**Build fails on Vercel with TypeScript Set error**
→ Use `Array.from(SET_NAME)` instead of `...SET_NAME` when spreading Sets

**PageSpeed cards show "Not available"**
→ Google's API times out on large sites — normal behavior, other checks still work

**Rank Tracking shows "Connect Google Search Console"**
→ Visit `/api/auth/gsc` and complete the OAuth flow

**Domain Authority shows N/A**
→ Add `OPEN_PAGERANK_KEY` to your env vars (free signup at openpagerank.com)
