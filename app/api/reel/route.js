import { supabaseAdmin } from '@/lib/supabase-admin'

// Puts the reel of a look on its page. Used by the MISE social task after the
// reel is approved. Vercel refuses request bodies over 4.5 MB, so the MP4 does
// not pass through here: two calls, both with header x-admin-pw.
//   1. POST {"slug": "..."}                 -> { uploadUrl, path }
//      then PUT the MP4 to uploadUrl (Content-Type: video/mp4)
//   2. POST {"slug": "...", "path": "..."}  -> sets outfits.reel_url
// The video sits in the public "reels" bucket.
export async function POST(request) {
  const pw = request.headers.get('x-admin-pw')
  if (!process.env.ADMIN_PASSWORD || pw !== process.env.ADMIN_PASSWORD) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  let body
  try {
    body = await request.json()
  } catch (e) {
    return Response.json({ ok: false, error: 'json body required' }, { status: 400 })
  }
  const slug = String(body.slug || '')
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return Response.json({ ok: false, error: 'bad slug' }, { status: 400 })

  const { data: look } = await supabaseAdmin.from('outfits').select('id').eq('slug', slug).maybeSingle()
  if (!look) return Response.json({ ok: false, error: 'look not found' }, { status: 404 })

  if (!body.path) {
    const path = slug + '-' + Date.now() + '.mp4'
    const { data, error } = await supabaseAdmin.storage.from('reels').createSignedUploadUrl(path)
    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 })
    return Response.json({ ok: true, uploadUrl: data.signedUrl, path })
  }

  const path = String(body.path)
  if (!path.startsWith(slug + '-') || !/^[a-z0-9-]+\.mp4$/.test(path)) {
    return Response.json({ ok: false, error: 'bad path' }, { status: 400 })
  }
  const { data: pub } = supabaseAdmin.storage.from('reels').getPublicUrl(path)
  const { error } = await supabaseAdmin.from('outfits').update({ reel_url: pub.publicUrl }).eq('id', look.id)
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 })
  return Response.json({ ok: true, url: pub.publicUrl })
}
