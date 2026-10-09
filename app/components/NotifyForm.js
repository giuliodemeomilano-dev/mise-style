'use client'

import { useState } from 'react'
import { useLang } from './LangProvider'
import { UI } from '@/lib/ui-strings'

// "Email me when it is back" and "Email me if the price drops". One email for one
// piece: this is not a newsletter sign-up, so there is no newsletter checkbox.
export default function NotifyForm({ productId, outfitId, kind = 'restock', price, compact }) {
  const { lang } = useLang()
  const u = UI[lang] || UI.en
  const [open, setOpen] = useState(!compact)
  const [email, setEmail] = useState('')
  const [state, setState] = useState('idle')

  async function submit(e) {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setState('bad')
      return
    }
    setState('busy')
    try {
      const res = await fetch('/api/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), product_id: productId, outfit_id: outfitId, kind, price, lang, website: e.target.website.value }),
      })
      const data = await res.json().catch(() => ({}))
      setState(res.ok && data.ok ? 'ok' : 'err')
    } catch (err) {
      setState('err')
    }
  }

  if (state === 'ok') return <p className="notify-ok">{u.notify_ok}</p>
  if (!open)
    return (
      <button type="button" className="notify-link" onClick={() => setOpen(true)}>
        <span aria-hidden="true">🔔</span> {kind === 'price' ? u.notify_price : u.notify_back}
      </button>
    )
  return (
    <form className="notify-form" onSubmit={submit} noValidate>
      <p className="notify-label">{kind === 'price' ? u.notify_price_long : u.notify_back}</p>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hp" aria-hidden="true" />
      <div className="notify-row">
        <input type="email" placeholder={u.email_ph} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" aria-label={u.email_ph} />
        <button disabled={state === 'busy'}>{state === 'busy' ? '…' : u.notify_btn}</button>
      </div>
      {state === 'bad' && <p className="nl-err">{u.bad_email}</p>}
      {state === 'err' && <p className="nl-err">{u.err}</p>}
    </form>
  )
}
