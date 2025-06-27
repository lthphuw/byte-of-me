// next.config.js
const { withContentlayer } = require('next-contentlayer');
const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    webpackMemoryOptimizations: true,
    serverActions: true,
  },
}

module.exports = withContentlayer(withNextIntl(nextConfig));
