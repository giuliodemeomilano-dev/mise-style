'use client'

import { useSaved } from '@/lib/useSaved'
import { useLang } from './LangProvider'
import { tr as trs } from '@/lib/tr'

export default function SaveButton({ slug, className = 'btn-save', label, tr }) {
  const { isSaved, toggle } = useSaved()
  const { lang } = useLang()
  if (tr && label && lang !== 'en') label = [trs(lang, 'save') || label[0], trs(lang, 'saved') || label[1]]
  const on = isSaved(slug)
  return (
    <button
      type="button"
      className={className + (on ? ' liked' : '')}
      aria-pressed={on}
      aria-label={on ? 'Remove from saved' : 'Save this outfit'}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggle(slug)
      }}
    >
      <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      {label && <span>{on ? label[1] : label[0]}</span>}
    </button>
  )
}
