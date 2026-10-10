import path from 'node:path';
import { createRequire } from 'node:module';
import createNextIntlPlugin from 'next-intl/plugin';

// Derived, never hardcoded: the storage host belongs to the deployment, and a
// literal here both duplicates the env var every runtime path already uses and
// publishes the project ref in a public repo.
const storageHost = process.env.SUPABASE_S3_STORAGE_PUBLIC_ENDPOINT
  ? new URL(process.env.SUPABASE_S3_STORAGE_PUBLIC_ENDPOINT).hostname
  : undefined;

// The one file `sharp` cannot start without, resolved rather than globbed.
//
// `@img/sharp-libvips-<platform>` publishes a `./binary` export pointing at its
// own `libvips-cpp.so.<version>`, so this asks the resolver for the exact file
// the INSTALLED sharp will dlopen — no version in this file to fall out of date,
// and no wildcard.
//
// It used to be a wildcard (`@img+sharp-libvips-*/.../lib/**`) on the theory
// that a pinned glob would stop matching after a sharp upgrade and stop
// silently. The theory was right and the remedy was wrong: the wildcard also
// matched Next's own nested `sharp@0.34.5` copy (libvips 1.2.4, 16 MB), and the
// two together pushed `/dashboard/user-profile` to 250.22 MB against Vercel's
// 250 MB uncompressed function limit. Resolution fixes both halves — it selects
// exactly one libvips, and a missing one throws HERE, at config load, which
// fails the build loudly instead of shipping a function that 500s on upload.
//
// The path is returned relative to this directory because include globs are
// resolved with the Next project directory as cwd, not `outputFileTracingRoot`.
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
      // A flat '20mb', not computed from the per-file ceilings — MAX_UPLOAD_TOTAL_MB
      // (16: five 3 MB images, or one 10 MB clip and a few images) is sized to
      // fit comfortably under it, not the other way around; see
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
  // sharp dlopens its 17 MB libvips-cpp.so by path, so file tracing (static
  // requires only) drops it and the first upload dies with ERR_DLOPEN_FAILED.
  // The `dashboard` key below ships it; sharpLibvipsBinary() resolves the path.
  outputFileTracingIncludes: {
    // Keys are matched against the route with picomatch's `contains` option, so
    // a bare SUBSTRING is the form that works: 'dashboard' covers every
    // `/[locale]/dashboard/*`.
    //
    // Do not "improve" this into a real path. `'**/dashboard/**/*'` was tried
    // first and matched NOTHING — any key containing a `/` silently fails here, and a key
    // that matches nothing produces no warning, no build error, and a function
    // that 500s on the first upload. Each form above was proved by building with
    // a distinct throwaway file per key and reading the emitted `.nft.json`.
    dashboard: SHARP_LIBVIPS,
  },
  outputFileTracingExcludes: {
    // Nothing server-rendered needs these at runtime; they are pure build-time
    // or editor-only weight in the serverless function. Bun's isolated linker
    // stores real package contents under node_modules/.bun/<pkg>@<version>/
    // node_modules/<pkg>, with flat node_modules/<pkg> symlinks per consumer
    // pointing at that store — file tracing resolves symlinks to their real
    // path, so the excludes target the store path directly, not the flat symlinks.
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
        // Experience is hidden, not deleted: its page body is parked in
        // (public)/experience/page.tsx. Permanent, so old links move to the
        // homepage with a real 308 instead of a 200 shell.
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
