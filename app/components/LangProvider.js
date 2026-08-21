'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { translations } from '@/lib/i18n'

const LangContext = createContext()

export function LangProvider({ children }) {
  const [lang, setLang] = useState('en')

  useEffect(() => {
    const saved = localStorage.getItem('mise-lang')
    if (saved && ['en', 'fr', 'es'].includes(saved)) {
      setLang(saved)
      // Keep <html lang> in sync on load too, not only when the user
      // switches - otherwise the page renders in Spanish while telling
      // Google and screen readers it is English.
      document.documentElement.lang = saved
    }
  }, [])

  const changeLang = (newLang) => {
    setLang(newLang)
    localStorage.setItem('mise-lang', newLang)
    document.documentElement.lang = newLang
  }

  const t = translations[lang]

  return (
    <LangContext.Provider value={{ lang, changeLang, t }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}
