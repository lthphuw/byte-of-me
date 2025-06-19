const { withContentlayer } = require('next-contentlayer');
const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [],
  },
  experimental: {},
  serverExternalPackages: ['@prisma/client'],
  logging: {
    fetches: {
      fullUrl: true, // Log full URLs for fetch requests
      hmrRefreshes: true, // Log HMR cache refreshes
      incomingRequests: false, // Disable incoming request logs
    },
  },
};

module.exports = withContentlayer(withNextIntl(nextConfig));