import type { NextConfig } from 'next';
import { assertMatchingDataModes } from './src/config';

assertMatchingDataModes();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The address printed on the welcome pack's QR code. Keep it working for as long as packs are out there.
  async redirects() {
    return [
      { source: '/first-prick', destination: '/app', permanent: false },
      { source: '/my-pens', destination: '/app', permanent: false },
      // Short enough for a bio: prick.co.za/list?from=instagram
      { source: '/list', destination: '/the-prick-list', permanent: false },
    ];
  },
  async headers() {
    return [
      {
        // Health responses must never be cached by browsers or proxies.
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
};

export default nextConfig;
