/**
 * Virtual modules for three specifiers that only work inside a live Next.js
 * server runtime (a real request, a real React Server Component render, a
 * real incremental cache). `bun test` has none of that, so any spec whose
 * import graph reaches a server action built on these needs a stand-in, not
 * the real thing — none of the following is testing Next.js itself.
 *
 * - `server-only`: Next resolves this bare specifier through its own
 *   bundler alias (`next/dist/compiled/server-only`). It is not an
 *   installed package anywhere in this repo's `node_modules` (confirmed: no
 *   top-level `server-only` in `bun.lock` or any workspace), so outside
 *   Next's bundler it is simply unresolvable — module resolution fails
 *   before a single test runs. The marker package's only production job is
 *   to throw if bundled into a Client Component; that has no meaning in a
 *   Bun test process, which never builds a client bundle, so an empty
 *   module satisfies it.
 *
 * - `next-intl/server`'s `getLocale`/`getTranslations`: both read from
 *   request-scoped storage that only exists during an actual Next.js
 *   render. Calling the real ones outside that context throws
 *   ("`getLocale` is not supported in Client Components"). Server actions
 *   under test don't own locale resolution — they consume whatever locale
 *   they're given — so a fixed 'en' is a stand-in for an upstream concern,
 *   not the thing under test.
 *
 * - `next/cache`: `unstable_cache` wraps a fetch in Next's incremental cache,
 *   which throws ("incrementalCache missing") outside a real Next.js server.
 *   AGENTS.md §10 already excludes cache-key strings from what a test may
 *   assert on, so a passthrough (call the wrapped function directly, no
 *   memoization) is consistent with that: it exercises the computation the
 *   cache wraps without exercising Next's cache machinery.
 *
 *   `revalidateTag` and `revalidatePath` are stubbed as no-ops for the same
 *   reason — they mutate a cache that does not exist here. They are included
 *   because 29 files across the app import from this specifier and the three
 *   named exports are split across them; a stub carrying only
 *   `unstable_cache` would leave a mutating action's test failing with
 *   "revalidateTag is not a function", which reads like a bug in the action
 *   rather than a gap in the harness. If a test ever needs to assert that an
 *   action revalidated the right tag — a real contract, and a common bug per
 *   AGENTS.md §6 — replace these no-ops with recording spies at that point.
 *
 * - `@/shared/lib/auth` reaches Auth.js, which needs a request context that
 *   only exists inside a live Next.js server render — but only when `auth()`
 *   is actually *called*. Constructing the `NextAuth({...})` instance at
 *   module load (what `@/shared/lib/auth/auth` does at its top level) does
 *   not need that context, and is not what this stub avoids: it avoids
 *   calling `auth()` outside a request, since specs that exercise a guarded
 *   action care about what the action does *after* the guard passes, not
 *   about Auth.js itself. `build.module` does intercept a tsconfig path
 *   alias (confirmed empirically: `build.module('@/shared/lib/auth', ...)` is
 *   reached by a spec importing that alias, which resolves through
 *   `"@/*": ["src/*"]` in `apps/web/tsconfig.json`) — the three stubs above
 *   all use bare specifiers, so this was a genuine open question before it
 *   was checked.
 *
 *   This stub is global: every spec in the app sees it, not just the ones
 *   that intend to exercise a guard. The helpers derive from one mutable
 *   identity rather than each hard-returning a fixed value, so their
 *   relationship stays truthful — `getAuthenticatedAdmin` still returns null
 *   for a non-admin, and `requireAdmin` still throws for one. A stub whose
 *   helpers disagreed would let a spec "prove" a caller is both anonymous and
 *   an admin at once. `get-paginated-public-blogs.ts:54` branches on
 *   `getAuthenticatedAdmin()` to choose between `{}` and
 *   `{ isPublished: true }`; a stub that unconditionally returned an admin
 *   would pass that spec today (it never exercises the drafts path) and
 *   silently break the first spec that does. `__setTestUser` lets a spec
 *   exercise the unauthorized path without a second stub. The default
 *   identity is the site owner (ADMIN role *and* `env.OWNER_EMAIL ??
 *   env.EMAIL`), which is what every note spec wants.
 *
 *   `isSiteOwnerEmail` is not hand-copied here — the `build.module` factory
 *   below is `async` and lazily `import()`s the *real*
 *   `@/shared/lib/auth/session` at resolution time, after this file's own
 *   `server-only` stub is already registered, and re-exports the real
 *   function directly. `getAuthenticatedAdmin` and `requireAdmin` call that
 *   same real function through `isOwner`, so this stub cannot go looser than
 *   the guard it stands in for by silently drifting out of sync with a
 *   hand-written copy — the class of bug a previous version of this file
 *   carried until a review caught it. Also exports a fixed-return `signIn`,
 *   needed once `logInToDashboard` (the sign-in form's own owner-identity
 *   gate — see `@/features/auth/lib/log-in-to-dashboard.ts`) started
 *   importing from this same barrel; a spec importing that action needs
 *   both names present or the import itself fails before any test runs.
 *
 * - `@/shared/lib/auth/auth` (the submodule, not the barrel above) is
 *   stubbed separately so `session.spec.ts` can exercise the *real*
 *   `getAuthenticatedAdmin`/`isSiteOwnerEmail` implementations (imported
 *   directly from `@/shared/lib/auth/session`, bypassing the barrel stub)
 *   against a controllable fake `auth()`. This has to live here, in the
 *   global preload, rather than as a plugin `session.spec.ts` registers
 *   itself — see that plugin's own comment below for why a locally
 *   registered version of this stub is unsafe now that the barrel stub
 *   above also reaches this same specifier.
 *
 * Loaded via `preload` in this app's `bunfig.toml`, before `./test-setup.ts`,
 * so every spec's import graph sees these already registered.
 */
import { plugin } from 'bun';

import { env } from '@/shared/config/env';

plugin({
  name: 'stub-server-only',
  setup(build) {
    build.module('server-only', () => ({ exports: {}, loader: 'object' }));
  },
});

plugin({
  name: 'stub-next-intl-server',
  setup(build) {
    build.module('next-intl/server', () => ({
      exports: {
        getLocale: async () => 'en',
        getTranslations: async () => (key: string) => key,
      },
      loader: 'object',
    }));
  },
});

plugin({
  name: 'stub-next-cache',
  setup(build) {
    build.module('next/cache', () => ({
      exports: {
        unstable_cache:
          <TArgs extends unknown[], TReturn>(
            fn: (...args: TArgs) => Promise<TReturn>
          ) =>
          (...args: TArgs) =>
            fn(...args),
        revalidateTag: () => {},
        revalidatePath: () => {},
      },
      loader: 'object',
    }));
  },
});

plugin({
  name: 'stub-auth-submodule',
  setup(build) {
    type FakeSessionUser = { role?: string; email?: string } | null;
    type FakeAuthSession = { user: FakeSessionUser } | null;

    // Registered here, in the global preload, rather than as a plugin
    // registered inside `session.spec.ts`'s own module body (where an
    // earlier version of this override lived). That local-registration
    // approach worked only as long as nothing else in the suite ever
    // reached this specifier — true before the `stub-auth` plugin below
    // started lazily `import()`ing the real `@/shared/lib/auth/session`,
    // which statically imports `auth` from here.
    //
    // The race this closes is not about `build.module` registration itself
    // — a later `plugin()` call for the same specifier is *not* a no-op; a
    // probe confirmed registrations are last-wins, and a fresh `import()`
    // of the specifier after a later registration runs the new factory.
    // What actually locks a binding in is the *importing* module's own
    // module record: once `@/shared/lib/auth/session` has been evaluated —
    // triggered by *any* spec's import graph reaching the `@/shared/lib/auth`
    // barrel, not necessarily `session.spec.ts`'s — its top-level
    // `import { auth } from '@/shared/lib/auth/auth'` has already resolved
    // and bound against whatever this specifier meant *at that moment*.
    // Bun caches the evaluated `session.ts` module itself, so it is never
    // re-evaluated on a later import; a `plugin()` call registered
    // afterward changes what a *fresh* resolution of the specifier would
    // return, but there is no fresh resolution left to have — `session.ts`
    // already has its binding. So whichever spec's import graph reaches the
    // barrel *first* decides, once and for all, what `session.ts`'s `auth`
    // is bound to for the rest of the run. A locally-registered override in
    // `session.spec.ts` could lose that race to an earlier spec, binding
    // the real, unstubbed Auth.js instance (reproduced: it broke every
    // `getAuthenticatedAdmin` test in `session.spec.ts` with "missing
    // request store" once another spec happened to load first). Registering
    // here, in the preload — which completes before any spec module,
    // including `session.ts` reached transitively, is ever evaluated —
    // guarantees this stub is what `session.ts` binds to, unconditionally.
    //
    // `session.spec.ts` controls this through `__setFakeAuthSession`, the
    // same pattern `stub-auth` below uses for `__setTestUser`. Nothing else
    // in the suite calls `auth()` through this path: the `stub-auth` plugin
    // below only reads `isSiteOwnerEmail` off the real `session.ts` module,
    // which never calls `auth()` itself, so this stub's default (`null`,
    // meaning "no session") is inert for every other spec.
    let fakeAuthSession: FakeAuthSession = null;

    build.module('@/shared/lib/auth/auth', () => ({
      exports: {
        __setFakeAuthSession: (session: FakeAuthSession) => {
          fakeAuthSession = session;
        },
        auth: async () => fakeAuthSession,
        // `handlers`/`signOut` mirror this submodule's full four-name
        // surface (`handlers`, `auth`, `signIn`, `signOut` — the destructure
        // off `NextAuth({...})` in the real `auth.ts`) even though no spec
        // exercises either today, for the same reason `signIn` below is
        // present: Bun resolves named exports statically, so any spec whose
        // import graph reaches this specifier and destructures a name this
        // stub omits fails at import time, in a spec that has nothing to do
        // with the missing name. `handlers` is a Next.js route-handler
        // object (`{ GET, POST }`) that a real HTTP request drives — a spec
        // should never call it, so it's an inert placeholder, not a working
        // fake. `signOut` is inert in the same spirit as `signIn`.
        handlers: { GET: () => {}, POST: () => {} },
        signIn: async () => 'stub-sign-in-url',
        signOut: async () => {},
      },
      loader: 'object',
    }));
  },
});

plugin({
  name: 'stub-auth',
  setup(build) {
    type TestUser = { id: string; role: string; email?: string };

    // The default identity's email comes from `env.OWNER_EMAIL ?? env.EMAIL`
    // — the same fallback `isSiteOwnerEmail` in `session.ts` uses — not a
    // literal, so this stub cannot drift from the real rule in
    // `getAuthenticatedAdmin` (owner role + owner identity). A stub that
    // matched on role alone would let every note spec pass against a guard
    // that no longer exists.
    let testUser: TestUser | null = {
      id: 'admin-1',
      role: 'ADMIN',
      email: env.OWNER_EMAIL ?? env.EMAIL,
    };

    // `build.module` accepts an async factory, and that factory runs lazily
    // at *resolution* time (when something first imports `@/shared/lib/auth`),
    // not at plugin-registration time — by then this preload's own
    // `server-only` stub above is already registered. So importing the real
    // `@/shared/lib/auth/session` here does not hit the ordering problem
    // that rules out a top-level static import of it: `session.ts`'s only
    // problematic dependency is `auth()` itself, which needs a live request
    // context — but nothing here calls `auth()`, only `isSiteOwnerEmail`,
    // which never touches it. *Constructing* the Auth.js instance
    // (`NextAuth({...})` at the top of `auth.ts`) is fine outside a request;
    // confirmed empirically (`await import('@/shared/lib/auth/session')`
    // resolves cleanly in a bare `bun test` process, and the real
    // `isSiteOwnerEmail` it exports behaves correctly there). Importing the
    // real function instead of hand-copying it means this stub cannot go
    // *looser* than the guard it stands in for by drifting out of sync with
    // it — the risk a hand-copy carries silently.
    build.module('@/shared/lib/auth', async () => {
      const { isSiteOwnerEmail } = await import('@/shared/lib/auth/session');
      // The real barrel does `export * from './auth'`, so its `auth` must be
      // the exact same function as `@/shared/lib/auth/auth`'s own `auth` —
      // not a second hand-written fake returning its own idea of a session.
      // Resolving the already-stubbed submodule specifier (registered above
      // by `stub-auth-submodule`, guaranteed already registered by the time
      // this async factory runs — see that plugin's comment) and re-using
      // its `auth` means both call sites read the one `fakeAuthSession`
      // closure variable that lives there; a spec calling
      // `__setFakeAuthSession` still controls what *either* import path
      // returns. Copying the logic here instead would create the exact
      // class of drift this file stopped doing for `isSiteOwnerEmail` above.
      const { auth } = await import('@/shared/lib/auth/auth');

      // Both are pure modules — `callback-url.ts` reaches only the locale list
      // in `@/shared/i18n/routing`, and `admin-oauth-providers.ts` is plain
      // data — so the real implementations are imported for the same reason
      // `isSiteOwnerEmail` above is: a hand-copied callback-URL sanitiser could
      // drift *looser* than the real open-redirect guard and no spec would say
      // so. `admin-oauth-providers.ts` is deliberately not inside `auth.ts`,
      // which the `stub-auth-submodule` plugin replaces wholesale, precisely so
      // this import can reach the real values.
      const { sanitizeCallbackUrl } = await import(
        '@/shared/lib/auth/callback-url'
      );
      const { ADMIN_OAUTH_PROVIDER_IDS, isAdminOAuthProviderId } = await import(
        '@/shared/lib/auth/admin-oauth-providers'
      );

      const isOwner = (
        user: TestUser | null
      ): user is TestUser & { email: string } =>
        !!user && user.role === 'ADMIN' && isSiteOwnerEmail(user.email);

      return {
        exports: {
          __setTestUser: (user: TestUser | null) => {
            testUser = user;
          },
          isSiteOwnerEmail,
          sanitizeCallbackUrl,
          ADMIN_OAUTH_PROVIDER_IDS,
          isAdminOAuthProviderId,
          auth,
          // `logInToDashboard` (features/auth/lib/log-in-to-dashboard.ts)
          // imports `signIn` from this barrel; without an export here its
          // spec's import graph fails before a single test runs (Bun's
          // object-loader modules still enforce named exports statically —
          // confirmed empirically). No spec needs a real redirect URL, only
          // that a truthy result flows back through `logInToDashboard`'s
          // success envelope, so a fixed sentinel is enough.
          signIn: async () => 'stub-sign-in-url',
          // `handlers` and `signOut` complete this stub's coverage of the
          // barrel's full runtime surface (`export * from` './auth',
          // './session', './callback-url' and './admin-oauth-providers'), not
          // just the names some spec happens to import today. The same static-export-enforcement
          // reasoning as `signIn` above applies: a spec whose import graph
          // widens to reach one of these two (real importers:
          // `src/app/api/auth/[...nextauth]/route.ts` for `handlers`,
          // `features/auth/lib/log-out*.ts` for `signOut`) would otherwise
          // fail at import time with no clue the missing name is the cause.
          // `handlers` is the Next.js route-handler object (`{ GET, POST }`)
          // a real HTTP request drives — no spec should ever call it, so
          // it's left as an inert placeholder, not a working fake. `signOut`
          // is inert in the same spirit as `signIn`.
          handlers: { GET: () => {}, POST: () => {} },
          signOut: async () => {},
          getAuthenticatedUser: async () => testUser,
          getAuthenticatedAdmin: async () => (isOwner(testUser) ? testUser : null),
          requireUser: async () => {
            if (!testUser) throw new Error('Unauthorized');
            return testUser;
          },
          requireAdmin: async () => {
            if (!isOwner(testUser)) throw new Error('Unauthorized');
            return testUser;
          },
        },
        loader: 'object',
      };
    });
  },
});

plugin({
  name: 'stub-i18n-navigation',
  setup(build) {
    // `@/shared/i18n/navigation` is `createNavigation(routing)`, whose
    // `useRouter`/`Link` delegate to `next/navigation` — and those read the
    // App Router context, which only a live Next render provides. Outside
    // one they throw "invariant expected app router to be mounted" at the
    // first render, so any component that navigates is untestable without a
    // stand-in. Same category as the three stubs at the top of this file:
    // the specs that reach this care about *which route a component asks
    // for*, never about Next's router itself.
    //
    // Registered globally, in the preload, for the ordering reason
    // `stub-auth-submodule` documents at length: whichever spec's import
    // graph reaches a navigating component first would otherwise bind that
    // component's `useRouter` for the whole run.
    //
    // Every name the real module exports is present, including the two no
    // spec uses today (`redirect`, `getPathname`) — Bun enforces named
    // exports statically even for object-loader modules, so an omitted name
    // fails at import time in a spec that has nothing to do with it.
    const pushed: string[] = [];
    let pathname = '/';

    build.module('@/shared/i18n/navigation', async () => {
      const React = await import('react');

      return {
        exports: {
          /** Routes a spec's component asked for, oldest first. */
          __navigations: pushed,
          __resetNavigation: (nextPathname = '/') => {
            pushed.length = 0;
            pathname = nextPathname;
          },
          usePathname: () => pathname,
          getPathname: ({ href }: { href: string }) => href,
          redirect: ({ href }: { href: string }) => {
            pushed.push(href);
          },
          useRouter: () => ({
            push: (href: string) => {
              pushed.push(href);
            },
            replace: (href: string) => {
              pushed.push(href);
            },
            back: () => {},
            forward: () => {},
            refresh: () => {},
            prefetch: () => {},
          }),
          // A real anchor, not a null render: specs find these rows by role
          // and click them, and `next-intl`'s own `Link` renders an `<a>`
          // too. `locale` is dropped rather than forwarded — React warns
          // about unknown DOM attributes, and no spec asserts on it.
          Link: ({
            href,
            children,
            locale: _locale,
            ...rest
          }: {
            href: string;
            children?: React.ReactNode;
            locale?: string;
          } & Record<string, unknown>) =>
            React.createElement(
              'a',
              {
                href,
                ...rest,
                onClick: (event: React.MouseEvent) => {
                  event.preventDefault();
                  pushed.push(href);
                  (rest.onClick as ((e: React.MouseEvent) => void) | undefined)?.(
                    event
                  );
                },
              },
              children
            ),
        },
        loader: 'object',
      };
    });
  },
});
