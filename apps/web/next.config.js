import { PrismaPlugin } from '@prisma/nextjs-monorepo-workaround-plugin';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ovkdfmeangyqrozdithl.storage.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  experimental: {
    serverActions: {
      bodySizeLimit: '3mb',
    },
  },

  turbopack: {
    resolveExtensions: ['.mdx', '.tsx', '.ts', '.jsx', '.js', '.mjs', '.json'],
  },

  webpack: (config, { isServer, nextRuntime }) => {
    if (isServer && nextRuntime !== 'edge') {
      config.plugins.push(new PrismaPlugin());
    }
    return config;
  },
};
const withNextIntl = createNextIntlPlugin({
  experimental: {
    createMessagesDeclaration: ['./messages/en.json', './messages/vi.json'],
    messages: {
      format: 'json',
      locales: 'infer',
      path: './messages',

      precompile: true,
    },
  },
  extract: {
    sourceLocale: 'en',
  },
});

export default withNextIntl(nextConfig);
