// Cloudflare Pages Function: same job as app/go/[id]/route.js on Vercel.
// Reads the product, logs the click, redirects through the affiliate network.
import { localizeStoreUrl } from '../../lib/store-locale.js'

const AWIN_AFFID = '2884775'
const AWIN_DIRECT = [
  { hosts: ['italist.com', 'www.italist.com'], mid: '127855' },
  { hosts: ['vilebrequin.com', 'www.vilebrequin.com'], mid: '70917' },
]

function wrapAffiliate(destUrl, subId, env) {
  if (!destUrl || !/^https?:\/\//i.test(destUrl)) return destUrl
  let host = ''
  try { host = new URL(destUrl).hostname.toLowerCase() } catch (e) { return destUrl }
  const m = AWIN_DIRECT.find((s) => s.hosts.includes(host))
  if (m) {
    const parts = [`awinmid=${m.mid}`, `awinaffid=${AWIN_AFFID}`]
    if (subId) parts.push(`clickref=${encodeURIComponent(String(subId).slice(0, 50))}`)
    parts.push(`ued=${encodeURIComponent(destUrl)}`)
    return `https://www.awin1.com/cread.php?${parts.join('&')}`
  }
  if (/awin1\.com|sovrn\.co|skimresources\.com|redirect\.viglink|tradedoubler\.com|linksynergy\.com/i.test(destUrl)) return destUrl
  if (env.SKIMLINKS_ID) {
    const parts = [`id=${encodeURIComponent(env.SKIMLINKS_ID)}`, 'xs=1', `url=${encodeURIComponent(destUrl)}`]
    if (subId) parts.push(`xcust=${encodeURIComponent(String(subId).slice(0, 50))}`)
    return `https://go.skimresources.com/?${parts.join('&')}`
  }
  if (env.SOVRN_COMMERCE_KEY) {
    const parts = [`key=${encodeURIComponent(env.SOVRN_COMMERCE_KEY)}`, `u=${encodeURIComponent(destUrl)}`]
    if (subId) parts.push(`cuid=${encodeURIComponent(String(subId).slice(0, 100))}`)
    return `https://sovrn.co/?${parts.join('&')}`
  }
  return destUrl
}

const BOT_UA = /(bot|crawler|spider|slurp|scrapy|headless|phantom|selenium|puppeteer|playwright|python|curl|wget|axios|okhttp|go-http|java\/|libwww|httpclient|meta-externalagent|facebookexternalhit|pinterest|semrush|ahrefs|mj12|dotbot|petal|yandex|dataprovider|bingpreview|applebot|amazonbot|bytespider|gptbot|ccbot|claude|anthropic|perplexity)/i
const OLD_UA = /(iPhone OS (9|10|11|12|13)_|Nexus 5X Build\/MMB29P|Android [4-6]\.)/i

export async function onRequestGet({ request, params, env, waitUntil }) {
  const url = new URL(request.url)
  const id = String(params.id || '')
  const outfitId = url.searchParams.get('outfit') || null
  const base = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const home = Response.redirect(url.origin + '/', 302)
  if (!base || !key || !/^[0-9a-f-]{36}$/i.test(id)) return home
  const H = { apikey: key, Authorization: `Bearer ${key}` }

  let product = null
  try {
    const r = await fetch(`${base}/rest/v1/products?id=eq.${id}&select=id,affiliate_url`, { headers: H })
    product = (await r.json())[0] || null
  } catch (e) {}
  if (!product || !product.affiliate_url) return home

  const h = request.headers
  const country = (request.cf && request.cf.country) || h.get('cf-ipcountry') || null
  const ua = h.get('user-agent') || null
  const referer = h.get('referer') || null
  let attr = {}
  try {
    const m = (h.get('cookie') || '').match(/(?:^|;\s*)mise_attr=([^;]+)/)
    if (m) attr = JSON.parse(decodeURIComponent(m[1])) || {}
  } catch (e) {}
  const purpose = (h.get('sec-purpose') || h.get('purpose') || '').toLowerCase()
  const fetchMode = h.get('sec-fetch-mode')
  const isMobile = /(iPhone|iPad|Android|Mobile)/i.test(ua || '')
  let botReason = null
  if (!ua || BOT_UA.test(ua) || OLD_UA.test(ua)) botReason = 'ua_token'
  else if (purpose.includes('prefetch') || purpose.includes('prerender')) botReason = 'prefetch'
  else if (!h.get('accept-language')) botReason = 'no_language'
  else if (fetchMode && fetchMode !== 'navigate') botReason = 'not_navigation'
  else if (!isMobile && /pinterest\./i.test(referer || '') && !attr.s && !attr.r) botReason = 'pin_validator'
  const isBot = botReason !== null

  const raw = new TextEncoder().encode((h.get('cf-connecting-ip') || 'anon') + (ua || ''))
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', raw))).slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('')

  // Click log, never blocks the redirect. Needs the service key (RLS).
  if (env.SUPABASE_SERVICE_ROLE_KEY) {
    waitUntil(fetch(`${base}/rest/v1/clicks`, {
      method: 'POST',
      headers: { ...H, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({
        product_id: product.id, outfit_id: outfitId, user_session: hash, country, referrer: referer,
        user_agent: ua ? ua.substring(0, 500) : null, utm_source: attr.s || null, utm_medium: attr.m || null,
        utm_campaign: attr.c || null, landing_ref: attr.r || null, is_bot: isBot, bot_reason: botReason,
      }),
    }).catch(() => {}))
  }

  const subId = `${outfitId ? outfitId.slice(0, 8) + '_' : ''}${product.id}`
  const localized = localizeStoreUrl(product.affiliate_url, country)
  const target = isBot ? localized : wrapAffiliate(localized, subId, env)
  return new Response(null, { status: 302, headers: { Location: target, 'Cache-Control': 'no-store' } })
}
