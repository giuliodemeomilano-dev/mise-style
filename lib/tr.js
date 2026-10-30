// French and Spanish for the pages that are rendered on the server (looks,
// categories, style guides, brands, footer). The server always renders English,
// which is what Google reads; the <Tr> component swaps the text in the browser
// when the visitor has picked FR or ES. Giulio, 2026-10-14: with the site in ES
// the inner pages and the footer were still all in English.

// No import from ./catalog on purpose: this file also ships to the browser.

// ---------- nouns and colours ----------
// [plural, gender] so the colour can agree: "botas negras", "robes noires".
const NOUN = {
  fr: {
    dresses: ['robes', 'f'], skirts: ['jupes', 'f'], jeans: ['jeans', 'm'], trousers: ['pantalons', 'm'],
    chinos: ['chinos', 'm'], shorts: ['shorts', 'm'], knitwear: ['pulls', 'm'], shirts: ['chemises', 'f'],
    't-shirts': ['t-shirts', 'm'], polos: ['polos', 'm'], tops: ['tops', 'm'], coats: ['manteaux', 'm'],
    jackets: ['vestes', 'f'], loafers: ['mocassins', 'm'], 'ankle-boots': ['bottines', 'f'],
    'knee-boots': ['bottes hautes', 'f'], boots: ['bottes', 'f'], sneakers: ['baskets', 'f'],
    heels: ['escarpins', 'm'], 'ballet-flats': ['ballerines', 'f'], 'derby-shoes': ['derbies', 'm'],
    sandals: ['sandales', 'f'], espadrilles: ['espadrilles', 'f'], mules: ['mules', 'f'],
    'boat-shoes': ['chaussures bateau', 'f'], bags: ['sacs', 'm'], earrings: ["boucles d'oreilles", 'f'],
    necklaces: ['colliers', 'm'], bracelets: ['bracelets', 'm'], rings: ['bagues', 'f'], accessories: ['accessoires', 'm'],
  },
  es: {
    dresses: ['vestidos', 'm'], skirts: ['faldas', 'f'], jeans: ['vaqueros', 'm'], trousers: ['pantalones', 'm'],
    chinos: ['chinos', 'm'], shorts: ['shorts', 'm'], knitwear: ['jerséis', 'm'], shirts: ['camisas', 'f'],
    't-shirts': ['camisetas', 'f'], polos: ['polos', 'm'], tops: ['tops', 'm'], coats: ['abrigos', 'm'],
    jackets: ['chaquetas', 'f'], loafers: ['mocasines', 'm'], 'ankle-boots': ['botines', 'm'],
    'knee-boots': ['botas altas', 'f'], boots: ['botas', 'f'], sneakers: ['zapatillas', 'f'],
    heels: ['zapatos de tacón', 'm'], 'ballet-flats': ['bailarinas', 'f'], 'derby-shoes': ['zapatos derby', 'm'],
    sandals: ['sandalias', 'f'], espadrilles: ['alpargatas', 'f'], mules: ['mules', 'f'],
    'boat-shoes': ['náuticos', 'm'], bags: ['bolsos', 'm'], earrings: ['pendientes', 'm'],
    necklaces: ['collares', 'm'], bracelets: ['pulseras', 'f'], rings: ['anillos', 'm'], accessories: ['accesorios', 'm'],
  },
}

// [masculine plural, feminine plural]
const COLOUR = {
  fr: {
    ecru: ['écrus', 'écrues'], black: ['noirs', 'noires'], white: ['blancs', 'blanches'], navy: ['bleu marine', 'bleu marine'],
    burgundy: ['bordeaux', 'bordeaux'], camel: ['camel', 'camel'], brown: ['marron', 'marron'], beige: ['beiges', 'beiges'],
    grey: ['gris', 'grises'], blue: ['bleus', 'bleues'], green: ['verts', 'vertes'], red: ['rouges', 'rouges'],
    pink: ['roses', 'roses'], yellow: ['jaunes', 'jaunes'], rust: ['rouille', 'rouille'], purple: ['violets', 'violettes'],
    silver: ['argentés', 'argentées'], gold: ['dorés', 'dorées'],
  },
  es: {
    ecru: ['crudos', 'crudas'], black: ['negros', 'negras'], white: ['blancos', 'blancas'], navy: ['azul marino', 'azul marino'],
    burgundy: ['burdeos', 'burdeos'], camel: ['camel', 'camel'], brown: ['marrones', 'marrones'], beige: ['beige', 'beige'],
    grey: ['grises', 'grises'], blue: ['azules', 'azules'], green: ['verdes', 'verdes'], red: ['rojos', 'rojas'],
    pink: ['rosas', 'rosas'], yellow: ['amarillos', 'amarillas'], rust: ['teja', 'teja'], purple: ['morados', 'moradas'],
    silver: ['plateados', 'plateadas'], gold: ['dorados', 'doradas'],
  },
}

const COLOUR_ONE = {
  fr: { ecru: 'écru', black: 'noir', white: 'blanc', navy: 'bleu marine', burgundy: 'bordeaux', camel: 'camel', brown: 'marron', beige: 'beige', grey: 'gris', blue: 'bleu', green: 'vert', red: 'rouge', pink: 'rose', yellow: 'jaune', rust: 'rouille', purple: 'violet', silver: 'argent', gold: 'doré' },
  es: { ecru: 'crudo', black: 'negro', white: 'blanco', navy: 'azul marino', burgundy: 'burdeos', camel: 'camel', brown: 'marrón', beige: 'beige', grey: 'gris', blue: 'azul', green: 'verde', red: 'rojo', pink: 'rosa', yellow: 'amarillo', rust: 'teja', purple: 'morado', silver: 'plateado', gold: 'dorado' },
}

// "black dresses" / "robes noires" / "vestidos negros", lower case.
export function itemLabel(lang, group, colour) {
  const n = NOUN[lang] && NOUN[lang][group]
  if (!n) return String(group || '').replace(/-/g, ' ')
  const c = colour && COLOUR[lang][colour]
  return c ? n[0] + ' ' + c[n[1] === 'f' ? 1 : 0] : n[0]
}

export function cap(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

function list(lang, words) {
  const and = lang === 'fr' ? ' et ' : lang === 'es' ? ' y ' : ' and '
  if (words.length < 2) return words.join('')
  return words.slice(0, -1).join(', ') + and + words[words.length - 1]
}

// ---------- categories ----------

const CAT = {
  fr: {
    office: 'Tenues de bureau', casual: 'Tenues casual', weekend: 'Tenues du week-end', evening: 'Tenues de soirée',
    brunch: 'Tenues de brunch', date: 'Tenues de rendez-vous', travel: 'Tenues de voyage',
    autumn: "Tenues d'automne", summer: "Tenues d'été", winter: "Tenues d'hiver", spring: 'Tenues de printemps',
    women: 'pour femme', men: 'pour homme',
  },
  es: {
    office: 'Outfits de oficina', casual: 'Outfits casual', weekend: 'Outfits de fin de semana', evening: 'Outfits de noche',
    brunch: 'Outfits de brunch', date: 'Outfits de cita', travel: 'Outfits de viaje',
    autumn: 'Outfits de otoño', summer: 'Outfits de verano', winter: 'Outfits de invierno', spring: 'Outfits de primavera',
    women: 'para mujer', men: 'para hombre',
  },
}

const CAT_INTRO = {
  fr: {
    office: 'Des tenues de bureau construites autour de pièces bien coupées mais détendues, qui tiennent de la première réunion au dîner. Chaque pièce est liée, achetez le look entier ou seulement ce qui vous manque.',
    casual: 'Des tenues de tous les jours, simples et justes, pensées pour être portées vraiment. Chaque pièce est liée, achetez le look entier ou seulement ce qui vous manque.',
    weekend: 'Des tenues pour le week-end, confortables sans être négligées, du marché du samedi au déjeuner du dimanche. Chaque pièce est liée et achetable.',
    evening: 'Des tenues de soirée pour un dîner, un vernissage ou une sortie, élégantes sans en faire trop. Chaque pièce est liée et achetable.',
    brunch: 'Des tenues pour un brunch, faciles et soignées, pour un rendez-vous tranquille le matin. Chaque pièce est liée et achetable.',
    date: 'Des tenues pour un rendez-vous, qui donnent envie sans avoir l’air d’avoir trop essayé. Chaque pièce est liée et achetable.',
    travel: 'Des tenues de voyage confortables, faciles à superposer et à mettre dans une valise. Chaque pièce est liée et achetable.',
    autumn: "Des tenues d'automne, avec maille, manteaux et bottes, pour les jours qui raccourcissent. Chaque pièce est liée et achetable.",
    summer: "Des tenues d'été légères, en lin et en coton, pour les jours chauds. Chaque pièce est liée et achetable.",
    winter: "Des tenues d'hiver chaudes et bien construites, autour d'un beau manteau. Chaque pièce est liée et achetable.",
    spring: 'Des tenues de printemps, légères et lumineuses, pour la mi-saison. Chaque pièce est liée et achetable.',
  },
  es: {
    office: 'Outfits de oficina con prendas bien cortadas pero relajadas, que aguantan de la primera reunión a la cena. Cada prenda está enlazada, compra el look entero o solo lo que te falta.',
    casual: 'Outfits para el día a día, sencillos y acertados, pensados para llevarlos de verdad. Cada prenda está enlazada, compra el look entero o solo lo que te falta.',
    weekend: 'Outfits para el fin de semana, cómodos sin ser descuidados, del mercado del sábado a la comida del domingo. Cada prenda está enlazada y se puede comprar.',
    evening: 'Outfits de noche para una cena, una inauguración o una salida, elegantes sin pasarse. Cada prenda está enlazada y se puede comprar.',
    brunch: 'Outfits para el brunch, fáciles y cuidados, para un plan tranquilo por la mañana. Cada prenda está enlazada y se puede comprar.',
    date: 'Outfits para una cita, que gustan sin parecer que te has esforzado demasiado. Cada prenda está enlazada y se puede comprar.',
    travel: 'Outfits de viaje cómodos, fáciles de combinar y de meter en la maleta. Cada prenda está enlazada y se puede comprar.',
    autumn: 'Outfits de otoño, con punto, abrigos y botas, para los días que se acortan. Cada prenda está enlazada y se puede comprar.',
    summer: 'Outfits de verano ligeros, de lino y algodón, para los días de calor. Cada prenda está enlazada y se puede comprar.',
    winter: 'Outfits de invierno abrigados y bien construidos, alrededor de un buen abrigo. Cada prenda está enlazada y se puede comprar.',
    spring: 'Outfits de primavera, ligeros y luminosos, para el entretiempo. Cada prenda está enlazada y se puede comprar.',
  },
}

export function catTitle(lang, c) {
  const d = CAT[lang]
  if (!d) return c.title
  const k = c.occasion || c.season
  return d[k] ? d[k] + ' ' + d[c.gender] : c.title
}

// The kicker on a look page: "Men's Autumn Casual Outfit".
const KICK = {
  fr: { women: 'pour femme', men: 'pour homme', office: 'de bureau', casual: 'casual', weekend: 'du week-end', evening: 'de soirée', brunch: 'de brunch', date: 'de rendez-vous', travel: 'de voyage', autumn: "d'automne", summer: "d'été", winter: "d'hiver", spring: 'de printemps' },
  es: { women: 'para mujer', men: 'para hombre', office: 'de oficina', casual: 'casual', weekend: 'de fin de semana', evening: 'de noche', brunch: 'de brunch', date: 'de cita', travel: 'de viaje', autumn: 'de otoño', summer: 'de verano', winter: 'de invierno', spring: 'de primavera' },
}
function kicker(lang, v) {
  const k = KICK[lang]
  return [lang === 'fr' ? 'Tenue' : 'Outfit', k[v.occasion], k[v.season], k[v.gender]].filter(Boolean).join(' ')
}

const OCC_PHRASE = {
  en: { office: 'the office', casual: 'casual days', weekend: 'the weekend', evening: 'evenings out', brunch: 'brunch', date: 'date night', travel: 'travel' },
  fr: { office: 'le bureau', casual: 'le quotidien', weekend: 'le week-end', evening: 'les soirées', brunch: 'le brunch', date: 'les rendez-vous', travel: 'les voyages' },
  es: { office: 'la oficina', casual: 'el día a día', weekend: 'el fin de semana', evening: 'las noches', brunch: 'el brunch', date: 'una cita', travel: 'los viajes' },
}

// ---------- the strings ----------
// A value is a string with {placeholders} or a function of the values.

const S = {
  fr: {
    all_outfits: '← Tous les outfits',
    all_brands: '← Toutes les marques',
    how_to_style_back: '← Comment le porter',
    pieces_stores: (v) => `${v.n} pièces · ${v.s} boutiques`,
    pieces_stores_total: (v) => `${v.n} pièces · ${v.s} boutiques · €${v.t}`,
    card_meta: (v) => `${v.n} pièces, ${v.s} boutiques, €${v.t}`,
    count_total: (v) => `${v.n} pièces · €${v.t}`,
    shop_outfit: "Acheter l'outfit",
    save: 'Enregistrer',
    saved: 'Enregistré',
    for_less_link: (v) => `Un look similaire pour €${v.t}, vous économisez €${v.s}`,
    outfit_total: 'Total de l’outfit',
    the_pieces: 'Les pièces',
    opened: '✓ Ouvert, acheter à nouveau',
    shop_at: (v) => `Acheter chez ${v.store}`,
    change: '↻ Changer',
    try_similar: 'Essayer une pièce similaire',
    no_similar: 'Aucune pièce similaire disponible pour cet article.',
    style_ideas: (v) => `Idées de style : ${itemLabel('fr', v.group, v.colour)}`,
    for_less_h: 'Un look similaire pour moins cher',
    for_less_sub: (v) => `€${v.t} au lieu de €${v.o} : des pièces similaires, les mêmes couleurs, vous économisez €${v.s}.`,
    same_piece: 'Même pièce',
    more_from: (v) => `Plus de ${v.brand}`,
    more_like: 'Dans le même esprit',
    kicker: (v) => kicker('fr', v),
    cat_title: (v) => catTitle('fr', v),
    cat_intro: (v) => CAT_INTRO.fr[v.occasion || v.season] || '',
    cat_count: (v) => `${v.n} outfits · de nouveaux looks chaque jour`,
    cat_empty: 'Pas encore d’outfits dans cette catégorie. De nouveaux looks arrivent chaque jour.',
    more_ideas: "Plus d'idées de tenues",
    outfit_ideas: "Idées de tenues",
    outfit_ideas_intro: 'Des outfits complets, composés avec plusieurs marques et classés selon où vous allez vraiment. Chaque pièce est liée, achetez le look entier ou seulement ce qui vous manque.',
    for_women: 'Pour femme',
    for_men: 'Pour homme',
    style_guides: 'Guides de style',
    how_to_style_it: 'Comment le porter',
    style_hub_intro: 'Choisissez une pièce et voyez toutes les tenues que nous avons construites autour. Mis à jour chaque jour avec les nouveaux looks.',
    women: 'Femme',
    men: 'Homme',
    group_many: (v) => cap(itemLabel('fr', v.group)),
    colour_item: (v) => cap(itemLabel('fr', v.group, v.colour)),
    brands: 'Marques',
    shop_by_brand: 'Acheter par marque',
    brands_intro: 'Chaque outfit sur MISE mélange les marques. Choisissez celle que vous aimez et voyez toutes les façons dont nous l’avons portée.',
    n_outfits: (v) => `${v.n} outfits`,
    search: 'Recherche',
    copyright: '© 2026 MISE. Tous droits réservés.',
    style_kicker: (v) => (v.gender === 'men' ? 'Guide de style homme' : 'Guide de style femme'),
    style_title: (v) => 'Comment porter les ' + itemLabel('fr', v.group, v.colour) + (v.gender === 'men' ? ' pour homme' : ' pour femme'),
    style_intro: (v) => {
      const name = itemLabel('fr', v.group, v.colour)
      let s = `${v.n} outfits complets avec des ${name}, composés par MISE.`
      if (v.pairs?.length) s += ` Dans nos looks, on les porte le plus souvent avec ${list('fr', v.pairs.map((p) => 'des ' + itemLabel('fr', p.group, p.colour)))}.`
      if (v.occs?.length) s += ` Idéal pour ${list('fr', v.occs.map((o) => OCC_PHRASE.fr[o] || o))}.`
      if (v.min) s += ` Les pièces ci-dessous vont de €${v.min} à €${v.max}, chez ${list('fr', v.brands)}.`
      return s
    },
    style_shop: (v) => 'Acheter des ' + itemLabel('fr', v.group, v.colour),
    style_how: (v) => 'Comment nous portons les ' + itemLabel('fr', v.group, v.colour),
    style_notes: (v) => {
      const p = (v.pairs || []).map((x) => itemLabel('fr', x.group, x.colour))
      let s = `Les ${itemLabel('fr', v.group, v.colour)} portent la tenue quand tout le reste est plus discret.`
      if (p[0]) s += ` L'association à laquelle nous revenons : des ${p[0]}` + (p[1] ? `, avec des ${p[1]} en deuxième option` : '') + '.'
      return s + " Chaque look ci-dessus est complet : ouvrez-le pour voir chaque pièce, le prix total et où l'acheter."
    },
    brands_in_edit: 'Marques dans cette sélection : ',
    other_colours: 'Autres couleurs',
    more_in: (v) => 'Plus en ' + (COLOUR_ONE.fr[v.colour] || v.colour),
    more_guides: 'Plus de guides de style',
    brand_kicker: 'Sélection de marque',
    brand_title: (v) => `Outfits ${v.brand}`,
    brand_intro: (v) => {
      let s = `${v.n} outfits complets construits autour de ${v.brand}`
      if (v.w && v.m) s += `, ${v.w} pour femme et ${v.m} pour homme`
      s += `. Les pièces ${v.brand} que nous portons le plus sont les ${list('fr', v.groups.map((g) => itemLabel('fr', g)))}, de €${v.min} à €${v.max}`
      if (v.partners?.length) s += `, souvent avec ${list('fr', v.partners)}`
      return s + '. Chaque pièce mène directement à la boutique.'
    },
    brand_shop: (v) => `Acheter ${v.brand}`,
    how_to_style: 'Comment le porter',
    more_brands: 'Plus de marques',
  },
  es: {
    all_outfits: '← Todos los outfits',
    all_brands: '← Todas las marcas',
    how_to_style_back: '← Cómo combinarlo',
    pieces_stores: (v) => `${v.n} prendas · ${v.s} tiendas`,
    pieces_stores_total: (v) => `${v.n} prendas · ${v.s} tiendas · €${v.t}`,
    card_meta: (v) => `${v.n} prendas, ${v.s} tiendas, €${v.t}`,
    count_total: (v) => `${v.n} prendas · €${v.t}`,
    shop_outfit: 'Comprar el outfit',
    save: 'Guardar',
    saved: 'Guardado',
    for_less_link: (v) => `Un look parecido por €${v.t}, ahorras €${v.s}`,
    outfit_total: 'Total del outfit',
    the_pieces: 'Las prendas',
    opened: '✓ Abierta, comprar otra vez',
    shop_at: (v) => `Comprar en ${v.store}`,
    change: '↻ Cambiar',
    try_similar: 'Probar una prenda parecida',
    no_similar: 'No hay ninguna prenda parecida disponible.',
    style_ideas: (v) => `Ideas de estilo: ${itemLabel('es', v.group, v.colour)}`,
    for_less_h: 'Un look parecido por menos',
    for_less_sub: (v) => `€${v.t} en lugar de €${v.o}: prendas parecidas, los mismos colores, ahorras €${v.s}.`,
    same_piece: 'Misma prenda',
    more_from: (v) => `Más de ${v.brand}`,
    more_like: 'Más looks así',
    kicker: (v) => kicker('es', v),
    cat_title: (v) => catTitle('es', v),
    cat_intro: (v) => CAT_INTRO.es[v.occasion || v.season] || '',
    cat_count: (v) => `${v.n} outfits · nuevos looks cada día`,
    cat_empty: 'Todavía no hay outfits en esta categoría. Cada día llegan looks nuevos.',
    more_ideas: 'Más ideas de outfits',
    outfit_ideas: 'Ideas de outfits',
    outfit_ideas_intro: 'Outfits completos, montados con varias marcas y ordenados según a dónde vas de verdad. Cada prenda está enlazada, compra el look entero o solo lo que te falta.',
    for_women: 'Para mujer',
    for_men: 'Para hombre',
    style_guides: 'Guías de estilo',
    how_to_style_it: 'Cómo combinarlo',
    style_hub_intro: 'Elige una prenda y mira todos los outfits que hemos creado con ella. Se actualiza cada día con los looks nuevos.',
    women: 'Mujer',
    men: 'Hombre',
    group_many: (v) => cap(itemLabel('es', v.group)),
    colour_item: (v) => cap(itemLabel('es', v.group, v.colour)),
    brands: 'Marcas',
    shop_by_brand: 'Comprar por marca',
    brands_intro: 'Cada outfit de MISE mezcla marcas. Elige la que te gusta y mira todas las formas en que la hemos combinado.',
    n_outfits: (v) => `${v.n} outfits`,
    search: 'Buscar',
    copyright: '© 2026 MISE. Todos los derechos reservados.',
    style_kicker: (v) => (v.gender === 'men' ? 'Guía de estilo de hombre' : 'Guía de estilo de mujer'),
    style_title: (v) => 'Cómo combinar ' + itemLabel('es', v.group, v.colour) + (v.gender === 'men' ? ' para hombre' : ' para mujer'),
    style_intro: (v) => {
      const name = itemLabel('es', v.group, v.colour)
      let s = `${v.n} outfits completos con ${name}, creados por MISE.`
      if (v.pairs?.length) s += ` En nuestros looks se llevan sobre todo con ${list('es', v.pairs.map((p) => itemLabel('es', p.group, p.colour)))}.`
      if (v.occs?.length) s += ` Funcionan mejor para ${list('es', v.occs.map((o) => OCC_PHRASE.es[o] || o))}.`
      if (v.min) s += ` Las prendas de abajo van de €${v.min} a €${v.max}, de ${list('es', v.brands)}.`
      return s
    },
    style_shop: (v) => 'Comprar ' + itemLabel('es', v.group, v.colour),
    style_how: (v) => 'Cómo combinamos ' + itemLabel('es', v.group, v.colour),
    style_notes: (v) => {
      const p = (v.pairs || []).map((x) => itemLabel('es', x.group, x.colour))
      let s = `${cap(itemLabel('es', v.group, v.colour))}: son la prenda que manda cuando todo lo demás es más discreto.`
      if (p[0]) s += ` La combinación a la que siempre volvemos: ${p[0]}` + (p[1] ? `, con ${p[1]} como segunda opción` : '') + '.'
      return s + ' Cada look de arriba está completo: ábrelo para ver cada prenda, el precio total y dónde se vende.'
    },
    brands_in_edit: 'Marcas en esta selección: ',
    other_colours: 'Otros colores',
    more_in: (v) => 'Más en ' + (COLOUR_ONE.es[v.colour] || v.colour),
    more_guides: 'Más guías de estilo',
    brand_kicker: 'Selección de marca',
    brand_title: (v) => `Outfits de ${v.brand}`,
    brand_intro: (v) => {
      let s = `${v.n} outfits completos creados alrededor de ${v.brand}`
      if (v.w && v.m) s += `, ${v.w} para mujer y ${v.m} para hombre`
      s += `. Las prendas de ${v.brand} que más combinamos son ${list('es', v.groups.map((g) => itemLabel('es', g)))}, de €${v.min} a €${v.max}`
      if (v.partners?.length) s += `, normalmente con ${list('es', v.partners)}`
      return s + '. Cada prenda lleva directamente a la tienda.'
    },
    brand_shop: (v) => `Comprar ${v.brand}`,
    how_to_style: 'Cómo combinarlo',
    more_brands: 'Más marcas',
  },
}

// Returns the translated string, or null to keep the English one.
export function tr(lang, id, v = {}) {
  const d = S[lang]
  if (!d || d[id] === undefined) return null
  const x = d[id]
  try {
    return typeof x === 'function' ? x(v) : x
  } catch (e) {
    return null
  }
}
