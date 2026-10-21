'use client'

import { useRef, useState } from 'react'
import { useLang } from '@/app/components/LangProvider'
import LookCard from '@/app/components/LookCard'

const TXT = {
  en: {
    kicker: 'Match your wardrobe',
    title: 'Photograph a piece you own. We dress you around it',
    intro: 'A skirt, a knit, your favourite boots. Take one photo and MISE finds the outfits built around it, so you only buy what is missing',
    women: 'Women',
    men: 'Men',
    snap: 'Take or upload a photo',
    again: 'Try another piece',
    busy: 'Looking at your piece…',
    seen: 'We see',
    found: 'outfits to wear it with',
    complete: 'Complete the look for',
    tip: 'Your piece is the one with the ring. Tap a look to shop the rest',
    privacy: 'Your photo is only used to read the piece and is never stored',
    no_item: 'We could not see a clothing item, shoe or bag in that photo. Try one piece on a plain background',
    none: 'No outfits with this piece yet. New looks arrive every day, try again soon',
    limit: 'You have tried a lot of photos. Come back in an hour',
    error: 'Something went wrong. Please try again',
  },
  fr: {
    kicker: 'Assortir ma garde-robe',
    title: 'Photographiez une pièce que vous avez. On vous habille autour',
    intro: 'Une jupe, un pull, vos bottes préférées. Une photo et MISE trouve les tenues construites autour, pour n’acheter que ce qui manque',
    women: 'Femme',
    men: 'Homme',
    snap: 'Prendre ou importer une photo',
    again: 'Essayer une autre pièce',
    busy: 'On regarde votre pièce…',
    seen: 'On voit',
    found: 'tenues pour la porter',
    complete: 'Compléter le look pour',
    tip: 'Votre pièce est celle entourée. Touchez un look pour acheter le reste',
    privacy: 'Votre photo sert seulement à lire la pièce et n’est jamais conservée',
    no_item: 'Aucun vêtement, chaussure ou sac visible sur la photo. Essayez une seule pièce sur un fond uni',
    none: 'Pas encore de tenue avec cette pièce. De nouveaux looks arrivent chaque jour',
    limit: 'Beaucoup de photos essayées. Revenez dans une heure',
    error: 'Une erreur est survenue. Réessayez',
  },
  es: {
    kicker: 'Combina tu armario',
    title: 'Fotografía una prenda que ya tienes. Te vestimos alrededor',
    intro: 'Una falda, un jersey, tus botas favoritas. Una foto y MISE encuentra los looks creados a su alrededor, para comprar solo lo que falta',
    women: 'Mujer',
    men: 'Hombre',
    snap: 'Haz o sube una foto',
    again: 'Prueba otra prenda',
    busy: 'Mirando tu prenda…',
    seen: 'Vemos',
    found: 'looks para llevarla',
    complete: 'Completa el look por',
    tip: 'Tu prenda es la del círculo. Toca un look para comprar el resto',
    privacy: 'Tu foto solo se usa para leer la prenda y nunca se guarda',
    no_item: 'No vemos ninguna prenda, zapato o bolso en la foto. Prueba con una sola prenda sobre un fondo liso',
    none: 'Todavía no hay looks con esta prenda. Cada día llegan looks nuevos',
    limit: 'Has probado muchas fotos. Vuelve dentro de una hora',
    error: 'Algo ha fallado. Inténtalo de nuevo',
  },
}

// Shrink the photo in the browser so a 12 MB phone picture travels as ~150 kB.
function shrink(file, max = 1024) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * k)
      c.height = Math.round(img.height * k)
      const g = c.getContext('2d')
      // White under transparent PNGs, or they turn black as JPEG
      g.fillStyle = '#fff'
      g.fillRect(0, 0, c.width, c.height)
      g.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('read'))
    }
    img.src = url
  })
}

export default function MatchClient() {
  const { lang } = useLang()
  const t = TXT[lang] || TXT.en
  const [g, setG] = useState('women')
  const [photo, setPhoto] = useState(null)
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState(null)
  const input = useRef(null)

  async function onFile(e) {
    const file = e.target.files && e.target.files[0]
    e.target.value = ''
    if (!file) return
    setRes(null)
    setBusy(true)
    try {
      const data = await shrink(file)
      setPhoto(data)
      const r = await fetch('/api/match', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ image: data, g }),
      })
      setRes(await r.json())
    } catch {
      setRes({ ok: false, reason: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const err = res && !res.ok ? t[res.reason] || t.error : null

  return (
    <main className="seo-page match-page">
      <p className="match-kicker">{t.kicker}</p>
      <h1>{t.title}</h1>
      <p className="seo-intro">{t.intro}</p>

      <div className="gender-toggle" style={{ margin: '18px 0 14px' }}>
        <button className={'gender-pill' + (g === 'women' ? ' active' : '')} onClick={() => setG('women')}>{t.women}</button>
        <button className={'gender-pill' + (g === 'men' ? ' active' : '')} onClick={() => setG('men')}>{t.men}</button>
      </div>

      <div className="match-drop">
        {photo && <img src={photo} alt="" className="match-photo" />}
        <button type="button" className="match-btn" onClick={() => input.current && input.current.click()} disabled={busy}>
          {busy ? t.busy : photo ? t.again : t.snap}
        </button>
        <input ref={input} type="file" accept="image/*" onChange={onFile} hidden />
        <p className="match-privacy">{t.privacy}</p>
      </div>

      {err && <p className="seo-intro match-err">{err}</p>}

      {res && res.ok && (
        <>
          <p className="match-seen">
            {t.seen}: <strong>{res.piece.label}</strong>
            {res.looks.length > 0 && <>, {res.looks.length} {t.found}</>}
          </p>
          {res.looks.length === 0 ? (
            <p className="seo-intro">{t.none}</p>
          ) : (
            <>
              <p className="match-tip">{t.tip}</p>
              <div className="looks-grid">
                {res.looks.map((l) => (
                  <div key={l.id} className="match-item">
                    <LookCard look={l} highlight={[l.owned]} />
                    <p className="match-complete">
                      {t.complete} <strong>€{l.missingTotal}</strong>
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </main>
  )
}
