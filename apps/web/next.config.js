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

  // One header per response that tells an attacker the stack and nobody else
  // anything.
  poweredByHeader: false,

  images: {
    // AVIF first, WebP as the fallback for the browsers that lack it. Next only
    // serves the first format the client accepts, so this costs nothing on the
    // request path — it only adds one more encode on a cache miss.
    formats: ['image/avif', 'image/webp'],
    // Uploaded images are content-addressed by Supabase, so a URL's bytes never
    // change; the 60s default makes the optimizer re-encode far more than needed.
    minimumCacheTTL: 31536000,
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
      // Sized from the media rules, not picked round: MAX_IMAGE_SIZE_MB (3) ×
      // MAX_UPLOAD_BATCH (5) plus multipart overhead.
      //
      // It used to be '3mb', exactly one image's worth. A single file at the
      // limit already exceeded it once multipart framing was added, so Next
      // rejected the request at the framework boundary — before the action ran
      // and before any of our validation could say which file was too big or
      // why. The upload just failed. Keeping headroom here is what lets
      // `findUploadViolation` be the thing that answers.
      bodySizeLimit: '20mb',
    },
    // 87 MB of `.map` files across .next/server, all of it shipped inside the
    // serverless function. Stack traces stay readable through the framework's
    // own frames; the trade is deploy size and cold start, which users feel.
    serverSourceMaps: false,
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

  // Bun workspace: without this, file tracing starts at apps/web and Next
  // cannot follow symlinks into the root node_modules, which on Vercel shows up
  // as a workspace-root warning and mis-traced server bundles.
  outputFileTracingRoot: path.join(import.meta.dirname, '../../'),
  outputFileTracingExcludes: {
    // Nothing server-rendered needs these at runtime; they are pure build-time
    // or editor-only weight in the serverless function. Bun's isolated linker
    // stores real package contents under node_modules/.bun/<pkg>@<version>/
    // node_modules/<pkg>, with flat node_modules/<pkg> symlinks per consumer
    // pointing at that store — file tracing resolves symlinks to their real
    // path, so the excludes target the store path directly, the same way the
    // old pnpm globs targeted node_modules/.pnpm rather than the flat symlinks.
    '**/*': [
      'node_modules/.bun/typescript@*/**',
      'node_modules/.bun/esbuild@*/**',
      'node_modules/.bun/prisma@*/**',
    ],
  },
  async headers() {
    return [
      {
        // Public pages only. Two exclusions matter here:
        //
        // `api` — NextAuth serves per-user session/CSRF JSON under /api/auth,
        // and a shared CDN that honors `public, s-maxage` would replay one
        // user's session to another.
        //
        // `_next` — this rule OVERRIDES the framework's own header rather than
        // adding to it, and /_next/static filenames already carry a content
        // hash. Without the exclusion those assets answered with `s-maxage`
        // and no `max-age` at all, so browsers revalidated every chunk on
        // every navigation instead of reading their own disk cache. Leaving
        // them out restores `public, max-age=31536000, immutable`.
        source: '/((?!api|_next|.*dashboard).*)/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        // Everything under /api is per-user or per-request — except `og`, which
        // is handled by the next rule.
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-store',
          },
        ],
      },
      {
        // Social preview cards: a pure function of the query string, rendered
        // through satori on every miss. Scrapers (Slack, iMessage, Twitter)
        // refetch these constantly, so `no-store` from the rule above meant
        // re-rendering the same card forever. Declared after that rule because
        // the last matching header wins.
        source: '/api/og',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, s-maxage=86400, immutable',
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
