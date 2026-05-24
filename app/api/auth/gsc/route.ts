/**
 * GET /api/auth/gsc
 * Redirects to Google OAuth consent screen.
 * User lands here from the "Connect GSC" button.
 */
import { NextResponse } from 'next/server'

export async function GET() {
  const clientId    = process.env.GSC_CLIENT_ID
  const redirectUri = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/gsc/callback`
    : 'http://localhost:3000/api/auth/gsc/callback'

  if (!clientId) {
    return NextResponse.json(
      { error: 'GSC_CLIENT_ID not set in .env.local. See setup instructions.' },
      { status: 500 }
    )
  }

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         'https://www.googleapis.com/auth/webmasters.readonly',
    access_type:   'offline',
    prompt:        'consent',    // force refresh_token every time
  })

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}
