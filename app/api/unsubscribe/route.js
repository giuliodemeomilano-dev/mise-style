import { supabaseAdmin } from '@/lib/supabase-admin'

// One-click unsubscribe from the link in every email: /api/unsubscribe?t=<token>
// Works for the newsletter and for a single alert.
export async function GET(request) {
  const t = new URL(request.url).searchParams.get('t') || ''
  const page = (msg) =>
    new Response(
      `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MISE</title><body style="font-family:system-ui,sans-serif;background:#FAF8F5;color:#1A1A1A;display:flex;min-height:90vh;align-items:center;justify-content:center;text-align:center;padding:20px"><div><p style="letter-spacing:6px;font-size:22px">MISE</p><p>${msg}</p><p><a href="/" style="color:#1A1A1A">mise.style</a></p></div>`,
      { headers: { 'content-type': 'text/html; charset=utf-8' } }
    )
  if (!/^[0-9a-f]{36}$/.test(t)) return page('This link is not valid.')
  const now = new Date().toISOString()
  const a = await supabaseAdmin.from('subscribers').update({ unsubscribed_at: now }).eq('token', t).select('id')
  const b = await supabaseAdmin.from('alerts').update({ notified_at: now, cancelled: true }).eq('token', t).select('id')
  if ((a.data && a.data.length) || (b.data && b.data.length)) return page('You are unsubscribed. You will not get more emails from us.')
  return page('This link is not valid.')
}
