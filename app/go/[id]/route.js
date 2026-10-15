import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { localizeStoreUrl } from '@/lib/store-locale'

export const dynamic = 'force-dynamic'

// Avvolge una URL di destinazione nel deep-link di Skimlinks, così il click
// viene monetizzato. Si attiva SOLO se la env var SKIMLINKS_ID è impostata
// (es. "303796X1791855"): finché Skimlinks non è approvato, lascia la var vuota
// e i link puntano direttamente al negozio, senza rompere nulla.
// Stores where MISE is approved on Awin directly. A click on any of their product
// pages goes out through the Awin deep link, so the sale is credited even when the
// product was saved with the plain store URL. Giulio, 2026-10-15: Italist approved
// (aid 127855), Vilebrequin approved 2026-10-13 (aid 70917).
const AWIN_AFFID = '2884775'
const AWIN_DIRECT = [
  { hosts: ['italist.com', 'www.italist.com'], mid: '127855' },
  { hosts: ['vilebrequin.com', 'www.vilebrequin.com'], mid: '70917' },
]

function awinDirect(destUrl, subId) {
  let host = ''
  try {
    host = new URL(destUrl).hostname.toLowerCase()
  } catch (e) {
    return null
  }
  const m = AWIN_DIRECT.find((s) => s.hosts.includes(host))
  if (!m) return null
  const parts = [`awinmid=${m.mid}`, `awinaffid=${AWIN_AFFID}`]
  if (subId) parts.push(`clickref=${encodeURIComponent(String(subId).slice(0, 50))}`)
  parts.push(`ued=${encodeURIComponent(destUrl)}`)
  return `https://www.awin1.com/cread.php?${parts.join('&')}`
}

function wrapAffiliate(destUrl, subId) {
  if (!destUrl) return destUrl
  const direct = awinDirect(destUrl, subId)
  if (direct) return direct
  // Non ri-avvolgere link gia affiliati Awin/Hugo Boss o gia wrappati
  if (/awin1\.com|sovrn\.co|skimresources\.com|redirect\.viglink/i.test(destUrl)) return destUrl
  if (!/^https?:\/\//i.test(destUrl)) return destUrl

  // Skimlinks se attivo
  const skim = process.env.SKIMLINKS_ID
  if (skim) {
    const parts = [
      `id=${encodeURIComponent(skim)}`,
      'xs=1',
      `url=${encodeURIComponent(destUrl)}`,
    ]
    if (subId) parts.push(`xcust=${encodeURIComponent(String(subId).slice(0, 50))}`)
    return `https://go.skimresources.com/?${parts.join('&')}`
  }

  // Sovrn Commerce se attivo, env SOVRN_COMMERCE_KEY
  const sovrn = process.env.SOVRN_COMMERCE_KEY
  if (sovrn) {
    const parts = [
      `key=${encodeURIComponent(sovrn)}`,
      `u=${encodeURIComponent(destUrl)}`,
    ]
    if (subId) parts.push(`cuid=${encodeURIComponent(String(subId).slice(0, 100))}`)
    return `https://sovrn.co/?${parts.join('&')}`
  }

  // Nessun network attivo: redirect diretto al negozio
  return destUrl
}

export async function GET(request, { params }) {
  const { id } = await params
  const url = new URL(request.url)
  const outfitId = url.searchParams.get('outfit') || null

  // Recupera il prodotto dal DB
  const { data: product, error } = await supabaseAdmin
    .from('products')
    .select('id, affiliate_url, in_stock')
    .eq('id', id)
    .single()

  if (error || !product || !product.affiliate_url) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Estrai info utili dalla request (per analytics)
  const country = request.headers.get('x-vercel-ip-country') || null
  const userAgent = request.headers.get('user-agent') || null
  const referer = request.headers.get('referer') || null

  // First-touch attribution written by <Attribution /> into the mise_attr cookie
  let attr = {}
  try {
    const cookieHeader = request.headers.get('cookie') || ''
    const m = cookieHeader.match(/(?:^|;\s*)mise_attr=([^;]+)/)
    if (m) attr = JSON.parse(decodeURIComponent(m[1])) || {}
  } catch (e) {
    attr = {}
  }

  // Tag bots at write time so the clicks table stays honest. Until October 2026
  // over 95% of the logged clicks were link checkers and pin validators posing as
  // desktop Chrome, so beyond the user agent we also look at what a real browser
  // always sends on a click: a language, and a navigation fetch mode.
  const uaBot = userAgent
    ? /(bot|crawler|spider|slurp|scrapy|headless|phantom|selenium|puppeteer|playwright|python|curl|wget|axios|okhttp|go-http|java\/|libwww|httpclient|meta-externalagent|facebookexternalhit|pinterest|semrush|ahrefs|mj12|dotbot|petal|yandex|dataprovider|bingpreview|applebot|amazonbot|bytespider|gptbot|ccbot|claude|anthropic|perplexity)/i.test(userAgent) ||
      /(iPhone OS (9|10|11|12|13)_|Nexus 5X Build\/MMB29P|Android [4-6]\.)/i.test(userAgent)
    : true
  const lang = request.headers.get('accept-language')
  const fetchMode = request.headers.get('sec-fetch-mode')
  const purpose = (request.headers.get('sec-purpose') || request.headers.get('purpose') || '').toLowerCase()
  const isPrefetch = purpose.includes('prefetch') || purpose.includes('prerender')
  // Pinterest app clicks come from its in-app browser (mobile UA); a desktop UA
  // arriving from a pin with no MISE cookie is the pin validator.
  const isMobile = /(iPhone|iPad|Android|Mobile)/i.test(userAgent || '')
  const pinChecker = !isMobile && /pinterest\./i.test(referer || '') && !attr.s && !attr.r
  let botReason = null
  if (uaBot) botReason = 'ua_token'
  else if (isPrefetch) botReason = 'prefetch'
  else if (!lang) botReason = 'no_language'
  else if (fetchMode && fetchMode !== 'navigate') botReason = 'not_navigation'
  else if (pinChecker) botReason = 'pin_validator'
  const isBot = botReason !== null

  // Genera un session ID lato server (semplice, basato su IP+UA hash)
  const sessionRaw = (request.headers.get('x-forwarded-for') || 'anon') + (userAgent || '')
  const sessionHash = await hashString(sessionRaw)

  // Registra il click in DB (non-blocking: non aspettiamo)
  supabaseAdmin
    .from('clicks')
    .insert({
      product_id: product.id,
      outfit_id: outfitId,
      user_session: sessionHash,
      country: country,
      referrer: referer,
      user_agent: userAgent ? userAgent.substring(0, 500) : null,
      utm_source: attr.s || null,
      utm_medium: attr.m || null,
      utm_campaign: attr.c || null,
      landing_ref: attr.r || null,
      is_bot: isBot,
      bot_reason: botReason,
    })
    .then(({ error }) => {
      if (error) console.error('[click-tracking] DB insert failed:', error.message)
    })

  // Redirect al link affiliato: avvolto in Skimlinks se SKIMLINKS_ID è attivo,
  // altrimenti diretto al negozio. xcust = outfit+prodotto per attribuzione.
  const subId = `${outfitId ? outfitId.slice(0, 8) + '_' : ''}${product.id}`
  // El pais del visitante antes que el pais desde el que se copio la foto. Si la
  // marca no esta en el mapa la URL sale intacta, asi que esto no puede romper nada.
  const localized = localizeStoreUrl(product.affiliate_url, country)
  const target = wrapAffiliate(localized, subId)

  return NextResponse.redirect(target, { status: 302 })
}

async function hashString(str) {
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('')
}
