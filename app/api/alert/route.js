import { supabaseAdmin } from '@/lib/supabase-admin'
import { cleanEmail, cleanLang, randomToken } from '@/lib/email-guard'

// "Email me when it is back" / "Email me if the price drops", for one product.
// The daily site check marks products sold out or repriced; the alerts that
// match are then prepared for sending.
export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch (e) {
    return Response.json({ ok: false }, { status: 400 })
  }
  if (body.website) return Response.json({ ok: true })
  const email = cleanEmail(body.email)
  const kind = body.kind === 'price' ? 'price' : 'restock'
  const uuid = /^[0-9a-f-]{36}$/i
  if (!email || !uuid.test(String(body.product_id || ''))) {
    return Response.json({ ok: false, error: 'invalid' }, { status: 400 })
  }
  const { data: dup } = await supabaseAdmin
    .from('alerts')
    .select('id')
    .eq('email', email)
    .eq('product_id', body.product_id)
    .eq('kind', kind)
    .is('notified_at', null)
    .maybeSingle()
  if (dup) return Response.json({ ok: true })

  const { error } = await supabaseAdmin.from('alerts').insert({
    email,
    product_id: body.product_id,
    outfit_id: uuid.test(String(body.outfit_id || '')) ? body.outfit_id : null,
    kind,
    price_at: Number(body.price) || null,
    lang: cleanLang(body.lang),
    token: randomToken(),
  })
  if (error) return Response.json({ ok: false }, { status: 500 })
  return Response.json({ ok: true })
}
