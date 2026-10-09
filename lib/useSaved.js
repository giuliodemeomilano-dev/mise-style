'use client'

// Saved looks live in the visitor's own browser (a list of slugs). The heart on
// the cards, the heart on the look page and the /saved page all read the same
// list, and an event keeps them in step when one of them changes it.
import { useEffect, useState, useCallback } from 'react'

const KEY = 'mise-saved'
const EVT = 'mise-saved-change'

export function readSaved() {
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) || '[]')
    return Array.isArray(v) ? v.filter((s) => typeof s === 'string') : []
  } catch (e) {
    return []
  }
}

function writeSaved(list) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list))
  } catch (e) {}
  window.dispatchEvent(new CustomEvent(EVT, { detail: list }))
}

export function useSaved() {
  const [saved, setSaved] = useState([])
  useEffect(() => {
    setSaved(readSaved())
    const on = () => setSaved(readSaved())
    window.addEventListener(EVT, on)
    window.addEventListener('storage', on)
    return () => {
      window.removeEventListener(EVT, on)
      window.removeEventListener('storage', on)
    }
  }, [])
  const toggle = useCallback((slug) => {
    const cur = readSaved()
    const next = cur.includes(slug) ? cur.filter((s) => s !== slug) : [slug, ...cur]
    writeSaved(next)
    setSaved(next)
    return next.includes(slug)
  }, [])
  const isSaved = useCallback((slug) => saved.includes(slug), [saved])
  return { saved, toggle, isSaved }
}
