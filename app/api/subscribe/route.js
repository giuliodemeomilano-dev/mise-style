import { supabaseAdmin } from '@/lib/supabase-admin'
import { cleanEmail, cleanLang, randomToken } from '@/lib/email-guard'

// Newsletter sign-up. Stores the address with the consent and where it came
// from; nothing is sent from here. The weekly email is prepared by the MISE
// task and goes out only once Giulio has approved the sending set-up.
export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch (e) {
    return Response.json({ ok: false }, { status: 400 })
  }
  // Honeypot: a hidden field people never fill and bots usually do.
  if (body.website) return Response.json({ ok: true })
  const email = cleanEmail(body.email)
  if (!email || body.consent !== true) return Response.json({ ok: false, error: 'invalid' }, { status: 400 })

  const saved = Array.isArray(body.saved)
    ? body.saved.filter((s) => typeof s === 'string' && /^[a-z0-9-]{1,80}$/.test(s)).slice(0, 200)
    : null

  const { data: existing } = await supabaseAdmin
    .from('subscribers')
    .select('id, saved_slugs')
    .eq('email', email)
    .maybeSingle()

  if (existing) {
    const merged = saved ? [...new Set([...(existing.saved_slugs || []), ...saved])] : existing.saved_slugs
    const { error } = await supabaseAdmin
      .from('subscribers')
      .update({ saved_slugs: merged, unsubscribed_at: null, consent_at: new Date().toISOString() })
      .eq('id', existing.id)
    if (error) return Response.json({ ok: false }, { status: 500 })
    return Response.json({ ok: true })
  }

  const { error } = await supabaseAdmin.from('subscribers').insert({
    email,
    lang: cleanLang(body.lang),
    source: String(body.source || 'site').slice(0, 60),
    saved_slugs: saved || [],
    consent_at: new Date().toISOString(),
    token: randomToken(),
  })
  if (error) return Response.json({ ok: false }, { status: 500 })
  return Response.json({ ok: true })
}
