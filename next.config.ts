import type { NextConfig } from 'next';

// Vercel serves Rep & Lap at the domain root. No GitHub Pages
// basePath, assetPrefix, or static-export mode is necessary.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
    ];
  },
};

export default nextConfig;
