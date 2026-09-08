import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const API = 'https://api.pinterest.com/v5'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// Same gate as the other write routes: the password travels in a header, never a query
// string, so it does not end up in a log or a browser history entry.
function allowed(request) {
  const pw = request.headers.get('x-admin-pw')
  return Boolean(process.env.ADMIN_PASSWORD) && pw === process.env.ADMIN_PASSWORD
}

async function token() {
  const { data } = await admin()
    .from('app_settings')
    .select('value')
    .eq('key', 'pinterest_access_token')
    .maybeSingle()
  return data && data.value ? data.value : null
}

// GET tells the admin page whether we are connected and which boards exist. It answers
// with a boolean, never with the token itself.
export async function GET(request) {
  if (!allowed(request)) return NextResponse.json({ error: 'not allowed' }, { status: 401 })
  const t = await token()
  if (!t) return NextResponse.json({ connected: false, boards: [] })

  const res = await fetch(API + '/boards?page_size=50', {
    headers: { Authorization: 'Bearer ' + t },
    cache: 'no-store',
  })
  const body = await res.json()
  if (!res.ok) {
    return NextResponse.json(
      { connected: true, boards: [], error: body.message || 'Pinterest refused the board list' },
      { status: 200 }
    )
  }
  const boards = (body.items || []).map((b) => ({ id: b.id, name: b.name }))
  return NextResponse.json({ connected: true, boards })
}

// POST publishes one look as a standard Pin. The image is the one this site already
// renders at /api/pin/<slug>; Pinterest fetches it by URL, which is why that route now
// carries cache headers instead of rebuilding itself on every request.
export async function POST(request) {
  if (!allowed(request)) return NextResponse.json({ error: 'not allowed' }, { status: 401 })

  const t = await token()
  if (!t) return NextResponse.json({ error: 'Pinterest is not connected yet' }, { status: 400 })

  let payload
  try {
    payload = await request.json()
  } catch (e) {
    return NextResponse.json({ error: 'bad request body' }, { status: 400 })
  }
  const { slug, boardId, format } = payload || {}
  if (!slug || !boardId) {
    return NextResponse.json({ error: 'slug and boardId are both required' }, { status: 400 })
  }

  const { data: outfit } = await admin()
    .from('outfits')
    .select('slug, title, description, gender, occasion, season')
    .eq('slug', slug)
    .maybeSingle()
  if (!outfit) return NextResponse.json({ error: 'no outfit with that slug' }, { status: 404 })

  const origin = new URL(request.url).origin
  const image =
    origin + '/api/pin/' + encodeURIComponent(slug) +
    (format ? '?format=' + encodeURIComponent(format) + '&bg=riviera' : '?bg=riviera')
  const link =
    'https://www.mise.style/look/' + encodeURIComponent(slug) +
    '?utm_source=Pinterest&utm_medium=organic'

  const description =
    [outfit.title, outfit.description].filter(Boolean).join('. ') +
    ' Shop the entire look on MISE.'

  const res = await fetch(API + '/pins', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + t,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      board_id: boardId,
      title: outfit.title,
      description,
      link,
      media_source: { source_type: 'image_url', url: image },
    }),
  })
  const body = await res.json()
  if (!res.ok) {
    return NextResponse.json(
      { error: body.message || 'Pinterest refused the pin', status: res.status },
      { status: 502 }
    )
  }
  return NextResponse.json({ ok: true, pinId: body.id, image })
}
