import { Playfair_Display, Outfit } from 'next/font/google'
import './globals.css'
import Nav from './components/Nav'
import Footer from './components/Footer'
import BottomNav from './components/BottomNav'
import { LangProvider } from './components/LangProvider'

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
  title: 'MISE — Shop The Entire Look',
  description: 'AI-curated complete looks from multiple stores. Shop the entire outfit in one click.',
  themeColor: '#1A1A1A',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${playfair.variable} ${outfit.variable}`}>
      <body>
        <LangProvider>
          <Nav />
          {children}
          <Footer />
          <BottomNav />
        </LangProvider>
      </body>
    </html>
  )
}