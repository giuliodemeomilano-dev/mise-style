// Search-facing outfit categories. Shared by the category pages, the
// /outfits index and the sitemap so the three can never drift apart.

export const CATEGORIES = [
  {
    slug: 'womens-office-outfits',
    gender: 'women',
    occasion: 'office',
    title: "Women's Office Outfits",
    intro:
      'Work outfits built around tailoring that still feels relaxed — structured trousers, clean shirting and knitwear that carries you from a morning of meetings through to dinner. Every piece is linked, so you can shop the whole look or just the one thing you are missing.',
  },
  {
    slug: 'mens-office-outfits',
    gender: 'men',
    occasion: 'office',
    title: "Men's Office Outfits",
    intro:
      'Office outfits for dress codes that stopped being strict — unstructured blazers, well-cut trousers and shirts that work without a tie. Each look is complete and shoppable piece by piece, across the brands we curate.',
  },
  {
    slug: 'womens-casual-outfits',
    gender: 'women',
    occasion: 'casual',
    title: "Women's Casual Outfits",
    intro:
      'Everyday outfits that look considered without looking like they took effort — relaxed denim, easy knits and a shoe you can actually walk all day in. Built as full looks rather than single pieces.',
  },
  {
    slug: 'mens-casual-outfits',
    gender: 'men',
    occasion: 'casual',
    title: "Men's Casual Outfits",
    intro:
      'Off-duty outfits that still hold their shape — good denim or chinos, a well-made tee or overshirt, and footwear that finishes the whole thing instead of undermining it.',
  },
  {
    slug: 'womens-weekend-outfits',
    gender: 'women',
    occasion: 'weekend',
    title: "Women's Weekend Outfits",
    intro:
      'Weekend outfits for slow mornings and long lunches — soft layers, roomy shapes and fabrics that forgive. Nothing here needs ironing before you leave the house.',
  },
  {
    slug: 'mens-weekend-outfits',
    gender: 'men',
    occasion: 'weekend',
    title: "Men's Weekend Outfits",
    intro:
      'Weekend outfits with none of the effort on show — relaxed trousers, a shirt worn open, and a sneaker that is not shouting for attention.',
  },
  {
    slug: 'womens-evening-outfits',
    gender: 'women',
    occasion: 'evening',
    title: "Women's Evening Outfits",
    intro:
      'Evening outfits that skip the little-black-dress cliche — fluid fabrics, a sharp line somewhere, and jewellery left to do the talking. Dressed up without the costume.',
  },
  {
    slug: 'mens-evening-outfits',
    gender: 'men',
    occasion: 'evening',
    title: "Men's Evening Outfits",
    intro:
      'Evening outfits for dinner rather than black tie — darker tailoring, fine-gauge knits and leather with some weight to it. Smart enough for the room, quiet enough to feel natural.',
  },
  {
    slug: 'womens-brunch-outfits',
    gender: 'women',
    occasion: 'brunch',
    title: "Women's Brunch Outfits",
    intro:
      'Brunch outfits for a table in the sun — linen, stripes, easy shapes and a bag you can genuinely fit things into. Comfortable enough to sit in for three hours.',
  },
  {
    slug: 'mens-brunch-outfits',
    gender: 'men',
    occasion: 'brunch',
    title: "Men's Brunch Outfits",
    intro:
      'Brunch outfits that carry from the terrace to a walk afterwards — linen shirting, lighter trousers and an uncomplicated shoe. Warm-weather dressing without trying too hard.',
  },
  {
    slug: 'womens-date-night-outfits',
    gender: 'women',
    occasion: 'date',
    title: "Women's Date Night Outfits",
    intro:
      'Date night outfits that feel like you rather than a costume — one strong piece, everything else kept quiet around it. Considered, not overdressed.',
  },
  {
    slug: 'mens-date-night-outfits',
    gender: 'men',
    occasion: 'date',
    title: "Men's Date Night Outfits",
    intro:
      'Date night outfits that get the details right — proper fit, restrained colour, and shoes that finish the look. Nothing that tries too obviously.',
  },
  {
    slug: 'womens-travel-outfits',
    gender: 'women',
    occasion: 'travel',
    title: "Women's Travel Outfits",
    intro:
      'Travel outfits built for airports and long train days — fabrics that do not crease, layers you can shed when the temperature changes, and shoes comfortable enough to keep on.',
  },
  {
    slug: 'mens-travel-outfits',
    gender: 'men',
    occasion: 'travel',
    title: "Men's Travel Outfits",
    intro:
      'Travel outfits for days spent moving — soft tailoring, breathable layers and a sneaker you can wear for twelve hours without regretting it.',
  },
  {
    slug: 'womens-summer-outfits',
    gender: 'women',
    season: 'summer',
    title: "Women's Summer Outfits",
    intro:
      'Summer outfits for real heat — linen, cotton and open weaves, in colours that hold up under strong light. Complete looks, every piece shoppable.',
  },
  {
    slug: 'mens-summer-outfits',
    gender: 'men',
    season: 'summer',
    title: "Men's Summer Outfits",
    intro:
      'Summer outfits for heat that does not let up — linen shirting, lighter trousers, and shorts that read as clothing rather than beachwear.',
  },
]

export function findCategory(slug) {
  return CATEGORIES.find((c) => c.slug === slug) || null
}
