export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/go/', '/api/', '/admin'],
      },
    ],
    sitemap: 'https://www.mise.style/sitemap.xml',
    host: 'https://www.mise.style',
  }
}
