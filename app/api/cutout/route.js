import { removeBackground } from '@imgly/background-removal-node'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const src = searchParams.get('url')
  if (!src) return new Response('Missing ?url=', { status: 400 })

  const started = Date.now()
  try {
    const blob = await removeBackground(src)
    const buf = Buffer.from(await blob.arrayBuffer())
    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'X-Elapsed-Ms': String(Date.now() - started),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e && e.message ? e.message : e), elapsedMs: Date.now() - started }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
