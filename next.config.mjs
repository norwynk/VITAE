/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow Codespaces and other development environments
  experimental: {
    serverActions: {
      allowedOrigins: ['*'],
    },
  },
  // Disable host check in development
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
