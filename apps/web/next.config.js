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
      // A flat '20mb', not computed from the per-file ceiling times the
      // batch size — MAX_IMAGE_SIZE_MB (3) and MAX_UPLOAD_BATCH (5) are
      // sized to fit comfortably under it, not the other way around; see
      // `docs(day-entry): correct why the photo limits are what they are`.
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
    // No `optimizePackageImports`. It used to list nine barrel packages, and
    // it was measured out rather than argued out.
    //
    // Method (2026-08-19): noise floor first — the same config built twice
    // landed 25 B apart out of 9.51 MB — then five clean builds with `.next`
    // deleted between each, invoking `next build --turbopack` directly in
    // apps/web so turbo's task cache could not serve a stale result. Next
    // 16.2.3 no longer prints the Size / First Load JS table, so per-route
    // numbers were derived from the static JS each prerendered HTML references
    // and from `page_client-reference-manifest.js` for the dynamic routes. The
    // config was proved to be read at all by renaming the key and checking
    // Next printed `(invalid experimental key)` — otherwise "no change" and
    // "silently ignored" look identical.
    //
    // Result: removing the ENTIRE option moved total client JS by 47 B —
    // 0.0005%, twice the noise floor. Dropping just 'lucide-react', with 136
    // import sites, moved 5 B. Both builds here are `--turbopack`, and
    // Turbopack does this tree-shaking itself; the option is a webpack-era
    // remedy for a problem this bundler does not have.
    //
    // Kept as a comment because the list looked useful and was not: anyone
    // reaching for it as a bundle fix should see the number first.
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
        // Every signed-in surface, back to `private, no-store`.
        //
        // The rule above excludes `dashboard` by name, which read as "the
        // private half is covered". It is not: `/[locale]/space/**` (the notes
        // workspace) and `/[locale]/print/notes/[id]` are `(protected)` routes
        // that contain no such segment, so they matched the public rule and
        // answered `public, s-maxage=3600, stale-while-revalidate=86400`.
        //
        // That is worse than an over-eager cache. Next serves dynamic routes
        // `private, no-store` by default; a `headers()` entry REPLACES that
        // default rather than adding to it (the note about `_next` above is the
        // same mechanism). So an admin opening a private note authorised every
        // shared cache in front of the app to keep that HTML for an hour and
        // hand it to whoever asked for the URL next — `requireAdmin` never runs
        // on a cache hit.
        //
        // Declared after the public rule because the last matching header wins.
        // `:path*` matches zero segments, so `/en/space` is covered as well as
        // `/en/space/notes/xxx`.
        //
        // Listed per surface rather than as one alternation over the first
        // segment: `/[locale]/print` holds BOTH the private notes export and
        // the public article export, and a pattern matching the segment would
        // have taken the article's CDN caching away with it.
        source: '/:locale/space/:path*',
        headers: [{ key: 'Cache-Control', value: 'private, no-store' }],
      },
      {
        // The notes export specifically — `/[locale]/print/blogs/*` next to it
        // is published content and stays publicly cacheable.
        source: '/:locale/print/notes/:path*',
        headers: [{ key: 'Cache-Control', value: 'private, no-store' }],
      },
      {
        // Already excluded from the public rule by name; stated positively so
        // the private set is one list rather than a pattern to reason about.
        source: '/:locale/dashboard/:path*',
        headers: [{ key: 'Cache-Control', value: 'private, no-store' }],
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
