import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

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

  if (error || !product) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Estrai info utili dalla request (per analytics)
  const country = request.headers.get('x-vercel-ip-country') || null
  const userAgent = request.headers.get('user-agent') || null
  const referer = request.headers.get('referer') || null

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
    })
    .then(({ error }) => {
      if (error) console.error('[click-tracking] DB insert failed:', error.message)
    })

  // Redirect al link affiliato del prodotto
  return NextResponse.redirect(product.affiliate_url, { status: 302 })
}

async function hashString(str) {
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('')
}
