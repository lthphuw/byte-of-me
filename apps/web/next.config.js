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
    serverComponentsExternalPackages: ['ua-parser-js', 'jsdom'],
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
  async headers() {
    return [
      {
        source: '/((?!.*dashboard).*)/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/:locale/dashboard/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-cache, no-store, max-age=0, must-revalidate',
          },
        ],
      },
    ];
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
