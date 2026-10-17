/**
 * Bun test preload: stand-ins for specifiers that need a live Next.js request (`server-only`
 * lives in server-only-stub.ts). Registered globally: the first importer to bind a module wins.
 * Loaded via `preload` in bunfig.toml, right after server-only-stub.ts.
 */
import { plugin } from 'bun';

import { env } from '@/shared/config/env';

plugin({
  name: 'stub-next-intl-server',
  setup(build) {
    // The real getLocale/getTranslations throw outside a Next render (request-scoped storage).
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
    // unstable_cache throws "incrementalCache missing" outside a Next server: call through.
    // revalidateTag/Path are no-ops; swap in recording spies to assert an action revalidated a tag.
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

    // Registered in the preload, not in session.spec.ts: Bun caches session.ts after first load, so
    // whichever spec reaches the barrel first binds `auth` for the run ("missing request store").
    // session.spec.ts drives it through __setFakeAuthSession; the default null session is inert.
    let fakeAuthSession: FakeAuthSession = null;

    build.module('@/shared/lib/auth/auth', () => ({
      exports: {
        __setFakeAuthSession: (session: FakeAuthSession) => {
          fakeAuthSession = session;
        },
        auth: async () => fakeAuthSession,
        // Full four-name surface of the real auth.ts: Bun checks named exports statically, so an
        // omitted name fails at import time in unrelated specs. `handlers` and `signOut` are inert.
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

    // Email is env.OWNER_EMAIL ?? env.EMAIL, the rule isSiteOwnerEmail uses, never a literal;
    // a role-only match would pass against a guard that no longer exists.
    const DEFAULT_TEST_USER: TestUser = {
      id: 'admin-1',
      role: 'ADMIN',
      email: env.OWNER_EMAIL ?? env.EMAIL,
    };

    let testUser: TestUser | null = { ...DEFAULT_TEST_USER };

    // The async factory runs at resolution, after the server-only stub is registered, so importing
    // the real session.ts is safe (nothing calls auth()). Reusing it keeps the stub from drifting
    // looser than the guard it replaces.
    build.module('@/shared/lib/auth', async () => {
      const { isSiteOwnerEmail } = await import('@/shared/lib/auth/session');
      // The real barrel re-exports ./auth, so `auth` is the stubbed submodule's: both import paths
      // then share the one fakeAuthSession closure that __setFakeAuthSession controls.
      const { auth } = await import('@/shared/lib/auth/auth');

      // Pure modules, imported real: a hand-copied sanitiser could drift looser than the
      // open-redirect guard. admin-oauth-providers.ts is not in auth.ts, which is stubbed whole.
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
          /**
           * Restore the owner. testUser is shared by all specs, so a leaked non-owner makes
           * requireAdmin() throw in unrelated specs: pair each __setTestUser with this in afterAll.
           * Restores the constant, not a caller value, so the default identity cannot drift.
           */
          __resetTestUser: () => {
            testUser = { ...DEFAULT_TEST_USER };
          },
          isSiteOwnerEmail,
          sanitizeCallbackUrl,
          ADMIN_OAUTH_PROVIDER_IDS,
          isAdminOAuthProviderId,
          auth,
          // signIn: Bun enforces named exports statically even for object-loader modules, so
          // logInToDashboard's spec fails at import without it. A fixed sentinel is enough.
          signIn: async () => 'stub-sign-in-url',
          // handlers/signOut complete the barrel's surface (static export check, like signIn).
          // handlers is the route-handler object a real request drives: inert, no spec calls it.
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
    // The real module reads the App Router context, which only a live Next render provides
    // ("invariant expected app router to be mounted"). Registered globally for the binding-order
    // reason of stub-auth-submodule; every real export is present (static export check).
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
          // A real anchor: specs find rows by role and click them. `locale` is dropped because
          // React warns on unknown DOM attributes.
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
