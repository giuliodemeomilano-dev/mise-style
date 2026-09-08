'use client'

import { useState } from 'react'

// The console Pinterest asks to see in the upgrade video: a real Pinterest login and a
// real publish, both visible on screen. It is also what the daily task will call once
// Standard access is granted, so it is not a throwaway demo.
//
// Nothing secret is ever shown here. The admin password stays in this component's state
// and travels in a header; the Pinterest token lives only in the database and no route
// hands it back.
const BOX = {
  maxWidth: 640,
  margin: '60px auto',
  padding: '0 20px',
  fontFamily: 'system-ui, sans-serif',
  color: '#1A1A1A',
}
const FIELD = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #E8E2DA',
  borderRadius: 8,
  fontSize: 15,
  marginTop: 6,
}
const BTN = {
  padding: '11px 18px',
  border: 0,
  borderRadius: 999,
  background: '#1A1A1A',
  color: '#fff',
  fontSize: 15,
  cursor: 'pointer',
}

export default function PinterestConsole() {
  const [pw, setPw] = useState('')
  const [state, setState] = useState(null)
  const [slug, setSlug] = useState('')
  const [board, setBoard] = useState('')
  const [format, setFormat] = useState('split')
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')

  async function check() {
    setBusy('check')
    setMsg('')
    try {
      const r = await fetch('/api/pinterest/publish', { headers: { 'x-admin-pw': pw } })
      if (r.status === 401) {
        setMsg('Wrong password.')
        setState(null)
      } else {
        const d = await r.json()
        setState(d)
        if (d.boards && d.boards.length && !board) setBoard(d.boards[0].id)
        if (d.error) setMsg(d.error)
      }
    } catch (e) {
      setMsg('Could not reach the server.')
    }
    setBusy('')
  }

  async function publish() {
    setBusy('publish')
    setMsg('')
    try {
      const r = await fetch('/api/pinterest/publish', {
        method: 'POST',
        headers: { 'x-admin-pw': pw, 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: slug.trim(), boardId: board, format }),
      })
      const d = await r.json()
      setMsg(d.ok ? 'Published. Pin id ' + d.pinId : 'Failed: ' + (d.error || r.status))
    } catch (e) {
      setMsg('Could not reach the server.')
    }
    setBusy('')
  }

  return (
    <main style={BOX}>
      <h1 style={{ fontSize: 30, marginBottom: 6 }}>MISE · Pinterest</h1>
      <p style={{ color: '#6B635A', marginTop: 0 }}>
        Connect the MISE Pinterest account, then publish a look to one of its boards.
      </p>

      <label style={{ display: 'block', marginTop: 28, fontSize: 13, color: '#6B635A' }}>
        Admin password
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          style={FIELD}
        />
      </label>
      <button onClick={check} disabled={!pw || busy === 'check'} style={{ ...BTN, marginTop: 14 }}>
        {busy === 'check' ? 'Checking...' : 'Check connection'}
      </button>

      {state ? (
        <div style={{ marginTop: 30, paddingTop: 24, borderTop: '1px solid #E8E2DA' }}>
          <p style={{ fontSize: 15 }}>
            Pinterest: <strong>{state.connected ? 'connected' : 'not connected'}</strong>
          </p>

          {!state.connected ? (
            <a href="/api/pinterest/auth" style={{ ...BTN, display: 'inline-block', textDecoration: 'none' }}>
              Connect Pinterest
            </a>
          ) : (
            <>
              <label style={{ display: 'block', marginTop: 18, fontSize: 13, color: '#6B635A' }}>
                Board
                <select value={board} onChange={(e) => setBoard(e.target.value)} style={FIELD}>
                  {(state.boards || []).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'block', marginTop: 14, fontSize: 13, color: '#6B635A' }}>
                Look slug
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="mise-20260908-w1"
                  style={FIELD}
                />
              </label>

              <label style={{ display: 'block', marginTop: 14, fontSize: 13, color: '#6B635A' }}>
                Layout
                <select value={format} onChange={(e) => setFormat(e.target.value)} style={FIELD}>
                  <option value="split">split</option>
                  <option value="row">row</option>
                  <option value="stack">stack</option>
                </select>
              </label>

              {slug.trim() ? (
                <img
                  src={'/api/pin/' + slug.trim() + '?format=' + format + '&bg=riviera'}
                  alt=""
                  style={{ width: 220, marginTop: 18, borderRadius: 8, border: '1px solid #E8E2DA' }}
                />
              ) : null}

              <div>
                <button
                  onClick={publish}
                  disabled={!slug.trim() || !board || busy === 'publish'}
                  style={{ ...BTN, marginTop: 18 }}
                >
                  {busy === 'publish' ? 'Publishing...' : 'Publish this look'}
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}

      {msg ? <p style={{ marginTop: 20, fontSize: 15 }}>{msg}</p> : null}
    </main>
  )
}
