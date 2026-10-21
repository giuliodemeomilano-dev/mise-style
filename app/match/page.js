import MatchClient from './MatchClient'

export const metadata = {
  title: 'Match Your Wardrobe: Photograph a Piece, Get the Outfit | MISE',
  description:
    'Take a photo of a piece you already own and MISE shows you complete outfits built around it. Buy only what is missing.',
  alternates: { canonical: 'https://www.mise.style/match' },
}

export default function MatchPage() {
  return <MatchClient />
}
