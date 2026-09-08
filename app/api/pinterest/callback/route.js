import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// Step two of the Pinterest login. Pinterest sends the user back here with a code that
// is good for one swap and a few minutes. We trade it for an access token and park the
// token in app_settings.
//
// The token is a credential, so it is treated like one: it is written straight to the
// database from the server, it is never rendered into the page, never logged, and never
// returned by any route. The admin page only ever learns whether one exists.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const back = (q) => NextResponse.redirect(origin + '/admin/pinterest?' + q)

  const denied = searchParams.get('error')
  if (denied) return back('error=' + encodeURIComponent(denied))

  // The console can aim at the sandbox instead of the real API. A Trial app cannot create
  // a Pin in production AT ALL (measured 2026-09-08), so the sandbox is the only place the
  // publish step can be shown working, which is what the Standard upgrade video needs.
  // The choice travelled here inside `state`. It has to be remembered, because a sandbox
  // token is NOT valid against api.pinterest.com: the two are stored under separate keys.
  const sandbox = searchParams.get('state') === 'mise-sandbox'
  const API = sandbox ? 'https://api-sandbox.pinterest.com' : 'https://api.pinterest.com'
  const suffix = sandbox ? '_sandbox' : ''

  const code = searchParams.get('code')
  if (!code) return back('error=' + encodeURIComponent('Pinterest did not send a code'))

  const id = process.env.PINTEREST_APP_ID
  const secret = process.env.PINTEREST_APP_SECRET
  if (!id || !secret) {
    return back('error=' + encodeURIComponent('PINTEREST_APP_ID or PINTEREST_APP_SECRET is missing'))
  }

  let data
  try {
    const res = await fetch(API + '/v5/oauth/token', {
      method: 'POST',
      headers: {
        // Pinterest wants the app id and secret as HTTP Basic, not in the body.
        Authorization: 'Basic ' + Buffer.from(id + ':' + secret).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        // Must be byte-for-byte the redirect_uri used to get the code.
        redirect_uri: origin + '/api/pinterest/callback',
      }).toString(),
    })
    data = await res.json()
    if (!res.ok || !data.access_token) {
      return back('error=' + encodeURIComponent(data.message || 'token exchange refused'))
    }
  } catch (e) {
    return back('error=' + encodeURIComponent('token exchange failed'))
  }

  const rows = [
    { key: 'pinterest_access_token' + suffix, value: data.access_token, updated_at: new Date().toISOString() },
  ]
  if (data.refresh_token) {
    rows.push({ key: 'pinterest_refresh_token' + suffix, value: data.refresh_token, updated_at: new Date().toISOString() })
  }
  const { error } = await admin().from('app_settings').upsert(rows, { onConflict: 'key' })
  if (error) return back('error=' + encodeURIComponent('could not save the token'))

  return back(sandbox ? 'ok=1&sandbox=1' : 'ok=1')
}
