'use client'

import { useState } from 'react'
import { useLang } from './LangProvider'
import { UI } from '@/lib/ui-strings'
import { readSaved } from '@/lib/useSaved'

// The newsletter box. `variant="saved"` is the one on /saved, which also sends
// the list of saved looks so they can be emailed back to the visitor.
export default function EmailSignup({ source = 'site', variant }) {
  const { lang } = useLang()
  const u = UI[lang] || UI.en
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [state, setState] = useState('idle')
  const [msg, setMsg] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setState('error')
      setMsg(u.bad_email)
      return
    }
    if (!consent) {
      setState('error')
      setMsg(u.need_consent)
      return
    }
    setState('busy')
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          lang,
          source,
          saved: variant === 'saved' ? readSaved() : undefined,
          consent: true,
          website: e.target.website.value,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) throw new Error()
      setState('ok')
    } catch (err) {
      setState('error')
      setMsg(u.err)
    }
  }

  const title = variant === 'saved' ? u.nl_saved_title : u.nl_title
  const sub = variant === 'saved' ? u.nl_saved_sub : u.nl_sub

  return (
    <section className="nl-box">
      <h2 className="nl-title">{title}</h2>
      <p className="nl-sub">{sub}</p>
      {state === 'ok' ? (
        <p className="nl-ok">{u.nl_ok}</p>
      ) : (
        <form className="nl-form" onSubmit={submit} noValidate>
          <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hp" aria-hidden="true" />
          <div className="nl-row">
            <input
              type="email"
              className="nl-input"
              placeholder={u.email_ph}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              aria-label={u.email_ph}
            />
            <button className="nl-btn" disabled={state === 'busy'}>
              {state === 'busy' ? '…' : u.nl_btn}
            </button>
          </div>
          <label className="nl-consent">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>
              {u.consent} <a href="/privacy">{u.privacy}</a>
            </span>
          </label>
          {state === 'error' && <p className="nl-err">{msg}</p>}
        </form>
      )}
    </section>
  )
}
