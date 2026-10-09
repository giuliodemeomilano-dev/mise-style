'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSaved } from '@/lib/useSaved'
import { useLang } from '@/app/components/LangProvider'
import { UI } from '@/lib/ui-strings'
import LookCard from '@/app/components/LookCard'
import EmailSignup from '@/app/components/EmailSignup'

export default function SavedClient() {
  const { saved } = useSaved()
  const { lang } = useLang()
  const u = UI[lang] || UI.en
  const [looks, setLooks] = useState(null)

  useEffect(() => {
    if (!saved.length) {
      setLooks([])
      return
    }
    let alive = true
    fetch('/api/looks?slugs=' + encodeURIComponent(saved.join(',')))
      .then((r) => r.json())
      .then((d) => alive && setLooks(d.looks || []))
      .catch(() => alive && setLooks([]))
    return () => {
      alive = false
    }
  }, [saved])

  return (
    <main className="seo-page">
      <h1>{u.saved_title}</h1>
      {looks === null ? (
        <p className="seo-intro">…</p>
      ) : looks.length === 0 ? (
        <div className="saved-empty">
          <p className="seo-intro">{u.saved_empty}</p>
          <Link href="/#looks" className="hero-btn">{u.saved_browse}</Link>
        </div>
      ) : (
        <div className="looks-grid">
          {looks.map((l) => (
            <LookCard key={l.id} look={l} />
          ))}
        </div>
      )}
      <EmailSignup source="saved" variant={looks && looks.length ? 'saved' : undefined} />
    </main>
  )
}
