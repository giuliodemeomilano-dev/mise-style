import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Step one of the Pinterest login. Sends the browser to Pinterest's own consent screen;
// Pinterest then hands the user back to /api/pinterest/callback with a short-lived code.
//
// Why the full OAuth dance instead of the one-click token in the developer portal: that
// quick token only carries pins:read, boards:read and user_accounts:read. It cannot
// publish. pins:write is the whole point of this app, and it only comes through here.
// boards:write is NOT optional. Measured 2026-09-08: with only pins:write, POST /v5/pins
// returns "Missing: ['boards:write']" and refuses, because creating a pin counts as writing
// into the board it lands in. Adding a scope means the OLD token stays invalid, the user has
// to walk through /api/pinterest/auth again to mint a new one.
const SCOPES = ['boards:read', 'boards:write', 'pins:read', 'pins:write']

export async function GET(request) {
  const appId = process.env.PINTEREST_APP_ID
  if (!appId) {
    return new NextResponse('PINTEREST_APP_ID is not set in the environment', { status: 500 })
  }
  const { origin, searchParams } = new URL(request.url)
  // Trial apps cannot create Pins against api.pinterest.com at all. Measured 2026-09-08:
  // "Apps with Trial access may not create Pins in production ... use API Sandbox instead".
  // So the console offers a sandbox switch, and the choice rides through the whole OAuth
  // flow inside `state`, which Pinterest hands back to the callback untouched.
  const sandbox = searchParams.get('sandbox') === '1'
  const url =
    'https://www.pinterest.com/oauth/?' +
    new URLSearchParams({
      client_id: appId,
      // Must match EXACTLY one of the redirect URIs registered on the app, or Pinterest
      // refuses before the user ever sees the consent screen.
      redirect_uri: origin + '/api/pinterest/callback',
      response_type: 'code',
      scope: SCOPES.join(','),
      state: sandbox ? 'mise-sandbox' : 'mise',
    }).toString()
  return NextResponse.redirect(url)
}
