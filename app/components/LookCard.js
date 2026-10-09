import Link from 'next/link'
import SaveButton from './SaveButton'
import { cutFit } from '@/lib/fit'

// The compact outfit card used on the brand, style, search and saved pages:
// the model photo, the title and the pieces in a strip, plus the heart.
// `highlight` is a piece id to ring, so on "How to style black boots" you see
// which piece the page is about.
export default function LookCard({ look, highlight }) {
  const stores = new Set(look.pieces.map((p) => p.store)).size
  return (
    <div className="look-card visible">
      <Link href={'/look/' + look.slug} className="look-visual" style={{ display: 'block', textDecoration: 'none', color: 'inherit', position: 'relative' }}>
        <SaveButton slug={look.slug} />
        <div className="model-hero model-hero-clean">
          {look.model ? (
            <img src={look.model} className="is-model" style={cutFit(look.modelBox, 0.82, 0.92)} alt={look.title} loading="lazy" />
          ) : look.pieces[0] ? (
            <img src={look.pieces[0].packshot} className={look.pieces[0].cut ? 'is-cut' : undefined} style={cutFit(look.pieces[0].box, 0.78)} alt={look.title} loading="lazy" />
          ) : null}
        </div>
        <div className="model-info-below">
          <div className="model-title-dark">{look.title}</div>
          <div className="model-meta-dark">
            {look.pieces.length} pieces, {stores} stores, €{Math.round(look.total)}
          </div>
        </div>
        <div className="pieces-strip">
          {look.pieces.map((p) => (
            <div key={p.id} className={'strip-item' + (highlight && highlight.includes(p.id) ? ' strip-hl' : '')}>
              <img src={p.packshot} className={p.cut ? 'is-cut' : undefined} style={cutFit(p.box, 0.78)} alt={p.name} loading="lazy" />
              <div className="strip-label">
                <div className="strip-brand">{p.brand}</div>
                <div className="strip-price">€{p.price}</div>
              </div>
            </div>
          ))}
        </div>
      </Link>
    </div>
  )
}
