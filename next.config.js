/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/hrc-data',
        destination: '/.netlify/functions/hrc-data',
      },
    ];
  },
};

module.exports = nextConfig;
