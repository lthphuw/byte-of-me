import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import createNextIntlPlugin from 'next-intl/plugin';

const repoRoot = path.join(import.meta.dirname, '../../');

// Every package under packages/ ships TypeScript source, so Next compiles all
// of them. Read from the workspace so a new package cannot be forgotten here.
function workspacePackageNames() {
  const { workspaces } = JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8')
  );
  return workspaces.packages
    .filter((glob) => !glob.startsWith('apps/'))
    .map((glob) => path.join(repoRoot, glob.replace(/\/\*$/, '')))
    .flatMap((dir) =>
      fs.readdirSync(dir).map((entry) => path.join(dir, entry, 'package.json'))
    )
    .filter((file) => fs.existsSync(file))
    .map((file) => JSON.parse(fs.readFileSync(file, 'utf8')).name);
}

// Derived, never hardcoded: the storage host belongs to the deployment, and a
// literal here both duplicates the env var every runtime path already uses and
// publishes the project ref in a public repo.
const storageHost = process.env.SUPABASE_S3_STORAGE_PUBLIC_ENDPOINT
  ? new URL(process.env.SUPABASE_S3_STORAGE_PUBLIC_ENDPOINT).hostname
  : undefined;

// Resolves the exact libvips file the INSTALLED sharp dlopens (no version to go stale; a missing one
// throws at config load). A wildcard also matched Next's nested sharp copy (16 MB) and pushed
// /dashboard/user-profile to 250.22 MB against Vercel's 250 MB uncompressed function limit.
function sharpLibvipsBinary() {
  const require = createRequire(import.meta.url);
  // musl second: on Alpine `process.platform` still reports 'linux', so the
  // glibc name is tried first and simply does not resolve there.
  const candidates =
    process.platform === 'linux'
      ? [`linux-${process.arch}`, `linuxmusl-${process.arch}`]
      : [`${process.platform}-${process.arch}`];

  // Resolved FROM sharp's own entry point, so it finds the copy that sharp
  // itself will load rather than whatever a hoisted node_modules happens to
  // expose.
  const from = require.resolve('sharp');

  for (const platform of candidates) {
    try {
      const binary = require.resolve(`@img/sharp-libvips-${platform}/binary`, {
        paths: [from],
      });
      // Relative: include globs resolve from the Next project dir, not outputFileTracingRoot.
      return path.relative(import.meta.dirname, binary);
    } catch {
      // try the next candidate
    }
  }

  throw new Error(
    `next.config.js: no @img/sharp-libvips-* package for ${process.platform}-${process.arch}. ` +
      `sharp cannot load without it, so the build is stopped here rather than ` +
      `producing a function that fails on the first image upload.`
  );
}

const SHARP_LIBVIPS = [sharpLibvipsBinary()];

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
    remotePatterns: [
      // Repo owner avatars on the open-source list.
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        port: '',
        pathname: '/u/**',
      },
      ...(storageHost
        ? [
            {
              protocol: 'https',
              hostname: storageHost,
              port: '',
              pathname: '/storage/v1/object/public/**',
            },
          ]
        : []),
    ],
  },

  experimental: {
    serverActions: {
      // A flat '20mb', headroom over MAX_UPLOAD_TOTAL_MB (16): at one file's size, multipart framing
      // makes Next reject the request before the action runs, so `findUploadViolation` cannot answer.
      bodySizeLimit: '20mb',
    },
    // 87 MB of `.map` files across .next/server, all of it shipped inside the
    // serverless function. Stack traces stay readable through the framework's
    // own frames; the trade is deploy size and cold start, which users feel.
    serverSourceMaps: false,
    // No `optimizePackageImports`: measured on Next 16.2.3 `--turbopack` (noise floor 25 B of 9.51 MB),
    // removing all nine barrel packages moved client JS by 47 B (0.0005%), 'lucide-react' alone by 5 B.
    // Turbopack tree-shakes itself; the option is a webpack-era remedy, so check the number first.
  },

  turbopack: {
    resolveExtensions: ['.mdx', '.tsx', '.ts', '.jsx', '.js', '.mjs', '.json'],
  },

  transpilePackages: workspacePackageNames(),

  // No PrismaPlugin: `next build --turbopack` ignores `webpack`; Prisma 7 (`@prisma/adapter-pg`) has no
  // query-engine binary to copy.

  // Bun workspace: without this, file tracing starts at apps/web and Next
  // cannot follow symlinks into the root node_modules, which on Vercel shows up
  // as a workspace-root warning and mis-traced server bundles.
  outputFileTracingRoot: repoRoot,
  // sharp dlopens its 17 MB libvips-cpp.so by path, so file tracing (static
  // requires only) drops it and the first upload dies with ERR_DLOPEN_FAILED.
  // The `dashboard` key below ships it; sharpLibvipsBinary() resolves the path.
  outputFileTracingIncludes: {
    // picomatch `contains` matching: a bare SUBSTRING works, 'dashboard' covers `/[locale]/dashboard/*`.
    // Any key with a `/` (e.g. '**/dashboard/**/*') matches NOTHING, with no warning or build error, and
    // the function 500s on first upload (verified by reading the emitted `.nft.json`).
    dashboard: SHARP_LIBVIPS,
  },
  outputFileTracingExcludes: {
    // Build-time and editor-only weight. Tracing resolves symlinks to Bun's isolated store
    // (node_modules/.bun/<pkg>@<version>/), so the excludes target that path, not the flat symlinks.
    '**/*': [
      'node_modules/.bun/typescript@*/**',
      'node_modules/.bun/esbuild@*/**',
      'node_modules/.bun/prisma@*/**',
    ],
  },
  async redirects() {
    return [
      {
        // About was folded into the homepage. Permanent, so links and search
        // results move over instead of 404ing.
        source: '/:locale(en|vi)/about',
        destination: '/:locale',
        permanent: true,
      },
      {
        source: '/about',
        destination: '/',
        permanent: true,
      },
      {
        // The experience page is gone; old links move to the homepage with a
        // permanent redirect instead of a 404.
        source: '/:locale(en|vi)/experience',
        destination: '/:locale',
        permanent: true,
      },
      {
        source: '/experience',
        destination: '/',
        permanent: true,
      },
    ];
  },
  async headers() {
    const noFraming = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
    ];

    return [
      {
        // Public pages only. Excludes `api` (a CDN with `s-maxage` would replay /api/auth session JSON
        // across users) and `_next`: this rule OVERRIDES the framework header, so hashed assets lost
        // `max-age` and revalidated each navigation; omitting it restores `max-age=31536000, immutable`.
        source: '/((?!api|_next|.*dashboard).*)/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        // Already excluded from the public rule by name; stated positively so
        // the private set is one list rather than a pattern to reason about.
        source: '/:locale/dashboard/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-cache, no-store, max-age=0, must-revalidate',
          },
        ],
      },
      {
        // Not excluded from the public rule, so it must follow it: the layout
        // redirects a signed-in admin, and a CDN must never replay that redirect.
        source: '/:locale/auth/:path*',
        headers: [{ key: 'Cache-Control', value: 'private, no-store' }],
      },
      // No /api rule on purpose: production ignores headers() on function responses,
      // so /api/og sets its own Cache-Control, and Auth.js sets its own on /api/auth/*.
      // Locally the /:locale/auth rule also matches /api/auth/* (:locale is any segment).
      {
        // Never carries Cache-Control: a headers() entry REPLACES a same-key one.
        // HSTS omits includeSubDomains/preload: neither can be undone once seen.
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
        ],
      },
      // Never framed. The CSP is frame-ancestors ONLY: inline boot-splash/JSON-LD/
      // theme scripts and static caching rule out nonces. Public pages stay framable.
      { source: '/:locale/dashboard/:path*', headers: noFraming },
      { source: '/:locale/auth/:path*', headers: noFraming },
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
