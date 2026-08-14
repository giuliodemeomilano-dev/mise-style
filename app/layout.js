import Script from 'next/script'
import { Playfair_Display, Outfit } from 'next/font/google'
import './globals.css'
import Nav from './components/Nav'
import Footer from './components/Footer'
import BottomNav from './components/BottomNav'
import { LangProvider } from './components/LangProvider'
import Attribution from './components/Attribution'

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
  display: 'swap',
})

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['200', '300', '400', '500', '600'],
  variable: '--font-outfit',
  display: 'swap',
})

export const metadata = {
  title: 'MISE — Shop The Entire Outfit',
  description: 'AI-curated complete outfits from multiple stores. Shop the entire outfit in one click.',
  other: {
    'fo-verify': 'e71bd8c7-b2ff-4bd4-a707-e236f359155f',
    'google-site-verification': 'ZkrMi18AXkoaB4-6s-590s7wpD9HoyrcLgu9q-3nd4Y',
    'p:domain_verify': '72c07dc3afe4160b9571f81921bccf99',
  },
}

export const viewport = {
  themeColor: '#1A1A1A',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${playfair.variable} ${outfit.variable}`}>
      <body>
        <Attribution />
        <LangProvider>
          <Nav />
          {children}
          <Footer />
          <BottomNav />
        </LangProvider>
        <Script
          src="https://s.skimresources.com/js/303796X1791855.skimlinks.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  )
}
