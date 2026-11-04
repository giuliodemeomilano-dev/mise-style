// Cloudflare Pages Function. Serves the cut-outs pre-computed at build time by
// scripts/cf-cutouts.mjs (same algorithm as the Vercel /api/cutout route).
// A product added after the last build falls back to its original packshot.
// ?debug=1 answers { verdict, box } like the Vercel route, or verdict "pending"
// when the product has not been through a build yet.
const ALLOWED = ['media.cos.com', 'static.massimodutti.net', 'cdn.shopify.com', 'images.hugoboss.com', 'mejuri.com',
  'eu.sunspel.com', 'd8j0ntlcm91z4.cloudfront.net', 'media.arket.com', 'eu.sandro-paris.com', 'media.veja-store.com',
  'media.occtoo.com', 'www.jacquemus.com', 'www.sunspel.fr', 'www.polene-paris.com']

async function keyOf(p) {
  const d = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(p))
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 20)
}

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url)
  const debug = u.searchParams.get('debug') === '1'
  const stored = (u.pathname + u.search).replace(/([?&])debug=1(&|$)/, '$1').replace(/[?&]$/, '')
  const key = await keyOf(stored)
  const cors = { 'Access-Control-Allow-Origin': '*' }
  if (debug) {
    const r = await env.ASSETS.fetch(new URL('/cutouts/' + key + '.json', u))
    if (r.ok) return new Response(await r.text(), { headers: { ...cors, 'Content-Type': 'application/json' } })
    return Response.json({ verdict: 'pending', reason: 'computed at the next Cloudflare build' }, { headers: cors })
  }
  const r = await env.ASSETS.fetch(new URL('/cutouts/' + key + '.webp', u))
  if (r.ok) {
    return new Response(r.body, { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=86400' } })
  }
  const target = u.searchParams.get('url') || ''
  let host = ''
  try { host = new URL(target).hostname } catch (e) {}
  if (!(ALLOWED.includes(host) || host.endsWith('.shopify.com'))) return new Response('bad url', { status: 400 })
  return new Response(null, { status: 302, headers: { Location: target, 'Cache-Control': 'public, max-age=3600' } })
}
