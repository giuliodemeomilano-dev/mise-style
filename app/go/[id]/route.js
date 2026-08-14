import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// Avvolge una URL di destinazione nel deep-link di Skimlinks, così il click
// viene monetizzato. Si attiva SOLO se la env var SKIMLINKS_ID è impostata
// (es. "303796X1791855"): finché Skimlinks non è approvato, lascia la var vuota
// e i link puntano direttamente al negozio, senza rompere nulla.
function wrapAffiliate(destUrl, subId) {
  if (!destUrl) return destUrl
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

  // Tag obvious bots at write time so the clicks table stays honest
  const isBot = userAgent
    ? /(bot|crawler|spider|slurp|scrapy|headless|phantom|selenium|puppeteer|playwright|python|curl|wget|axios|okhttp|go-http|java\/|libwww|httpclient|meta-externalagent|facebookexternalhit|pinterest|semrush|ahrefs|mj12|dotbot|petal|yandex|dataprovider|bingpreview|applebot|amazonbot|bytespider|gptbot|ccbot|claude|anthropic|perplexity)/i.test(userAgent) ||
      /(iPhone OS (9|10|11|12|13)_|Nexus 5X Build\/MMB29P|Android [4-6]\.)/i.test(userAgent)
    : true

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
      bot_reason: isBot ? 'ua_token' : null,
    })
    .then(({ error }) => {
      if (error) console.error('[click-tracking] DB insert failed:', error.message)
    })

  // Redirect al link affiliato: avvolto in Skimlinks se SKIMLINKS_ID è attivo,
  // altrimenti diretto al negozio. xcust = outfit+prodotto per attribuzione.
  const subId = `${outfitId ? outfitId.slice(0, 8) + '_' : ''}${product.id}`
  const target = wrapAffiliate(product.affiliate_url, subId)

  return NextResponse.redirect(target, { status: 302 })
}

async function hashString(str) {
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('')
}
