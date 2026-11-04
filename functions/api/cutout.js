// Cloudflare Pages Function. The Vercel /api/cutout removes the background with
// sharp, which does not run here. This sends the browser to the original packshot;
// the page blends its white sweep away with mix-blend-mode: multiply.
const ALLOWED = ['media.cos.com', 'static.massimodutti.net', 'cdn.shopify.com', 'images.hugoboss.com', 'mejuri.com',
  'eu.sunspel.com', 'd8j0ntlcm91z4.cloudfront.net', 'media.arket.com', 'eu.sandro-paris.com', 'media.veja-store.com',
  'media.occtoo.com', 'www.jacquemus.com', 'www.sunspel.fr', 'www.polene-paris.com']

export async function onRequestGet({ request }) {
  const q = new URL(request.url).searchParams
  const target = q.get('url') || ''
  let host = ''
  try { host = new URL(target).hostname } catch (e) {}
  const ok = ALLOWED.includes(host) || host.endsWith('.shopify.com')
  if (q.get('debug')) {
    return Response.json({ verdict: 'refuse', reason: 'cutout runs on Vercel only' }, { headers: { 'Access-Control-Allow-Origin': '*' } })
  }
  if (!ok) return new Response('bad url', { status: 400 })
  return new Response(null, { status: 302, headers: { Location: target, 'Cache-Control': 'public, max-age=86400' } })
}
