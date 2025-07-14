/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/dialog',
        destination: 'http://localhost:4000/api/dialog/message',
      },
    ];
  },
};

export default nextConfig;