// Cada marca vende la misma prenda en varias tiendas de pais, y lo que hay guardado
// en la base de datos es la tienda desde la que se copio la foto del producto, que no
// tiene nada que ver con el pais del visitante. Auditados los 806 enlaces vivos el
// 2026-09-12: Massimo Dutti apuntaba entero a IRLANDA (109 enlaces) y COS a la tienda
// FRANCESA en frances (156 de 163), mientras que las impresiones venian de Reino Unido
// (193), Italia (95), Alemania (32) y Francia (25). De Irlanda: cero.
//
// COMPROBADO A MANO, producto l12430850 de MD y 1357160001 de COS:
//   massimodutti.com acepta el slug INGLES en /gb /ie /it /de /fr /es /pl /ch, y el
//   propio MD redirige solo al slug traducido (/it/mocassino-in-pelle-...-l12430850).
//   cos.com acepta el mismo slug en en-gb, en-ie, it-it, de-de, es-es, fr-fr.
//
// Y OJO CON ESTO, que costo un rato entender: las URL de Massimo Dutti que acaban en
// .html estan MUERTAS, devuelven "PAGE DOES NOT EXIST". Habia tres en la base de datos.
// Quitarle la extension arregla el enlace. Aqui se hace al vuelo, en cada clic.
//
// REGLA DE SEGURIDAD: si la marca no esta en la tabla, la URL se devuelve intacta; si
// el pais no esta en el mapa de esa marca, se usa el valor por defecto de la marca, que
// esta comprobado. NUNCA se inventa un codigo de pais. Mandar a un 404 es peor que
// mandar a la tienda de otro pais.

const FALLBACK_COUNTRY = 'GB'

const STORES = [
  {
    name: 'Massimo Dutti',
    hosts: ['www.massimodutti.com', 'massimodutti.com'],
    fallback: 'gb',
    stripHtml: true,
    byCountry: {
      GB: 'gb',
      IE: 'ie',
      IT: 'it',
      DE: 'de',
      FR: 'fr',
      ES: 'es',
      PL: 'pl',
      CH: 'ch',
    },
  },
  {
    name: 'COS',
    hosts: ['www.cos.com', 'cos.com'],
    fallback: 'en-gb',
    byCountry: {
      GB: 'en-gb',
      IE: 'en-ie',
      IT: 'it-it',
      DE: 'de-de',
      FR: 'fr-fr',
      ES: 'es-es',
    },
  },
]

function findStore(hostname) {
  return STORES.find((s) => s.hosts.includes(hostname)) || null
}

// Devuelve la misma URL con el trozo de pais cambiado por el del visitante.
// country = cabecera x-vercel-ip-country, dos letras, o null si no se sabe.
export function localizeStoreUrl(rawUrl, country) {
  if (!rawUrl || typeof rawUrl !== 'string') return rawUrl

  let u
  try {
    u = new URL(rawUrl)
  } catch (e) {
    return rawUrl
  }

  const store = findStore(u.hostname)
  if (!store) return rawUrl

  if (store.stripHtml && u.pathname.endsWith('.html')) {
    u.pathname = u.pathname.slice(0, -5)
  }

  const cc = String(country || FALLBACK_COUNTRY).toUpperCase()
  const segment = store.byCountry[cc] || store.fallback

  const parts = u.pathname.split('/')
  // parts[0] es siempre vacio porque la ruta empieza por barra, y parts[1] es el pais.
  // Si no hay nada despues del pais no es una ficha de producto, no se toca.
  if (parts.length < 3) return u.toString()

  parts[1] = segment
  u.pathname = parts.join('/')

  return u.toString()
}

// Solo para comprobar a mano desde una consola o un test.
export function listLocalizedStores() {
  return STORES.map((s) => ({
    name: s.name,
    hosts: s.hosts,
    countries: Object.keys(s.byCountry),
    fallback: s.fallback,
  }))
}
