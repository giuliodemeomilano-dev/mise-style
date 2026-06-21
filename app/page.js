import { supabase } from '@/lib/supabase'
import HomeContent from './components/HomeContent'

export const revalidate = 60

async function getLooks() {
  const { data: outfits, error } = await supabase
    .from('outfits')
    .select(`
      id,
      slug,
      title,
      description,
      mood,
      occasion,
      gender,
      budget_tier,
      tags,
      hero_image_url,
      total_price,
      featured_score,
      created_at,
      outfit_items (
        position,
        role,
        products (
          id,
          name,
          brand,
          merchant,
          price,
          image_url,
          packshot_url,
          affiliate_url
        )
      )
    `)
    .eq('status', 'active')
    .order('featured_score', { ascending: false })

  if (error) {
    console.error('Error fetching outfits:', error)
    return []
  }

  return outfits.map((outfit) => {
    const sortedItems = [...(outfit.outfit_items || [])].sort(
      (a, b) => a.position - b.position
    )
    return {
      id: outfit.id,
      slug: outfit.slug,
      title: outfit.title,
      cat: outfit.occasion,
    gender: outfit.gender,
      mood: outfit.mood,
      tags: outfit.tags || [],
      hero: outfit.hero_image_url,
      total: outfit.total_price,
      featured: outfit.featured_score,
      created: outfit.created_at,
      pieces: sortedItems.map((item) => ({
          id: item.products?.id,
        name: item.products?.name,
        brand: item.products?.brand,
        store: item.products?.merchant,
        price: item.products?.price,
        img: item.products?.image_url,
        packshot: item.products?.packshot_url || item.products?.image_url,
        url: item.products?.affiliate_url,
      })),
    }
  })
}

export default async function HomePage() {
  const looks = await getLooks()
  return <HomeContent looks={looks} />
}