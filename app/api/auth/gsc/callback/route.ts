/**
 * GET /api/auth/gsc/callback
 * Handles Google OAuth callback — exchanges code for tokens,
 * saves refresh_token to Supabase, discovers GSC sites, redirects to app.
 */
import { NextRequest, NextResponse } from 'next/server'
import { saveSetting } from '@/lib/supabase'
import { listGSCSites } from '@/lib/analyzers/rank-tracking'

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const code   = req.nextUrl.searchParams.get('code')
  const error  = req.nextUrl.searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/?gsc_error=${error || 'no_code'}`)
  }

  const clientId     = process.env.GSC_CLIENT_ID!
  const clientSecret = process.env.GSC_CLIENT_SECRET!
  const redirectUri  = `${appUrl}/api/auth/gsc/callback`

  try {
    // Exchange auth code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  redirectUri,
        grant_type:    'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      return NextResponse.redirect(`${appUrl}/?gsc_error=token_exchange_failed&detail=${encodeURIComponent(err)}`)
    }

    const tokens = await tokenRes.json() as {
      access_token: string
      refresh_token: string
      expires_in: number
    }

    if (!tokens.refresh_token) {
      return NextResponse.redirect(`${appUrl}/?gsc_error=no_refresh_token`)
    }

    // Save tokens to Supabase
    await saveSetting('gsc_token', {
      refresh_token: tokens.refresh_token,
      access_token:  tokens.access_token,
      expiry:        Date.now() + tokens.expires_in * 1000,
    })

    // Auto-discover first GSC property and save it
    const sites = await listGSCSites()
    if (sites.length > 0) {
      await saveSetting('gsc_site_url', sites[0].siteUrl)
      await saveSetting('gsc_sites', sites)
    }

    return NextResponse.redirect(`${appUrl}/?gsc_connected=1&sites=${sites.length}`)
  } catch (e) {
    return NextResponse.redirect(`${appUrl}/?gsc_error=${encodeURIComponent(String(e))}`)
  }
}
