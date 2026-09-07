'use client'

// The cell is 2:3 and the cut-out keeps whatever empty margin the brand left around
// the garment, so `object-fit: contain` centres the FILE, not the CLOTHES: that is why
// one shirt sat high and smaller than the next. This places the garment itself, using
// the measured alpha box. Apparel is sized to one common height so a polo and a shirt
// read the same; anything much wider than tall (shoes, bags, jewelry) keeps the
// fit-inside rule, because a shoe as tall as a shirt looks absurd. No box, no change.
const CELL_AR = 2 / 3

function pieceFit(box) {
  if (!box) return undefined
  const p = String(box).split(',').map(Number)
  if (p.length !== 5 || p.some((n) => !Number.isFinite(n))) return undefined
  const [ar, top, bottom, left, right] = p
  const cw = right - left
  const ch = bottom - top
  if (!(ar > 0 && cw > 0 && ch > 0)) return undefined
  const shape = (cw * ar) / ch
  const w =
    shape < 1.4
      ? Math.min((0.74 * ar) / (ch * CELL_AR), 0.9 / cw)
      : Math.min(0.78 / cw, (0.78 * ar) / (ch * CELL_AR))
  const h = (w / ar) * CELL_AR
  return {
    position: 'absolute',
    width: `${(w * 100).toFixed(3)}%`,
    height: 'auto',
    objectFit: 'fill',
    left: `${((0.5 - ((left + right) / 2) * w) * 100).toFixed(3)}%`,
    top: `${((0.5 - ((top + bottom) / 2) * h) * 100).toFixed(3)}%`,
  }
}


import { useRef, useState } from 'react'

export default function PiecesGrid({ pieces: initialPieces, outfitId }) {
  const [pieces, setPieces] = useState(initialPieces)
  const [busy, setBusy] = useState(null)
  // Everything already shown in each slot. Without this the swap kept landing
  // on the same two or three items and bouncing back to the original.
  const seen = useRef({})

  async function changePiece(idx) {
    const piece = pieces[idx]
    if (!piece.external_id) return
    setBusy(idx)
    try {
      const history = seen.current[idx] || []
      const onScreen = pieces.map((p) => p.external_id).filter(Boolean)
      const exclude = [...new Set([...onScreen, ...history])]
      const res = await fetch('/api/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_external_id: piece.external_id,
          exclude,
          // Anchor on the piece the outfit was actually built around.
          anchor_price: Number(initialPieces[idx]?.price) || null,
        }),
      })
      const data = await res.json()
      if (!data.ok) {
        if (data.reason === 'no_alternatives') {
          if (history.length > 0) {
            // Cycle exhausted: quietly start again from the original piece
            // instead of telling the visitor there is nothing left.
            seen.current[idx] = []
            setPieces((prev) => {
              const next = [...prev]
              next[idx] = initialPieces[idx]
              return next
            })
          } else {
            alert('No similar piece available for this item.')
          }
        }
        return
      }
      seen.current[idx] = [...history, piece.external_id]
      setPieces((prev) => {
        const next = [...prev]
        next[idx] = {
          ...data.product,
          packshot: data.product.packshot || data.product.img,
        }
        return next
      })
    } catch (e) {
    } finally {
      setBusy(null)
    }
  }

  const total = pieces.reduce((s, p) => s + (Number(p.price) || 0), 0)

  return (
    <section className="look-pieces">
      <h2>The Pieces</h2>
      <div className="pieces-grid">
        {pieces.map((piece, idx) => (
          <div key={idx} className="piece-card-wrap">
            <a
              href={`/go/${piece.id}?outfit=${outfitId}`}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="piece-card"
            >
              <div className="piece-image" style={{ position: 'relative' }}>
                <img src={piece.packshot} style={pieceFit(piece.box)} alt={piece.name} loading="lazy" />
              </div>
              <div className="piece-info">
                <div className="piece-brand">{piece.brand}</div>
                <div className="piece-name">{piece.name}</div>
                <div className="piece-price">€{piece.price}</div>
                <div className="piece-cta">Shop at {piece.store}</div>
              </div>
            </a>
            <button
              className="piece-swap"
              onClick={() => changePiece(idx)}
              disabled={busy === idx}
              title="Try a similar piece"
            >
              {busy === idx ? '…' : '↻ Change'}
            </button>
          </div>
        ))}
      </div>
      <div className="pieces-total">Outfit total · €{total.toFixed(2)}</div>
    </section>
  )
}
