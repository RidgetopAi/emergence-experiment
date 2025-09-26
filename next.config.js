/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    AIDIS_API_URL: process.env.AIDIS_API_URL || 'http://localhost:8080',
    DEPLOYMENT_ENV: process.env.NODE_ENV,
  },
  images: {
    domains: ['localhost'],
  },
  async rewrites() {
    return [
      {
        source: '/api/aidis/:path*',
        destination: `${process.env.AIDIS_API_URL || 'http://localhost:8080'}/mcp/tools/:path*`,
      },
    ];
  },
  experimental: {
    optimizePackageImports: ['d3', 'lucide-react'],
  },
};

module.exports = nextConfig;