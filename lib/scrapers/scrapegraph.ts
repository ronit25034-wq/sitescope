const SCRAPEGRAPH_API_KEY = process.env.SCRAPEGRAPH_API_KEY || ''
const BASE = 'https://api.scrapegraphai.com/v1'

export interface ScrapegraphContentAnalysis {
  qualityScore: number          // 0-100
  readingLevel: string          // e.g. "College", "High School"
  mainTopics: string[]          // top 3-5 topics
  contentType: string           // "article", "product", "landing page", etc.
  searchIntent: string          // "informational" | "transactional" | "navigational" | "commercial"
  intentConfidence: number      // 0-100
  uniqueInsights: string        // brief quality feedback
  targetAudience: string        // who this content is for
  missingElements: string[]     // what the content is missing
}

export async function scrapegraphAnalyzeContent(url: string): Promise<ScrapegraphContentAnalysis | null> {
  if (!SCRAPEGRAPH_API_KEY) return null
  try {
    const res = await fetch(`${BASE}/smartscraper`, {
      method: 'POST',
      headers: {
        'SGAI-APIKEY': SCRAPEGRAPH_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        website_url: url,
        user_prompt: `Analyze this webpage and return a JSON object with these exact fields:
{
  "qualityScore": <number 0-100, overall content quality>,
  "readingLevel": <string: "Elementary" | "Middle School" | "High School" | "College" | "Professional">,
  "mainTopics": <array of 3-5 main topic strings>,
  "contentType": <string: "article" | "blog post" | "product page" | "landing page" | "homepage" | "documentation" | "e-commerce" | "other">,
  "searchIntent": <string: "informational" | "transactional" | "navigational" | "commercial">,
  "intentConfidence": <number 0-100>,
  "uniqueInsights": <string: 1 sentence about content quality and what's done well or poorly>,
  "targetAudience": <string: brief description of who this is for>,
  "missingElements": <array of 2-3 strings describing what the content is missing for better SEO>
}
Return ONLY the JSON, no markdown, no explanation.`,
      }),
      signal: AbortSignal.timeout(30000),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('ScrapegraphAI error:', res.status, err)
      return null
    }

    const data = await res.json()
    const raw = data.result

    // Parse the result — it might be a string or already an object
    if (!raw) return null
    if (typeof raw === 'object') return raw as ScrapegraphContentAnalysis

    // Try to parse JSON from string result
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (jsonMatch) return JSON.parse(jsonMatch[0]) as ScrapegraphContentAnalysis
    } catch {}

    return null
  } catch (e) {
    console.error('ScrapegraphAI exception:', e)
    return null
  }
}

export interface ScrapegraphKeywords {
  primaryKeyword: string
  secondaryKeywords: string[]
  keywordDensity: Record<string, number>
  lsiKeywords: string[]
  missingKeywords: string[]
}

export async function scrapegraphExtractKeywords(url: string): Promise<ScrapegraphKeywords | null> {
  if (!SCRAPEGRAPH_API_KEY) return null
  try {
    const res = await fetch(`${BASE}/smartscraper`, {
      method: 'POST',
      headers: {
        'SGAI-APIKEY': SCRAPEGRAPH_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        website_url: url,
        user_prompt: `Extract SEO keywords from this webpage. Return a JSON object with these exact fields:
{
  "primaryKeyword": <string: the single most important target keyword>,
  "secondaryKeywords": <array of 4-6 secondary keyword strings>,
  "keywordDensity": <object: top 5 keywords as keys, percentage as number values>,
  "lsiKeywords": <array of 4-6 semantically related / LSI keyword strings>,
  "missingKeywords": <array of 3-4 keyword opportunities the page is missing>
}
Return ONLY the JSON, no markdown, no explanation.`,
      }),
      signal: AbortSignal.timeout(30000),
    })

    if (!res.ok) return null
    const data = await res.json()
    const raw = data.result
    if (!raw) return null
    if (typeof raw === 'object') return raw as ScrapegraphKeywords

    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (jsonMatch) return JSON.parse(jsonMatch[0]) as ScrapegraphKeywords
    } catch {}
    return null
  } catch (e) {
    console.error('ScrapegraphAI keywords exception:', e)
    return null
  }
}
