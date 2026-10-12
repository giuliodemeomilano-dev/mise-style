import { cutFit } from '@/lib/fit'

// One shoppable piece, linking through /go/ so the click is counted and the
// affiliate tag is applied. outfitId is the look the piece came from.
export default function PieceTile({ piece, outfitId }) {
  return (
    <a
      href={'/go/' + piece.id + (outfitId ? '?outfit=' + outfitId : '')}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="ptile"
    >
      <div className={'ptile-img' + (piece.cut ? ' is-cut-bg' : '')}>
        <img src={piece.packshot} style={cutFit(piece.box, 0.8)} alt={piece.name} loading="lazy" />
      </div>
      <div className="ptile-brand">{piece.brand}</div>
      <div className="ptile-name">{piece.name}</div>
      <div className="ptile-price">€{piece.price}</div>
    </a>
  )
}
