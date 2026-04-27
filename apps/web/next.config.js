/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@cardapio/shared'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
};

module.exports = nextConfig;
