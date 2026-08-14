'use client'

import { useEffect } from 'react'

// Captures FIRST-TOUCH attribution once per visitor and stores it in a cookie
// that /go/[id] reads when logging a click. First touch only: never overwritten.
export default function Attribution() {
  useEffect(() => {
    try {
      const KEY = 'mise_attr'
      const already = document.cookie
        .split('; ')
        .some((c) => c.indexOf(KEY + '=') === 0)
      if (already) return

      const p = new URLSearchParams(window.location.search)
      const utmSource = p.get('utm_source')
      const utmMedium = p.get('utm_medium')
      const utmCampaign = p.get('utm_campaign')

      let refHost = ''
      try {
        if (document.referrer) {
          const h = new URL(document.referrer).hostname
          if (!/(^|\.)mise\.style$/i.test(h)) refHost = h
        }
      } catch (e) {}

      // Nothing to attribute: genuinely direct arrival
      if (!utmSource && !refHost) return

      const value = JSON.stringify({
        s: utmSource || refHost || null,
        m: utmMedium || (refHost ? 'referral' : null),
        c: utmCampaign || null,
        r: refHost || null,
      })

      document.cookie =
        KEY +
        '=' +
        encodeURIComponent(value) +
        '; path=/; max-age=' +
        60 * 60 * 24 * 30 +
        '; samesite=lax'
    } catch (e) {
      // attribution must never break the page
    }
  }, [])

  return null
}
