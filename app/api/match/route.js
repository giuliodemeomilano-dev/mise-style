import { getLooks } from '@/lib/catalog'
import { matchLooks, MATCH_GROUPS, MATCH_COLOURS } from '@/lib/match'

// Reads a photo of ONE piece the visitor owns and returns the MISE looks that
// complete it. The photo is sent to the vision model and then dropped: nothing
// is stored anywhere.

export const maxDuration = 30

const MAX_B64 = 1_600_000 // about 1.2 MB of image; the page shrinks photos to 1024 px first
const PER_IP_HOUR = 12
const PER_INSTANCE_DAY = 400
const hits = new Map()
let day = { d: '', n: 0 }

function limited(ip) {
  const now = Date.now()
  const today = new Date().toISOString().slice(0, 10)
  if (day.d !== today) day = { d: today, n: 0 }
  if (day.n >= PER_INSTANCE_DAY) return true
  const list = (hits.get(ip) || []).filter((t) => now - t < 3600_000)
  if (list.length >= PER_IP_HOUR) return true
  list.push(now)
  hits.set(ip, list)
  day.n++
  return false
}

const PROMPT = `You look at ONE photo of a clothing item, shoe or bag that a person owns.
Answer ONLY with a JSON object, no other text:
{"is_item": true|false, "group": "<one of: ${MATCH_GROUPS.join(', ')}>", "colour": "<one of: ${MATCH_COLOURS.join(', ')}>", "gender": "women"|"men"|"any", "label": "<3 to 5 words in English, e.g. ecru straight midi skirt>"}
Rules: pick the single most visible item. Knits and sweaters are knitwear, blouses and bodysuits are tops, blazers are jackets. Slip-on shoes without laces are loafers; boat-shoes only when a leather lace runs around the side. "colour" is its main colour; denim is blue. If the photo shows no clothing, shoe or bag, answer {"is_item": false}.`

export async function POST(request) {
  try {
    const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'x'
    if (limited(ip)) return Response.json({ ok: false, reason: 'limit' }, { status: 429 })

    const body = await request.json().catch(() => ({}))
    const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(body.image || '')
    if (!m) return Response.json({ ok: false, reason: 'image' }, { status: 400 })
    if (m[2].length > MAX_B64) return Response.json({ ok: false, reason: 'too_big' }, { status: 413 })
    const gender = ['women', 'men'].includes(body.g) ? body.g : null

    const ai = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } },
              { type: 'text', text: PROMPT },
            ],
          },
        ],
      }),
    })
    if (!ai.ok) {
      console.error('match ai', ai.status, (await ai.text()).slice(0, 300))
      return Response.json({ ok: false, reason: 'ai' }, { status: 502 })
    }
    const data = await ai.json()
    const text = (data.content || []).map((c) => c.text || '').join('')
    let piece
    try {
      piece = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))
    } catch {
      return Response.json({ ok: false, reason: 'ai' }, { status: 502 })
    }
    if (!piece.is_item) return Response.json({ ok: false, reason: 'no_item' })

    const group = MATCH_GROUPS.includes(piece.group) ? piece.group : null
    const colour = MATCH_COLOURS.includes(piece.colour) ? piece.colour : null
    const g = gender || (['women', 'men'].includes(piece.gender) ? piece.gender : 'women')
    const looks = matchLooks(await getLooks(), { group, colour, gender: g })
    return Response.json({
      ok: true,
      piece: { group, colour, label: String(piece.label || '').slice(0, 60), gender: g },
      looks,
    })
  } catch (e) {
    console.error('match', e)
    return Response.json({ ok: false, reason: 'error' }, { status: 500 })
  }
}
