/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'images.openfoodfacts.org' },
      { protocol: 'https', hostname: 'static.openfoodfacts.org' },
      { protocol: 'https', hostname: 'world.openfoodfacts.org' },
      { protocol: 'https', hostname: 'images.rewe.de' },
      { protocol: 'https', hostname: 'www.lidl.de' },
      { protocol: 'https', hostname: 'www.aldi-sued.de' },
      { protocol: 'https', hostname: 'cdn.kaufland.de' },
    ],
  },
  experimental: { serverActions: { allowedOrigins: ['echtzeiteinkauf.com'] } },
}
module.exports = nextConfig
