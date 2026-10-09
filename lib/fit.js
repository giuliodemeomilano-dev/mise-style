// Places a cut-out by its measured alpha box ("ar,top,bottom,left,right") instead
// of centring the file. Same maths as the homepage cards; see HomeContent.js for
// the long story. bottomAt parks the bottom of the figure at that fraction.
export function cutFit(box, fill = 0.78, bottomAt, cellAr = 1) {
  if (!box) return undefined
  const p = String(box).split(',').map(Number)
  if (p.length !== 5 || p.some((n) => !Number.isFinite(n))) return undefined
  const [ar, top, bottom, left, right] = p
  const cw = right - left
  const ch = bottom - top
  if (!(ar > 0 && cw > 0 && ch > 0)) return undefined
  const w = Math.min(fill / cw, (fill * ar) / (ch * cellAr))
  const h = (w * cellAr) / ar
  return {
    position: 'absolute',
    width: `${(w * 100).toFixed(3)}%`,
    height: 'auto',
    padding: 0,
    objectFit: 'fill',
    transform: 'none',
    left: `${((0.5 - ((left + right) / 2) * w) * 100).toFixed(3)}%`,
    top: `${((typeof bottomAt === 'number' ? bottomAt - bottom * h : 0.5 - ((top + bottom) / 2) * h) * 100).toFixed(3)}%`,
  }
}
