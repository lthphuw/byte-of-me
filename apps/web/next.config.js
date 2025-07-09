// next.config.js
const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
const { PrismaPlugin } = require('@prisma/nextjs-monorepo-workaround-plugin');
const pino = require('pino');

const logger = (defaultConfig) =>
  pino({
    ...defaultConfig,
    messageKey: 'message',
    mixin: () => ({ name: 'byte-of-me' }),
  });

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    instrumentationHook: true,
    webpackMemoryOptimizations: true,
    serverActions: true,
  },
  turbopack: {
    resolveExtensions: ['.mdx', '.tsx', '.ts', '.jsx', '.js', '.mjs', '.json'],
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.plugins = [...config.plugins, new PrismaPlugin()];
    }

    return config;
  },
};

module.exports = {
  ...withNextIntl(nextConfig),
  logger,
};
