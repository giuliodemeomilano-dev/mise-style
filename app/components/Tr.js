'use client'

import { useLang } from './LangProvider'
import { tr } from '@/lib/tr'

// Server pages render English (what Google reads). In the browser, when the
// visitor has picked FR or ES, this swaps in the translation. children is the
// English text, kept as the fallback.
export default function Tr({ id, v, children }) {
  const { lang } = useLang()
  if (lang === 'en') return children ?? null
  const s = tr(lang, id, v)
  return s == null ? children ?? null : s
}

// Long English-only SEO copy (category FAQ and notes): shown in English,
// hidden for FR and ES visitors so the page is not half one language.
export function EnOnly({ children }) {
  const { lang } = useLang()
  return lang === 'en' ? children : null
}
