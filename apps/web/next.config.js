import path from 'node:path';
import createNextIntlPlugin from 'next-intl/plugin';

// Derived, never hardcoded: the storage host belongs to the deployment, and a
// literal here both duplicates the env var every runtime path already uses and
// publishes the project ref in a public repo.
const storageHost = process.env.SUPABASE_S3_STORAGE_PUBLIC_ENDPOINT
  ? new URL(process.env.SUPABASE_S3_STORAGE_PUBLIC_ENDPOINT).hostname
  : undefined;

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: storageHost
      ? [
          {
            protocol: 'https',
            hostname: storageHost,
            port: '',
            pathname: '/storage/v1/object/public/**',
          },
        ]
      : [],
  },

  experimental: {
    serverActions: {
      bodySizeLimit: '3mb',
    },
    // Rewrites `import { X } from 'pkg'` into a direct deep import per symbol.
    // These are all barrel packages: without this, importing one icon pulls the
    // module graph for the whole set, which the bundler then has to prove is
    // dead before dropping it — and it usually can't, because of side effects.
    optimizePackageImports: [
      'lucide-react',
      'react-icons',
      'date-fns',
      'framer-motion',
      'embla-carousel-react',
      'cmdk',
      // Measured 2026-07-27: adding '@byte-of-me/ui' here changes nothing
      // (/en initial JS 1604 KB either way, .next/static 9.0M either way).
      // Turbopack already drops the unreached modules behind our own barrel,
      // so the barrel is a maintainability concern, not a bundle one.
    ],
  },

  turbopack: {
    resolveExtensions: ['.mdx', '.tsx', '.ts', '.jsx', '.js', '.mjs', '.json'],
  },

  transpilePackages: [
    '@byte-of-me/db',
    '@byte-of-me/ui',
    '@byte-of-me/logger',
    '@byte-of-me/storage',
  ],

  // The build runs `next build --turbopack`, which ignores a `webpack` hook
  // entirely — so the PrismaPlugin that used to live here never ran. It is not
  // needed either: Prisma 7 talks to Postgres through `@prisma/adapter-pg`, so
  // there is no query-engine binary for the plugin to copy.

  // pnpm workspace: without this, file tracing starts at apps/web and Next
  // cannot follow symlinks into the root node_modules, which on Vercel shows up
  // as a workspace-root warning and mis-traced server bundles.
  outputFileTracingRoot: path.join(import.meta.dirname, '../../'),
  outputFileTracingExcludes: {
    // Nothing server-rendered needs these at runtime; they are pure build-time
    // or editor-only weight in the serverless function.
    '**/*': [
      'node_modules/.pnpm/@swc+core*/**',
      'node_modules/.pnpm/esbuild*/**',
      'node_modules/.pnpm/typescript*/**',
      'node_modules/.pnpm/@esbuild*/**',
      'node_modules/.pnpm/prisma@*/**',
    ],
  },
  async headers() {
    return [
      {
        // Public pages only. `api` must be excluded here: NextAuth serves
        // per-user session/CSRF JSON under /api/auth, and a shared CDN that
        // honors `public, s-maxage` would replay one user's session to another.
        source: '/((?!api|.*dashboard).*)/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-store',
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
  requestConfig: './src/shared/i18n/request.ts',

  experimental: {
    createMessagesDeclaration: ['./messages/en.json', './messages/vi.json'],

    messages: {
      format: 'json',
      locales: 'infer',
      path: './messages',
      precompile: true,
    },
    srcPath: './src',
  },
});
export default withNextIntl(nextConfig);
