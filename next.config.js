/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compiler: {
    styledComponents: true,
  },
  transpilePackages: ['@sanity/ui', 'sanity', 'motion'],
  async redirects() {
    return [
      {
        source: '/en',
        has: [{ type: 'host', value: 'scandicommerce.vercel.app' }],
        destination: 'https://scandicommerce.com',
        permanent: true,
      },
      {
        source: '/en/:path*',
        has: [{ type: 'host', value: 'scandicommerce.vercel.app' }],
        destination: 'https://scandicommerce.com/:path*',
        permanent: true,
      },
      {
        source: '/no',
        has: [{ type: 'host', value: 'scandicommerce.vercel.app' }],
        destination: 'https://scandicommerce.no',
        permanent: true,
      },
      {
        source: '/no/:path*',
        has: [{ type: 'host', value: 'scandicommerce.vercel.app' }],
        destination: 'https://scandicommerce.no/:path*',
        permanent: true,
      },
    ]
  },
  images: {
    domains: [],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.myshopify.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.shopify.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
      },
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
}

module.exports = nextConfig
